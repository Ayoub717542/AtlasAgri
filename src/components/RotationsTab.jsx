import { useState } from 'react';
import { compareRotations, cropInfo } from '../lib/api';
import { Loading, EmptyState } from './States';
import { fmt } from '../lib/format';
import Icon from './Icons';
import { cropPhoto } from '../lib/names';
import { useLang } from '../i18n';
import ScientificGlossary from './ScientificGlossary';
import { N_CREDIT_SHARE, N_PRICE_MAD_PER_KG, nitrogenSavingsMad } from '../lib/assumptions';

// The farming year runs September to August.
const pos = (month) => (month - 9 + 12) % 12;
const FAMILY_COLOR = { cereal: '#C08A1E', legume: '#2F6B3B', root: '#7A5C3E', tree: '#1E2B22' };

const cropLabel = (crop, lang) => {
  if (lang === 'ar') return crop.nameAr;
  if (lang === 'fr') return crop.nameFr ?? crop.name;
  return crop.name;
};

const PRIORITIES = [
  { id: 'all', icon: 'sparkle', labelKey: 'priorityAll', explainKey: 'priorityExplainAll' },
  { id: 'water', icon: 'drop', labelKey: 'priorityWater', explainKey: 'priorityExplainWater' },
  { id: 'soil', icon: 'leaf', labelKey: 'prioritySoil', explainKey: 'priorityExplainSoil' },
  { id: 'forage', icon: 'sprout', labelKey: 'priorityForage', explainKey: 'priorityExplainForage' },
  { id: 'market', icon: 'store', labelKey: 'priorityMarket', explainKey: 'priorityExplainMarket' },
];

function evaluateRecommendation(scenarios, priority, defaultRecId) {
  if (!scenarios || !scenarios.length) return defaultRecId;
  if (priority === 'water') {
    return [...scenarios].sort((a, b) => a.waterMm - b.waterMm)[0]?.id ?? defaultRecId;
  }
  if (priority === 'soil') {
    return [...scenarios].sort((a, b) => (b.nitrogenKgHa + b.soilScore * 20) - (a.nitrogenKgHa + a.soilScore * 20))[0]?.id ?? defaultRecId;
  }
  if (priority === 'forage') {
    const forageScenario = scenarios.find((s) => s.years.flat().some((p) => p.crop === 'alfalfa' || p.crop === 'barley'));
    return forageScenario?.id ?? defaultRecId;
  }
  if (priority === 'market') {
    return scenarios.find((s) => s.id === 'current')?.id ?? defaultRecId;
  }
  return defaultRecId;
}

function Timeline({ years, compact = false }) {
  const { t, lang } = useLang();
  return (
    <div className={`timeline ${compact ? 'timeline-compact' : ''}`} dir="ltr">
      <div className="timeline-months" aria-hidden="true">
        {t.yearMonths.map((m, i) => <span key={`${m}-${i}`}>{i % 2 === 0 ? m : ''}</span>)}
      </div>
      {years.map((year, y) => {
        // Find bare months in this year
        const covered = new Set();
        for (const period of year) {
          const start = pos(period.start);
          const end = pos(period.end);
          if (start <= end) {
            for (let m = start; m <= end; m++) covered.add(m);
          } else {
            for (let m = start; m < 12; m++) covered.add(m);
            for (let m = 0; m <= end; m++) covered.add(m);
          }
        }
        const hasBareSummer = !covered.has(10) && !covered.has(11); // July & August

        return (
          <div className="timeline-row" key={y}>
            <span className="timeline-year">{t.yearsLabel(y + 1)}</span>
            <div className="timeline-track">
              {/* Bare soil warning overlay for summer fallow */}
              {hasBareSummer && (
                <span
                  className="timeline-bare-zone"
                  style={{ left: `${(10 / 12) * 100}%`, width: `${(2 / 12) * 100}%` }}
                  role="img"
                  aria-label={`${t.bareSoilDanger}: ${t.bareSoilDesc}`}
                  title={`${t.bareSoilDanger}: ${t.bareSoilDesc}`}
                />
              )}
              {year.map((period) => {
                const crop = cropInfo(period.crop);
                const start = pos(period.start);
                const end = pos(period.end);
                const width = start <= end ? ((end - start + 1) / 12) * 100 : (((12 - start) + end + 1) / 12) * 100;
                return (
                  <span
                    key={`${period.crop}-${period.start}`}
                    className="timeline-crop"
                    style={{
                      left: `${(start / 12) * 100}%`,
                      width: `${width}%`,
                      background: FAMILY_COLOR[crop.family] ?? '#1E2B22',
                    }}
                    role="img"
                    aria-label={`${cropLabel(crop, lang)}: ${t.sownWord} ${t.yearMonths[start]}, ${t.harvestedWord} ${t.yearMonths[end]}`}
                    title={`${cropLabel(crop, lang)}: ${t.sownWord} ${t.yearMonths[start]}, ${t.harvestedWord} ${t.yearMonths[end]}`}
                    dir="auto"
                  >
                    {cropLabel(crop, lang)}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CropFaces({ years }) {
  const { t, lang } = useLang();
  const ids = [...new Set(years.flat().map((p) => p.crop))];
  return (
    <span className="faces" aria-hidden="true">
      {ids.map((id) => {
        const crop = cropInfo(id);
        const name = lang === 'ar' ? crop?.nameAr : lang === 'fr' ? crop?.nameFr ?? crop?.name : crop?.name;
        return <img key={id} src={cropPhoto(id)} alt={name ?? ''} width="34" height="34" loading="lazy" />;
      })}
    </span>
  );
}


function Dots({ value }) {
  const { t } = useLang();
  return (
    <span className="dots" role="img" aria-label={t.outOf5(value)}>
      {[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= value ? 'on' : ''} />)}
    </span>
  );
}

const bareSummer = (years) => years.some((year) => {
  const covered = new Set();
  for (const period of year) {
    const start = pos(period.start);
    const end = pos(period.end);
    if (start <= end) {
      for (let m = start; m <= end; m++) covered.add(m);
    } else {
      for (let m = start; m < 12; m++) covered.add(m);
      for (let m = 0; m <= end; m++) covered.add(m);
    }
  }
  return !covered.has(10) && !covered.has(11);
});

function ScenarioCard({ scenario, maxWater, maxN, isRec, t, pick }) {
  const erosionKey = `erosion${scenario.erosionRisk}`;
  return (
    <article className={`rot-card ${isRec ? 'is-rec' : ''}`}>
      <header className="rot-card-head">
        <div className="rot-card-title">
          <CropFaces years={scenario.years} />
          <h3>{pick(scenario, 'name')}</h3>
        </div>
        {isRec && <span className="tag tag-good">{t.recTag}</span>}
      </header>

      <div className="rot-metric">
        <div className="rot-metric-head">
          <span><Icon name="drop" size={16} /> {t.metricWater}</span>
          <strong>{fmt(scenario.waterMm)} <small>{t.chartUnitRain}</small></strong>
        </div>
        <div className="meter meter-water" aria-hidden="true">
          <span style={{ width: `${(scenario.waterMm / maxWater) * 100}%` }} />
        </div>
      </div>

      <div className="rot-metric">
        <div className="rot-metric-head">
          <span><Icon name="leaf" size={16} /> {t.metricNitrogen}</span>
          <strong>{scenario.nitrogenKgHa === 0 ? t.none : `${fmt(scenario.nitrogenKgHa)} kg ${t.perYear}`}</strong>
        </div>
        <div className="meter meter-n" aria-hidden="true">
          <span style={{ width: `${(scenario.nitrogenKgHa / maxN) * 100}%` }} />
        </div>
      </div>

      <div className="rot-inline-metrics">
        <div>
          <span>{t.metricSoil}</span>
          <Dots value={scenario.soilScore} />
        </div>
        <div>
          <span>{t.metricErosion}</span>
          <span className={`risk risk-${scenario.erosionRisk.toLowerCase()}`}>{t[erosionKey]}</span>
        </div>
      </div>

      <div className="rot-timeline">
        <div className="rot-timeline-head">
          <p className="rot-subhead">{t.metricSeason}</p>
          {bareSummer(scenario.years) && (
            <span className="tag tag-warn small" title={t.bareSoilDesc}>
              <Icon name="alert" size={13} /> {t.bareSoilDanger}
            </span>
          )}
        </div>
        <Timeline years={scenario.years} />
      </div>

      <div className="rot-lists">
        <div>
          <h4><Icon name="check" size={15} /> {t.metricBenefits}</h4>
          <ul className="plain-list good">
            {pick(scenario, 'benefits').map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
        </div>
        <div>
          <h4><Icon name="alert" size={15} /> {t.metricRisks}</h4>
          <ul className="plain-list watch">
            {pick(scenario, 'risks').map((risk) => <li key={risk}>{risk}</li>)}
          </ul>
        </div>
      </div>

      <div className="rot-summary">
        <p className="rot-subhead">{t.metricSummary}</p>
        <p>{pick(scenario, 'summary')}</p>
      </div>
    </article>
  );
}

function RotationComparisonMatrix({ scenarios, recId, t, pick }) {
  if (!scenarios || !scenarios.length) return null;
  const currentNitrogen = scenarios.find((s) => s.id === 'current')?.nitrogenKgHa ?? 0;
  return (
    <section className="panel matrix-panel">
      <header className="panel-head">
        <div>
          <h3><Icon name="layers" size={18} /> {t.matrixTitle}</h3>
          <p className="muted small">{t.matrixSub}</p>
        </div>
      </header>
      <div className="matrix-table-wrap">
        <table className="matrix-table" aria-label={t.matrixTitle}>
          <thead>
            <tr>
              <th>{t.colRotation}</th>
              <th>{t.colWater}</th>
              <th>{t.colNitrogen}</th>
              <th>{t.colSoil}</th>
              <th>{t.colErosion}</th>
              <th>{t.colEconomics}</th>
            </tr>
          </thead>
          <tbody>
            {scenarios.map((s) => {
              const isRec = s.id === recId;
              const madSaved = nitrogenSavingsMad(s.nitrogenKgHa, currentNitrogen);
              return (
                <tr key={s.id} className={isRec ? 'is-recommended-row' : ''}>
                  <td className="matrix-name-cell">
                    <strong>{pick(s, 'name')}</strong>
                    {isRec && <span className="tag tag-good small">{t.recTag}</span>}
                  </td>
                  <td><strong>{s.waterMm}</strong> mm {t.perYear}</td>
                  <td>{s.nitrogenKgHa} {t.nitrogenUnit}</td>
                  <td>{s.soilScore} / 5</td>
                  <td>
                    <span className={`risk risk-${s.erosionRisk.toLowerCase()}`}>
                      {t[`erosion${s.erosionRisk}`]}
                    </span>
                  </td>
                  <td>
                    <strong className={madSaved > 0 ? 'text-good' : ''}>
                      {madSaved > 0 ? `+${madSaved} MAD` : '0 MAD'}
                    </strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        {t.matrixNote(Math.round(N_CREDIT_SHARE * 100), N_PRICE_MAD_PER_KG)}
      </p>
    </section>
  );
}

export default function RotationsTab({ place }) {
  const { t, pick } = useLang();
  const [state, setState] = useState({ status: 'idle' });
  const [priority, setPriority] = useState('all');

  const run = () => {
    setState({ status: 'loading' });
    compareRotations(place.profile).then(
      (data) => setState({ status: 'ok', data }),
      () => setState({ status: 'error' }),
    );
  };

  if (state.status === 'idle') {
    return (
      <div className="rot-page">
        <section className="panel rot-intro">
          <span className="eyebrow"><Icon name="rotate" size={16} /> {t.navRotations}</span>
          <h2>{t.rotEmptyTitle}</h2>
          <p>{t.rotEmptyText}</p>
          <button type="button" className="btn btn-primary btn-large" onClick={run}>
            <Icon name="rotate" size={18} /> {t.rotCompare}
          </button>
          <p className="cta-note"><Icon name="clock" size={15} /> {t.rotComparing} · 1–2 s</p>
        </section>
        <ScientificGlossary />
      </div>
    );
  }

  if (state.status === 'loading') {
    return <div className="page-panel"><Loading label={t.rotComparing} height={420} /></div>;
  }

  if (state.status === 'error') {
    return (
      <EmptyState title={t.errTitle} action={<button className="btn btn-secondary" onClick={run}>{t.retry}</button>}>
        {t.errOther}
      </EmptyState>
    );
  }

  const data = state.data;
  const scenarios = data.scenarios ?? [];
  const maxWater = Math.max(...scenarios.map((s) => s.waterMm), 1);
  const maxN = Math.max(...scenarios.map((s) => s.nitrogenKgHa), 1);

  // Dynamic recommendation depending on farmer's selected priority constraint
  const activeRecId = evaluateRecommendation(scenarios, priority, data.recommendation);
  const activeRecScenario = scenarios.find((s) => s.id === activeRecId) ?? scenarios[0];
  const activePriorityObj = PRIORITIES.find((p) => p.id === priority) ?? PRIORITIES[0];

  return (
    <div className="rot-page">
      {/* Farmer Priority Filter */}
      <section className="panel priority-panel">
        <div className="priority-head">
          <span className="eyebrow"><Icon name="target" size={16} /> {t.priorityLabel}</span>
          <p className="priority-sub">{t[activePriorityObj.explainKey]}</p>
        </div>
        <div className="priority-bar" role="group" aria-label={t.priorityLabel}>
          {PRIORITIES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={priority === p.id}
              className={`priority-chip ${priority === p.id ? 'is-active' : ''}`}
              onClick={() => setPriority(p.id)}
            >
              <Icon name={p.icon} size={16} />
              <span>{t[p.labelKey]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Dynamic Recommendation Banner */}
      <section className="panel verdict-card">
        <div className="verdict-icon"><Icon name="sparkle" size={22} /></div>
        <div>
          <p className="eyebrow">{t.rotSuggestion} · {t[activePriorityObj.labelKey]}</p>
          <h2>{pick(activeRecScenario, 'name')}</h2>
          <p>{priority === 'all' ? pick(data, 'recommendationText') : t[activePriorityObj.explainKey]}</p>
        </div>
      </section>

      {/* Side-by-Side Comparison Matrix */}
      <RotationComparisonMatrix scenarios={scenarios} recId={activeRecId} t={t} pick={pick} />

      {/* Scenarios Grid */}
      <div className="rot-grid">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            maxWater={maxWater}
            maxN={maxN}
            isRec={scenario.id === activeRecId}
            t={t}
            pick={pick}
          />
        ))}
      </div>

      <p className="rot-legend"><Icon name="info" size={15} /> {t.rotLegend}</p>
      
      {/* Scientific Glossary */}
      <ScientificGlossary />

      <div className="rot-footer">
        <p className="source">{pick(data, 'note')} <span className="sim-tag">{t.simulated}</span></p>
        <button type="button" className="btn btn-secondary" onClick={run}>
          <Icon name="rotate" size={17} /> {t.rotAgain}
        </button>
      </div>
    </div>
  );
}
