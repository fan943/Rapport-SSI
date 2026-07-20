import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Plus, Trash2, Copy, Check, FileText, RotateCcw, Save } from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'rapport-ssi-semaine-v2';

// Les 5 états du SSI définis par la NF S 61-933.
const SSI_STATES = [
  'État de veille',
  'État de sécurité',
  'État d’anomalie',
  'État de dérangement',
  'État d’alarme feu',
];

const DAYS = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

const emptyTest = () => ({
  id: crypto.randomUUID(),
  type: 'ZC',
  reference: '',
  designation: '',
  position: 'PS',
  result: 'Conforme',
  observation: '',
});

const emptyDay = () => ({
  site: '',
  arrivalTime: '',
  departureTime: '',
  arrivalState: SSI_STATES[0],
  departureState: SSI_STATES[0],
  workSummary: '',
  tests: [],
  anomalies: '',
  generatedText: '',
});

const defaultData = DAYS.reduce((acc, day) => {
  acc[day] = emptyDay();
  return acc;
}, {});

function buildGeneratedText(dayName, day) {
  const lines = [];
  const siteText = day.site ? ` sur le site ${day.site}` : '';
  const timeText = day.arrivalTime ? ` à ${day.arrivalTime}` : '';

  lines.push(`${dayName}${siteText} : à mon arrivée${timeText}, le SSI était en ${day.arrivalState.toLowerCase()}.`);

  if (day.workSummary.trim()) {
    lines.push(`Travaux et opérations réalisés : ${day.workSummary.trim()}`);
  }

  if (day.tests.length) {
    lines.push('Essais réalisés :');
    day.tests.forEach((test) => {
      const name = [test.type, test.reference, test.designation].filter(Boolean).join(' – ');
      let sentence = `${name || test.type} constaté(e) en ${test.position}. Résultat : ${test.result.toLowerCase()}.`;
      if (test.observation.trim()) sentence += ` Observation : ${test.observation.trim()}`;
      lines.push(`• ${sentence}`);
    });
  }

  if (day.anomalies.trim()) {
    lines.push(`Anomalies ou remarques : ${day.anomalies.trim()}`);
  }

  const departureTimeText = day.departureTime ? ` à ${day.departureTime}` : '';
  lines.push(`À mon départ${departureTimeText}, le SSI était en ${day.departureState.toLowerCase()}.`);

  return lines.join('\n\n');
}

function App() {
  const [activeDay, setActiveDay] = useState(DAYS[0]);
  const [saved, setSaved] = useState(true);
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultData, ...JSON.parse(stored) } : defaultData;
    } catch {
      return defaultData;
    }
  });

  useEffect(() => {
    setSaved(false);
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaved(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [data]);

  const day = data[activeDay];

  const updateDay = (patch) => {
    setData((current) => ({
      ...current,
      [activeDay]: { ...current[activeDay], ...patch },
    }));
  };

  const updateTest = (id, patch) => {
    updateDay({
      tests: day.tests.map((test) => (test.id === id ? { ...test, ...patch } : test)),
    });
  };

  const generatedPreview = useMemo(() => {
    return day.generatedText || buildGeneratedText(activeDay, day);
  }, [activeDay, day]);

  const generateText = () => {
    updateDay({ generatedText: buildGeneratedText(activeDay, day) });
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(generatedPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const clearDay = () => {
    if (window.confirm(`Effacer toutes les données du ${activeDay.toLowerCase()} ?`)) {
      setData((current) => ({ ...current, [activeDay]: emptyDay() }));
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Suivi hebdomadaire</p>
          <h1>Rapport SSI</h1>
          <p className="subtitle">Mardi à vendredi — saisie et sauvegarde automatiques</p>
        </div>
        <div className={`save-state ${saved ? 'saved' : ''}`}>
          {saved ? <Check size={17} /> : <Save size={17} />}
          {saved ? 'Enregistré automatiquement' : 'Enregistrement…'}
        </div>
      </header>

      <nav className="day-tabs">
        {DAYS.map((dayName) => (
          <button
            key={dayName}
            className={dayName === activeDay ? 'active' : ''}
            onClick={() => setActiveDay(dayName)}
          >
            {dayName}
          </button>
        ))}
      </nav>

      <main className="layout">
        <section className="form-column">
          <div className="card">
            <div className="card-heading">
              <div>
                <span className="step">1</span>
                <h2>Informations générales</h2>
              </div>
            </div>
            <div className="grid two-cols">
              <label>
                Site / bâtiment
                <input value={day.site} onChange={(e) => updateDay({ site: e.target.value })} placeholder="Ex. Bâtiment A" />
              </label>
              <div className="grid two-cols compact">
                <label>
                  Heure d’arrivée
                  <input type="time" value={day.arrivalTime} onChange={(e) => updateDay({ arrivalTime: e.target.value })} />
                </label>
                <label>
                  Heure de départ
                  <input type="time" value={day.departureTime} onChange={(e) => updateDay({ departureTime: e.target.value })} />
                </label>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-heading">
              <div><span className="step">2</span><h2>État du SSI</h2></div>
            </div>
            <div className="grid two-cols">
              <label>
                État à l’arrivée
                <select value={day.arrivalState} onChange={(e) => updateDay({ arrivalState: e.target.value })}>
                  {SSI_STATES.map((state) => <option key={state}>{state}</option>)}
                </select>
              </label>
              <label>
                État au départ
                <select value={day.departureState} onChange={(e) => updateDay({ departureState: e.target.value })}>
                  {SSI_STATES.map((state) => <option key={state}>{state}</option>)}
                </select>
              </label>
            </div>
          </div>

          <div className="card">
            <div className="card-heading">
              <div><span className="step">3</span><h2>Ce qui a été réalisé</h2></div>
            </div>
            <label>
              Résumé libre de la journée
              <textarea
                rows="5"
                value={day.workSummary}
                onChange={(e) => updateDay({ workSummary: e.target.value })}
                placeholder="Ex. Essais de désenfumage, contrôle des volets, réarmement des DAS…"
              />
            </label>
          </div>

          <div className="card">
            <div className="card-heading split">
              <div><span className="step">4</span><h2>Essais ZA / ZC / ZF</h2></div>
              <button className="button secondary" onClick={() => updateDay({ tests: [...day.tests, emptyTest()] })}>
                <Plus size={17} /> Ajouter un essai
              </button>
            </div>

            {day.tests.length === 0 ? (
              <div className="empty-state">Aucun essai ajouté pour le moment.</div>
            ) : (
              <div className="tests-list">
                {day.tests.map((test, index) => (
                  <div className="test-card" key={test.id}>
                    <div className="test-title">
                      <strong>Essai {index + 1}</strong>
                      <button className="icon-button danger" onClick={() => updateDay({ tests: day.tests.filter((item) => item.id !== test.id) })} aria-label="Supprimer">
                        <Trash2 size={17} />
                      </button>
                    </div>
                    <div className="grid test-grid">
                      <label>
                        Type
                        <select value={test.type} onChange={(e) => updateTest(test.id, { type: e.target.value })}>
                          <option>ZA</option><option>ZC</option><option>ZF</option>
                        </select>
                      </label>
                      <label>
                        Numéro / référence
                        <input value={test.reference} onChange={(e) => updateTest(test.id, { reference: e.target.value })} placeholder="Ex. 12" />
                      </label>
                      <label className="wide">
                        Désignation
                        <input value={test.designation} onChange={(e) => updateTest(test.id, { designation: e.target.value })} placeholder="Ex. Désenfumage R+2" />
                      </label>
                      <label>
                        Position
                        <select value={test.position} onChange={(e) => updateTest(test.id, { position: e.target.value })}>
                          <option>PS</option><option>DPS</option>
                        </select>
                      </label>
                      <label>
                        Résultat
                        <select value={test.result} onChange={(e) => updateTest(test.id, { result: e.target.value })}>
                          <option>Conforme</option><option>Non conforme</option><option>Non vérifié</option>
                        </select>
                      </label>
                      <label className="wide full">
                        Observation
                        <textarea rows="3" value={test.observation} onChange={(e) => updateTest(test.id, { observation: e.target.value })} placeholder="Ex. Le moteur 2 ne revient pas en PS après réarmement." />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-heading">
              <div><span className="step">5</span><h2>Anomalies et remarques</h2></div>
            </div>
            <textarea rows="4" value={day.anomalies} onChange={(e) => updateDay({ anomalies: e.target.value })} placeholder="Défauts constatés, éléments à remplacer, remarques client…" />
          </div>
        </section>

        <aside className="preview-column">
          <div className="card sticky preview-card">
            <div className="card-heading">
              <div><FileText size={20} /><h2>Compte rendu généré</h2></div>
            </div>
            <p className="hint">Le texte est créé à partir des informations renseignées. Tu peux ensuite le modifier librement.</p>
            <textarea
              className="generated-text"
              value={generatedPreview}
              onChange={(e) => updateDay({ generatedText: e.target.value })}
            />
            <div className="actions">
              <button className="button primary" onClick={generateText}><RotateCcw size={17} /> Générer / actualiser</button>
              <button className="button secondary" onClick={copyText}>{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? 'Copié' : 'Copier'}</button>
            </div>
            <button className="clear-button" onClick={clearDay}><Trash2 size={16} /> Effacer la journée</button>
          </div>
        </aside>
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
