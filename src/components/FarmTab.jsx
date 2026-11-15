import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from './Icons';
import { ErrorState } from './States';
import { analyzeFarm, SAMPLE_PDF } from '../lib/api';
import { buildAnalysis, soilItemsFor, soilValuesFor } from '../lib/analysis';
import { N_CREDIT_SHARE, N_PRICE_MAD_PER_KG, OM_TARGET_PCT } from '../lib/assumptions';
import { readLabFile } from '../lib/lab';
import { cropPhoto } from '../lib/names';
import { useLang } from '../i18n';

const STEP_KEYS = ['stepReport', 'stepClimate', 'stepSoil', 'stepCrops', 'stepAdvice'];

function fmtDate(iso, lang) {
  try {
    return new Date(iso).toLocaleString(lang === 'ar' ? 'ar-MA' : lang, {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch {
    return '';
  }
}

function ReportCard({ place, lab, setLab }) {
  const { t } = useLang();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const urlRef = useRef(null);

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError(t.notPdf);
      return;
    }
    setError(null);
    setBusy(true);
    const data = await readLabFile(file);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setLab({ ...data, url });
    setBusy(false);
  };

  const src = lab?.kind === 'upload' && lab.url ? lab.url : SAMPLE_PDF;
  const soil = soilValuesFor(place, lab);

  return (
    <section className="panel report-panel" aria-labelledby="report-title">
      <header className="panel-head">
        <h2 id="report-title">
          <Icon name="file" size={20} /> {t.labTitle}
          <span className="tag tag-soft">{t.optional}</span>
        </h2>
        <span className={`tag ${lab ? 'tag-good' : 'tag-warn'}`}>
          {lab ? (lab.kind === 'upload' ? t.labYours : t.labSample) : t.labMissingBadge}
        </span>
      </header>
      <p className="muted">{t.labExplain}</p>

      <div className="lab-actions">
        <label className={`btn btn-secondary file-btn ${busy ? 'is-busy' : ''}`}>
          <Icon name="upload" size={18} />
          {busy ? t.readingRecords : lab ? t.labReplace : t.labUpload}
          <input type="file" accept="application/pdf,.pdf" onChange={onFile} disabled={busy} hidden />
        </label>
        {lab ? (
          <button type="button" className="btn btn-ghost" onClick={() => setLab(null)}>
            {t.continueWithout}
          </button>
        ) : (
          <button type="button" className="btn btn-ghost" onClick={() => setLab(sampleLab())}>
            {t.addReport}
          </button>
        )}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}

      <div className="report-grid">
        {lab ? (
          <div className="pdf-frame">
            <iframe src={src} title={t.labTitle} loading="lazy" />
            <span className="pdf-caption">
              <Icon name="file" size={14} />
              {lab.kind === 'upload' ? lab.fileName : t.labSample}
            </span>
          </div>
        ) : (
          <div className="report-empty">
            <Icon name="file" size={26} />
            <p className="state-title">{t.labMissingTitle}</p>
            <p>{t.labMissingText}</p>
            <button type="button" className="btn btn-secondary" onClick={() => setLab(sampleLab())}>
              <Icon name="file" size={17} /> {t.addReport}
            </button>
          </div>
        )}

        <div className="lab-values">
          <div className="lab-values-head">
            <h3>{t.labExtractLabel}</h3>
            <span className="tag">{lab ? (lab.kind === 'upload' ? t.soilSourceLab : t.labSample) : t.soilSourceRegional}</span>
          </div>
          <ul>
            {[
              ['soilPh', soil.ph, ''],
              ['soilOrganic', soil.organic, '%'],
              ['soilNitrogen', soil.nitrogen, '%'],
              ['soilPhosphorus', soil.phosphorus, 'mg/kg'],
              ['soilPotassium', soil.potassium, 'mg/kg'],
              ['soilSalinity', soil.salinity, 'dS/m'],
              ['soilCalcium', soil.calcium, '%'],
            ].map(([key, value, unit]) => (
              <li key={key}>
                <span>{t[key]}</span>
                <strong>{value}{unit && <small> {unit}</small>}</strong>
              </li>
            ))}
          </ul>
          {lab && <p className="demo-note"><Icon name="info" size={15} /> {t.labDemoNote}</p>}
        </div>
      </div>
    </section>
  );
}

function SoilPanel({ place, lab }) {
  const { t } = useLang();
  const items = soilItemsFor(t, place, lab);
  const sourceLabel = lab ? t.soilSourceLab : t.soilSourceRegional;

  return (
    <section className="panel soil-panel" aria-labelledby="soil-title">
      <header className="panel-head">
        <h2 id="soil-title"><Icon name="soil" size={20} /> {t.soilHealthTitle}</h2>
        <span className={`tag ${lab ? 'tag-good' : 'tag-warn'}`}>{sourceLabel}</span>
      </header>
      <p className="muted">{t.soilHealthSub}</p>
      {!lab && <p className="regional-note"><Icon name="info" size={15} /> {t.regionalSoilText}</p>}
      <ul className="soil-grid">
        {items.map((item) => (
          <li key={item.id} className={`soil-row soil-${item.status}`}>
            <div className="soil-row-top">
              <span className="soil-name">{item.label}</span>
              <span className={`status-pill status-${item.status}`}>{item.statusLabel}</span>
            </div>
            <p className="soil-number">
              {item.value}<span className="soil-unit">{item.unit}</span>
            </p>
            <p className="soil-target">{t.targetLabel}: {item.target}</p>
            <p className="soil-meaning">{item.meaning}</p>
          </li>
        ))}
      </ul>
      <p className="muted small soil-target-note"><Icon name="info" size={14} /> {t.soilTargetNote}</p>
    </section>
  );
}

function Progress({ step }) {
  const { t } = useLang();
  return (
    <section className="analysis-progress" role="status" aria-live="polite">
      <div className="progress-head">
        <span className="eyebrow">{t.analyzing}</span>
        <span className="mono">{step + 1} / 5</span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(((step + 1) / 5) * 100)}
      >
        <span style={{ width: `${((step + 1) / 5) * 100}%` }} />
      </div>
      <ol className="progress-steps">
        {STEP_KEYS.map((key, index) => {
          const state = index < step ? 'done' : index === step ? 'current' : 'pending';
          return (
            <li key={key} className={`step-${state}`}>
              <span className="step-dot" aria-hidden="true">
                {state === 'done' ? <Icon name="check" size={14} /> : index + 1}
              </span>
              <span>{t[key]}</span>
            </li>
          );
        })}
      </ol>
      <p className="progress-note"><Icon name="clock" size={15} /> {t.progressNote}</p>
    </section>
  );
}

function ScoreBlock({ result, t }) {
  return (
    <div className="score-block">
      <span className="eyebrow">{t.scoreTitle}</span>
      <p className="score-number">
        <strong>{result.overall.score}</strong><span>/ 100</span>
      </p>
      <div className="score-scale" aria-hidden="true">
        <span style={{ insetInlineStart: `${result.overall.score}%` }} />
      </div>
      <p className="score-note">{t.scoreNote}</p>
      <p className={`confidence conf-${result.confidence.level}`}>
        <Icon name="shield" size={16} />
        {t.confidenceLabel}: <strong>{result.confidence.label}</strong>
      </p>
    </div>
  );
}

function FourQuestions({ result, t }) {
  const items = [
    { key: 'what', label: t.qWhat, icon: 'target', tone: 'canal' },
    { key: 'why', label: t.qWhy, icon: 'sun', tone: 'wheat' },
    { key: 'how', label: t.qHow, icon: 'sprout', tone: 'field' },
    { key: 'solution', label: t.qSolution, icon: 'check', tone: 'clay' },
  ];
  return (
    <section className="fourq" aria-label={t.fourQTitle}>
      <div className="section-head">
        <h2>{t.fourQTitle}</h2>
        <p>{t.fourQSub}</p>
      </div>
      <div className="fourq-grid">
        {items.map((item) => (
          <article key={item.key} className={`fourq-card tone-${item.tone}`}>
            <p className="fourq-label">
              <Icon name={item.icon} size={18} /> {item.label}
            </p>
            <p className="fourq-text">{result.fourQ[item.key]}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function NasaDriversCard({ result, t }) {
  const rainItem = result.climate.find((c) => c.id === 'rain');
  const heatItem = result.climate.find((c) => c.id === 'heat');
  const moistItem = result.climate.find((c) => c.id === 'moisture');

  const diff = rainItem?.diffPct;
  const moist = moistItem?.value;
  const hot = heatItem?.value;
  const hasDiff = typeof diff === 'number';
  const hasMoist = typeof moist === 'number';
  const hasHot = typeof hot === 'number';

  return (
    <section className="panel nasa-drivers-panel">
      <header className="panel-head">
        <div>
          <span className="eyebrow"><Icon name="globe" size={16} /> {t.nasaDriversTitle}</span>
          <h3>{t.nasaDriversTitle}</h3>
          <p className="muted small">{t.nasaDriversSub}</p>
        </div>
      </header>
      <div className="nasa-drivers-grid">
        <article className="driver-card">
          <div className="driver-head">
            <span className="driver-icon"><Icon name="drop" size={17} /></span>
            <strong>{t.gpmDriverLabel}</strong>
            <span className={`tag ${hasDiff && diff < -10 ? 'tag-warn' : hasDiff ? 'tag-good' : 'tag-soft'}`}>
              {hasDiff ? (diff < 0 ? `${diff}%` : `+${diff}%`) : '—'}
            </span>
          </div>
          <p className="driver-value">{rainItem?.value ?? '—'} <small>{rainItem?.unit}</small></p>
          <p className="driver-desc">{hasDiff ? t.gpmDriverImpact(diff) : t.valueUnavailable}</p>
        </article>

        <article className="driver-card">
          <div className="driver-head">
            <span className="driver-icon"><Icon name="soil" size={17} /></span>
            <strong>{t.smapDriverLabel}</strong>
            <span className={`tag ${hasMoist ? (moist < 12 ? 'tag-warn' : 'tag-good') : 'tag-soft'}`}>
              {hasMoist ? (moist < 12 ? t.statusLow : t.statusNormal) : '—'}
            </span>
          </div>
          <p className="driver-value">{hasMoist ? moist : '—'}% <small>vol</small></p>
          <p className="driver-desc">{hasMoist ? t.smapDriverImpact(moist) : t.valueUnavailable}</p>
        </article>

        <article className="driver-card">
          <div className="driver-head">
            <span className="driver-icon"><Icon name="sun" size={17} /></span>
            <strong>{t.powerDriverLabel}</strong>
            <span className={`tag ${hasHot ? (hot > 35 ? 'tag-warn' : 'tag-good') : 'tag-soft'}`}>
              {hasHot ? (hot > 35 ? t.statusAlert : t.statusGood) : '—'}
            </span>
          </div>
          <p className="driver-value">{hasHot ? hot : '—'} <small>{t.daysShort}</small></p>
          <p className="driver-desc">{hasHot ? t.powerDriverImpact(hot) : t.valueUnavailable}</p>
        </article>
      </div>
    </section>
  );
}

function WaterEconomicLedger({ result, t }) {
  const water = result.water;
  const hasWater = water && typeof water.netMm === 'number';

  const organicItem = result.soil.find((s) => s.id === 'organic');
  const orgVal = organicItem?.value;
  const hasOrganic = typeof orgVal === 'number';

  const fixedN = result.rotation?.nitrogenKgHa ?? 0;
  const currentN = result.rotation?.currentNitrogenKgHa ?? 0;
  const creditKg = Math.round(result.rotation?.nitrogenCreditKg ?? 0);
  const madSaved = result.rotation?.nitrogenSavingsMad ?? 0;

  return (
    <section className="panel ledger-panel">
      <header className="panel-head">
        <div>
          <span className="eyebrow"><Icon name="sprout" size={16} /> {t.ledgerTitle}</span>
          <h3>{t.ledgerTitle}</h3>
          <p className="muted small">{t.ledgerSub}</p>
        </div>
      </header>
      <div className="ledger-grid">
        <div className="ledger-card">
          <div className="ledger-icon-badge"><Icon name="drop" size={20} /></div>
          <div>
            <span className="muted small">{t.ledgerIrrigationGap}</span>
            <p className="ledger-highlight">{hasWater ? water.netMm : '—'} <small>mm</small></p>
            <p className="ledger-subtext">
              {hasWater ? `${water.m3Ha.toLocaleString()} ${t.m3PerHa}` : t.valueUnavailable}
            </p>
            <p className="ledger-basis">
              {hasWater
                ? t.ledgerWaterBasis(
                  water.cropName,
                  water.seasonRainMm,
                  water.effectiveRainMm,
                  Math.round(water.effectiveRainShare * 100),
                  Math.round(water.irrigationEfficiency * 100),
                )
                : t.valueUnavailable}
            </p>
          </div>
        </div>

        <div className="ledger-card">
          <div className="ledger-icon-badge tone-good"><Icon name="leaf" size={20} /></div>
          <div>
            <span className="muted small">{t.ledgerFertilizerSavings}</span>
            <p className="ledger-highlight">{creditKg > 0 ? `+${creditKg}` : '0'} <small>kg N/ha</small></p>
            <p className="ledger-subtext">
              {madSaved > 0 ? t.ledgerMadPerHa(madSaved, N_PRICE_MAD_PER_KG) : t.ledgerNoNitrogenSaving}
            </p>
            <p className="ledger-basis">
              {t.ledgerNitrogenBasis(fixedN, currentN, Math.round(N_CREDIT_SHARE * 100))}
            </p>
          </div>
        </div>

        <div className="ledger-card">
          <div className="ledger-icon-badge tone-soil"><Icon name="soil" size={20} /></div>
          <div>
            <span className="muted small">{t.ledgerSoilCarbonRoadmap}</span>
            <p className="ledger-highlight">{hasOrganic ? orgVal : '—'}% <small>OM</small></p>
            <p className="ledger-subtext">
              {hasOrganic ? t.ledgerCurrentVsTarget(orgVal, OM_TARGET_PCT) : t.valueUnavailable}
            </p>
            <p className="ledger-basis">{t.ledgerOmBasis(OM_TARGET_PCT)}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultCrops({ result, t, hrefFor }) {
  return (
    <section className="panel reco-panel" aria-labelledby="reco-title">
      <header className="panel-head">
        <h2 id="reco-title">{t.recCrops}</h2>
        <a className="text-link" href={hrefFor('crops')}>
          {t.navCrops} <Icon name="arrowRight" size={15} />
        </a>
      </header>
      <ul className="reco-list">
        {result.crops.map((crop) => (
          <li key={crop.crop} className="reco-item">
            <img src={cropPhoto(crop.crop)} alt="" width="64" height="64" loading="lazy" />
            <div className="reco-body">
              <div className="reco-top">
                <strong>{crop.name}</strong>
                <span className={`fit-pill fit-${crop.fit}`}>{crop.fitLabel}</span>
              </div>
              <div className="meter" aria-hidden="true">
                <span style={{ width: `${crop.index}%` }} />
              </div>
              <p className="reco-index">{t.suitabilityOf(crop.index)}</p>
              <p className="reco-reason">{crop.reason}</p>
            </div>
          </li>
        ))}
      </ul>
      {result.avoid.length > 0 && (
        <div className="avoid-block">
          <h3><Icon name="alert" size={17} /> {t.avoidCrops}</h3>
          <ul>
            {result.avoid.map((crop) => (
              <li key={crop.crop}>
                <strong>{crop.name}</strong> — {crop.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ActionList({ actions, t }) {
  return (
    <section className="panel action-panel" aria-labelledby="action-title">
      <header className="panel-head">
        <h2 id="action-title"><Icon name="check" size={20} /> {t.qSolution}</h2>
        <span className="tag tag-soft">{actions.length}</span>
      </header>
      <ol className="action-list">
        {actions.map((action, index) => (
          <li key={action.id} className={index === 0 ? 'is-first' : ''}>
            <span className="action-num" aria-hidden="true">{index + 1}</span>
            <div>
              {index === 0 && <p className="action-flag">{t.actionNow}</p>}
              <h3>{action.title}</h3>
              <p>{action.detail}</p>
              <p className="action-when"><Icon name="calendar" size={15} /> {t.actionWhen}: {action.when}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function FarmTab({ place, data, retries, hrefFor, lab, setLab }) {
  const { t, lang } = useLang();
  const [phase, setPhase] = useState('idle');
  const [step, setStep] = useState(0);
  const [showJson, setShowJson] = useState(false);
  const resultsRef = useRef(null);

  const climateMonths = data.climate.status === 'ok' ? data.climate.data.months : null;
  const rainMonths = data.rain.status === 'ok' ? data.rain.data.months : null;
  const soilMonths = data.soil.status === 'ok' ? data.soil.data.months : null;
  const cropRows = data.crops.status === 'ok' ? data.crops.data.crops : null;
  const ready = Boolean(climateMonths && rainMonths && soilMonths && cropRows);

  const result = useMemo(() => (
    ready && phase === 'done'
      ? buildAnalysis({ t, lang, place, climate: climateMonths, rain: rainMonths, soil: soilMonths, crops: cropRows, lab })
      : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [ready, phase, t, lang, place, climateMonths, rainMonths, soilMonths, cropRows, lab]);

  useEffect(() => {
    setPhase('idle');
    setStep(0);
  }, [place.id]);

  useEffect(() => {
    if (phase !== 'done' || !resultsRef.current) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    resultsRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    const heading = resultsRef.current.querySelector('h2');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [phase]);

  const run = async () => {
    setPhase('running');
    setStep(0);
    setShowJson(false);
    await analyzeFarm((index) => setStep(index));
    setPhase('done');
  };

  const rainError = data.rain.status === 'error';

  return (
    <div className="farm-page">
      <section className="analysis-cta">
        <div className="cta-copy">
          <span className="eyebrow"><Icon name="sparkle" size={16} /> {t.analysisTitle}</span>
          <h2>{t.analysisTitle}</h2>
          <p className="cta-lead">{t.analysisSubtitle}</p>
          <ul className="cta-points">
            <li><Icon name="file" size={16} /> {t.labExplain}</li>
            <li><Icon name="drop" size={16} /> {t.layerRainSub}</li>
            <li><Icon name="soil" size={16} /> {t.layerSoilSub}</li>
            <li><Icon name="leaf" size={16} /> {t.cropsTitle}</li>
          </ul>
        </div>
        <div className="cta-action">
          {phase === 'running' ? (
            <Progress step={step} />
          ) : (
            <>
              <button
                type="button"
                className="btn btn-primary btn-large"
                onClick={run}
                disabled={!ready}
              >
                <Icon name="sparkle" size={19} />
                {phase === 'done' ? t.analyzeAgain : t.analyze}
              </button>
              {!ready && !rainError && (
                <p className="muted small">{t.readingRecords}</p>
              )}
              <p className="cta-note"><Icon name="clock" size={15} /> {t.progressNote}</p>
            </>
          )}
          {rainError && (
            <ErrorState message={data.rain.error} onRetry={retries.rain} />
          )}
        </div>
      </section>

      <ReportCard place={place} lab={lab} setLab={setLab} />
      <SoilPanel place={place} lab={lab} />

      {result && (
        <div className="analysis-results" ref={resultsRef}>
          <div className="results-head">
            <ScoreBlock result={result} t={t} />
            <div className="headline-block">
              <div className="headline-meta">
                <span className="tag tag-good">{t.analysisReady}</span>
                <span className="tag">{t.yearShown(result.year)}</span>
                <span className="tag">{fmtDate(result.generatedAt, lang)}</span>
              </div>
              <h2>{result.overall.headline}</h2>
              <p>{result.overall.summary}</p>
              <p className="result-note"><Icon name="info" size={15} /> {t.methodNote}</p>
            </div>
          </div>

          <NasaDriversCard result={result} t={t} />
          <WaterEconomicLedger result={result} t={t} />

          <FourQuestions result={result} t={t} />

          <div className="result-grid">
            <ResultCrops result={result} t={t} hrefFor={hrefFor} />
            <ActionList actions={result.actions} t={t} />
          </div>

          <section className="panel rotation-suggest">
            <div>
              <span className="eyebrow">{t.rotSuggestion}</span>
              <h3>{result.rotation.name}</h3>
              <p>{result.rotation.summary}</p>
            </div>
            <a className="btn btn-secondary" href={hrefFor('rotations')}>
              {t.rotSee} <Icon name="arrowRight" size={17} />
            </a>
          </section>

          <section className="panel sources-panel" aria-labelledby="sources-title">
            <header className="panel-head">
              <h2 id="sources-title">{t.dataUsedTitle}</h2>
              <span className="tag tag-warn">{t.simulatedData}</span>
            </header>
            <p className="muted">{t.dataUsedSub}</p>
            <ul className="input-list">
              {result.inputs.map((input) => (
                <li key={input.id}>
                  <Icon name={input.kind === 'lab' ? 'file' : input.kind === 'model' ? 'leaf' : 'drop'} size={18} />
                  <div>
                    <strong>{input.source}</strong>
                    <span>{input.covers}</span>
                  </div>
                  <span className="tag tag-soft">{t.simulated}</span>
                </li>
              ))}
            </ul>
            <div className="confidence-notes">
              <p className="eyebrow">{t.confidenceLabel}: {result.confidence.label}</p>
              <ul>{result.confidence.notes.map((note) => <li key={note}>{note}</li>)}</ul>
            </div>
            <button
              type="button"
              className="json-toggle"
              aria-expanded={showJson}
              onClick={() => setShowJson((value) => !value)}
            >
              <Icon name={showJson ? 'chevronDown' : 'chevronRight'} size={16} />
              {showJson ? t.hideJson : t.showJson}
            </button>
            {showJson && (
              <pre className="json-view" tabIndex={0}>{JSON.stringify(result, null, 2)}</pre>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
