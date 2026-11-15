import { useMemo, useState } from 'react';
import { Loading, EmptyState, Source } from './States';
import Icon from './Icons';
import { cropPhoto } from '../lib/names';
import { useLang } from '../i18n';

const FILTERS = [
  { id: 'all', label: 'filterAll' },
  { id: 'cereal', label: 'filterCereal' },
  { id: 'legume', label: 'filterLegume' },
  { id: 'root', label: 'filterRoot' },
  { id: 'tree', label: 'filterTree' },
];

const FAMILY_KEY = {
  cereal: 'filterCereal',
  legume: 'filterLegume',
  root: 'filterRoot',
  tree: 'filterTree',
};

const fitOf = (index) => (index >= 80 ? 'best' : index >= 65 ? 'good' : index >= 45 ? 'marginal' : 'none');
const fitLabel = (fit, t) => ({
  best: t.bestMatch,
  good: t.goodMatch,
  marginal: t.marginalMatch,
  none: t.notSuitable,
}[fit]);

function CropCard({ crop, regime, rank, rainTotal, open, onToggle }) {
  const { t, lang, pick } = useLang();
  const row = crop[regime];
  const fit = fitOf(row.index);
  const name = lang === 'ar' ? crop.nameAr : lang === 'fr' ? crop.nameFr ?? crop.name : crop.name;
  const season = lang === 'ar' ? crop.seasonAr : lang === 'fr' ? crop.seasonFr ?? crop.season : crop.season;
  const detail = crop.detail;
  const reason = rainTotal == null
    ? null
    : regime === 'rainfed'
      ? t.cropReasonRainfed(name, row.index, crop.waterMm, Math.round(rainTotal))
      : t.cropReason(name, row.index, crop.waterMm, Math.round(rainTotal));

  return (
    <article className={`crop-card ${rank === 0 && fit !== 'none' ? 'is-top' : ''} fit-${fit}`}>
      <div className="crop-media">
        <img src={cropPhoto(crop.id)} alt="" loading="lazy" width="360" height="220" />
        <span className={`fit-pill fit-${fit}`}>{fitLabel(fit, t)}</span>
        <span className="crop-index" aria-label={t.suitabilityOf(row.index)}>
          <strong>{row.index}</strong><span>/100</span>
        </span>
      </div>
      <div className="crop-body">
        <header className="crop-head">
          <h3>{name}</h3>
          <span className="mini-chip">{t[FAMILY_KEY[crop.family] ?? 'filterAll']}</span>
        </header>
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${row.index}%` }} />
        </div>
        <ul className="crop-facts">
          <li><Icon name="drop" size={16} /> <span>{t.waterNeedLabel}</span> <strong>{t.mmWater(crop.waterMm)}</strong></li>
          <li><Icon name="calendar" size={16} /> <span>{t.seasonLabel}</span> <strong>{season}</strong></li>
          <li>
            <Icon name="leaf" size={16} />
            <span>{t.nitrogenLabel}</span>
            <strong>
              {detail?.nitrogenFixer
                ? `${t.nitrogenFixer}${detail.nitrogenKgHa ? ` · ${t.kgPerHa(detail.nitrogenKgHa)}` : ''}`
                : t.nitrogenNone}
            </strong>
          </li>
        </ul>

        {open && (
          <div className="crop-detail">
            {detail?.benefit && (
              <div>
                <h4><Icon name="soil" size={15} /> {t.soilBenefit}</h4>
                <p>{pick(detail.benefit)}</p>
              </div>
            )}
            {detail?.risks && (
              <div>
                <h4><Icon name="alert" size={15} /> {t.riskLabel}</h4>
                <ul className="risk-list">
                  {pick(detail.risks).map((risk) => <li key={risk}>{risk}</li>)}
                </ul>
              </div>
            )}
            {reason && (
              <div>
                <h4><Icon name="info" size={15} /> {t.whyFits}</h4>
                <p>{reason}</p>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className="link-btn"
          aria-expanded={open}
          onClick={onToggle}
        >
          {open ? t.cropDetailHide : t.cropDetail}
          <Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} />
        </button>
      </div>
    </article>
  );
}

export default function CropsTab({ state, place, rainTotal }) {
  const { t } = useLang();
  const [water, setWater] = useState('rainfed');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

  const rows = useMemo(() => {
    if (state.status !== 'ok') return [];
    return state.data.crops
      .filter((c) => filter === 'all' || c.family === filter)
      .sort((a, b) => b[water].index - a[water].index);
  }, [state, filter, water]);

  if (state.status === 'loading') {
    return <div className="page-panel"><Loading label={t.loadingCrops} height={420} /></div>;
  }

  const anySuitable = rows.some((r) => r[water].index >= 25);
  const top = rows[0]?.[water].index ?? 0;

  return (
    <div className="crops-page">
      <section className="crops-toolbar">
        <div className="segmented" role="group" aria-label={t.waterNeedLabel}>
          <button type="button" aria-pressed={water === 'rainfed'} onClick={() => setWater('rainfed')}>
            <Icon name="drop" size={16} /> {t.rainOnly}
          </button>
          <button type="button" aria-pressed={water === 'irrigated'} onClick={() => setWater('irrigated')}>
            <Icon name="drop" size={16} /> {t.irrigated}
          </button>
        </div>
        <div className="chips" role="group" aria-label={t.cropsTitle}>
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="chip"
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {t[item.label]}
            </button>
          ))}
        </div>
        <p className="toolbar-count">
          <strong>{rows.length}</strong> {t.navCrops.toLowerCase()} · {t.bestMatch} {top}/100
        </p>
      </section>

      {!anySuitable ? (
        <EmptyState
          title={t.cropsEmptyTitle}
          action={(
            <button type="button" className="btn btn-secondary" onClick={() => setWater('irrigated')}>
              {t.showIrrigated}
            </button>
          )}
        >
          {t.cropsEmptyText(place)}
        </EmptyState>
      ) : (
        <div className="crop-grid">
          {rows.map((crop, index) => (
            <CropCard
              key={crop.id}
              crop={crop}
              regime={water}
              rank={index}
              rainTotal={rainTotal}
              open={openId === crop.id}
              onToggle={() => setOpenId(openId === crop.id ? null : crop.id)}
            />
          ))}
        </div>
      )}

      <Source meta={state.data?.meta} />
      <p className="page-note"><Icon name="info" size={16} /> {state.data?.meta?.note}</p>
    </div>
  );
}
