import { useState } from 'react';
import {
  ResponsiveContainer, ComposedChart, LineChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import Icon from './Icons';
import { Loading, ErrorState, Source } from './States';
import { monthIndex, sum, fmt, CURRENT_YEAR } from '../lib/format';
import { useLang } from '../i18n';
import ScientificGlossary from './ScientificGlossary';

const axis = { stroke: '#6B7A6F', fontSize: 12, tickLine: false };
const grid = <CartesianGrid stroke="#E3E8E0" vertical={false} />;
const tip = {
  contentStyle: { borderRadius: 8, border: '1px solid #D5DCD3', fontSize: 13, background: '#FFFDF8' },
  labelStyle: { fontWeight: 700, color: '#1E2B22' },
};

const rootStats = (state) => {
  if (state.status !== 'ok') return null;
  const months = state.data.months;
  const values = months.map((m) => m.rootzone).filter((v) => typeof v === 'number');
  if (!values.length) return null;
  return {
    driest: Math.round(Math.min(...values) * 100),
    wettest: Math.round(Math.max(...values) * 100),
    missing: months.length - values.length,
  };
};

function StatCards({ climate, rain, soil }) {
  const { t } = useLang();

  const rainData = rain.status === 'ok' ? rain.data.months : null;
  const total = rainData ? Math.round(sum(rainData, 'precip')) : null;
  const normal = rainData ? Math.round(sum(rainData, 'normal')) : null;
  const diff = total && normal ? Math.round(((total - normal) / normal) * 100) : null;
  const hot = climate.status === 'ok' ? Math.round(sum(climate.data.months, 'hotDays')) : null;
  const root = rootStats(soil);

  const items = [
    {
      id: 'rain',
      icon: 'drop',
      label: t.statRainTitle,
      value: total,
      unit: t.chartUnitRain,
      sub: diff == null ? t.readingRecords : t.statRainSub(diff),
      tone: diff != null && diff < -10 ? 'warn' : 'good',
    },
    {
      id: 'heat',
      icon: 'sun',
      label: t.statHeatTitle,
      value: hot,
      unit: t.daysShort,
      sub: t.statHeatSub,
      tone: hot != null && hot > 40 ? 'warn' : 'good',
    },
    {
      id: 'soil',
      icon: 'soil',
      label: t.statSoilTitle,
      value: root?.driest ?? null,
      unit: t.chartUnitSoil,
      sub: t.statSoilSub,
      tone: root?.driest != null && root.driest < 10 ? 'warn' : 'good',
    },
  ];

  return (
    <div className="stat-row">
      {items.map((item) => (
        <article className={`stat-card tone-${item.tone}`} key={item.id}>
          <p className="stat-label"><Icon name={item.icon} size={17} /> {item.label}</p>
          <p className="stat-value">
            {item.value == null
              ? <span className="stat-skeleton" aria-hidden="true" />
              : <><strong>{item.value}</strong><span className="stat-unit">{item.unit}</span></>}
          </p>
          <p className="stat-sub">{item.sub}</p>
        </article>
      ))}
    </div>
  );
}

function Findings({ climate, rain, soil }) {
  const { t } = useLang();
  const items = [];

  if (rain.status === 'ok') {
    const m = rain.data.months;
    const total = sum(m, 'precip');
    const normal = sum(m, 'normal');
    const diff = Math.round(((total - normal) / normal) * 100);
    items.push({
      tone: diff <= -15 ? 'warn' : diff >= 15 ? 'good' : 'neutral',
      key: 'rain',
      icon: 'drop',
      title: t.chartRainTitle,
      source: 'GPM IMERG Final V07',
      text: diff < 0 ? t.findingRainLess(fmt(total), Math.abs(diff), fmt(normal), CURRENT_YEAR) : t.findingRainMore(fmt(total), diff, fmt(normal), CURRENT_YEAR),
    });
  }
  if (climate.status === 'ok') {
    const m = climate.data.months;
    const hot = sum(m, 'hotDays');
    const peak = m.reduce((a, b) => (b.t2mMax > a.t2mMax ? b : a));
    items.push({
      tone: hot > 40 ? 'warn' : 'neutral',
      key: 'heat',
      icon: 'sun',
      title: t.chartTempTitle,
      source: 'NASA POWER',
      text: t.findingHeat(hot, t.months[monthIndex(peak.month)], fmt(peak.t2mMax)),
    });
  }
  if (soil.status === 'ok') {
    const stats = rootStats(soil);
    if (stats) {
      const m = soil.data.months.filter((x) => x.rootzone != null);
      const dry = m.reduce((a, b) => (b.rootzone < a.rootzone ? b : a));
      const wet = m.reduce((a, b) => (b.rootzone > a.rootzone ? b : a));
      items.push({
        tone: stats.driest < 10 ? 'warn' : 'neutral',
        key: 'soil',
        icon: 'soil',
        title: t.chartSoilTitle,
        source: 'SMAP L4',
        text: t.findingSoil(t.months[monthIndex(wet.month)], t.months[monthIndex(dry.month)], stats.driest),
      });
    }
  }

  return (
    <section className="panel findings-panel" aria-labelledby="findings-title">
      <header className="panel-head">
        <h2 id="findings-title">{t.findingsTitle}</h2>
        <span className="tag">{CURRENT_YEAR}</span>
      </header>
      <p className="muted">{t.findingsSub}</p>
      {items.length === 0 ? (
        <Loading label={t.readingRecords} height={140} />
      ) : (
        <ul className="finding-list">
          {items.map((item) => (
            <li key={item.key} className={`finding tone-${item.tone}`}>
              <span className="finding-icon"><Icon name={item.icon} size={19} /></span>
              <div>
                <p className="finding-title">{item.title}</p>
                <p>{item.text}</p>
                <span className="finding-src">{t.source}: {item.source}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChartPanel({ title, sub, icon, children, meta, note }) {
  return (
    <section className="panel chart-panel">
      <header className="chart-head">
        <div>
          <h2><Icon name={icon} size={20} /> {title}</h2>
          <p>{sub}</p>
        </div>
        <span className="tag tag-soft">{note ?? '12M'}</span>
      </header>
      <div className="chart-body" dir="ltr">{children}</div>
      <Source meta={meta} />
    </section>
  );
}

function TemperatureChart({ state }) {
  const { t } = useLang();
  if (state.status === 'loading') return <Loading label={t.loadingTemp} height={280} />;
  if (state.status === 'error') return null;
  const data = state.data.months.map((m) => ({
    month: t.months[monthIndex(m.month)],
    range: [m.t2mMin, m.t2mMax],
    mean: m.t2m,
  }));
  return (
    <>
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          {grid}
          <XAxis dataKey="month" {...axis} interval={1} />
          <YAxis {...axis} unit="°" width={46} />
          <Tooltip
            {...tip}
            formatter={(v, n) => (Array.isArray(v)
              ? [`${v[0]} – ${v[1]} °C`, t.tempBand]
              : [`${v} °C`, n])}
          />
          <Area dataKey="range" name={t.tempBand} fill="#C08A1E" fillOpacity={0.2} stroke="none" />
          <Line dataKey="mean" name={t.tempAvg} stroke="#9A6C0E" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <Source meta={state.data.meta} />
    </>
  );
}

function RainChart({ state, onRetry }) {
  const { t } = useLang();
  if (state.status === 'loading') return <Loading label={t.loadingRain} height={280} />;
  if (state.status === 'error') return <ErrorState message={state.error} onRetry={onRetry} />;
  const data = state.data.months.map((m) => ({
    month: t.months[monthIndex(m.month)],
    rain: m.precip,
    normal: m.normal,
  }));
  return (
    <>
      <ResponsiveContainer width="100%" height={270}>
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          {grid}
          <XAxis dataKey="month" {...axis} interval={1} />
          <YAxis {...axis} unit=" mm" width={56} />
          <Tooltip {...tip} formatter={(v, n) => [`${v} mm`, n]} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="rain" name={t.rainLabel(CURRENT_YEAR)} fill="#1F6FA8" radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Line dataKey="normal" name={t.normalLabel} stroke="#1E2B22" strokeDasharray="5 4" strokeWidth={1.5} dot={false} type="monotone" />
        </ComposedChart>
      </ResponsiveContainer>
      <Source meta={state.data.meta} />
    </>
  );
}

function SoilChart({ state }) {
  const { t } = useLang();
  if (state.status === 'loading') return <Loading label={t.loadingSoil} height={280} />;
  if (state.status === 'error') return null;
  const months = state.data.months;
  const gaps = months.filter((m) => m.surface == null).map((m) => t.months[monthIndex(m.month)]);
  const data = months.map((m) => ({
    month: t.months[monthIndex(m.month)],
    surface: m.surface == null ? null : Math.round(m.surface * 100),
    rootzone: m.rootzone == null ? null : Math.round(m.rootzone * 100),
  }));
  return (
    <>
      <ResponsiveContainer width="100%" height={270}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          {grid}
          <XAxis dataKey="month" {...axis} interval={1} />
          <YAxis {...axis} unit="%" domain={[0, 40]} width={46} />
          <Tooltip {...tip} formatter={(v, n) => [`${v}% ${t.waterWord}`, n]} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 13 }} />
          <Line dataKey="surface" name={t.surfaceLabel} stroke="#7A5C3E" strokeWidth={2} dot={{ r: 3 }} />
          <Line dataKey="rootzone" name={t.rootLabel} stroke="#2F6B3B" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
      {gaps.length > 0 && <p className="gap-note">{t.soilGapNote(gaps.join(` ${t.and} `))}</p>}
      <Source meta={state.data.meta} />
    </>
  );
}

function ClimateScenarioSimulator({ rain, climate }) {
  const { t } = useLang();
  const [rainDelta, setRainDelta] = useState(0);
  const [heatDelta, setHeatDelta] = useState(0);

  const baseRain = rain.status === 'ok' ? sum(rain.data.months, 'precip') : 320;
  const projectedRain = Math.round(baseRain * (1 + rainDelta / 100));
  const deficitShift = Math.round(baseRain - projectedRain);
  const hotDaysBase = climate.status === 'ok' ? Math.round(sum(climate.data.months, 'hotDays')) : 24;
  const projectedHot = hotDaysBase + Number(heatDelta);

  const adviceKey = rainDelta < -10 ? 'simAdviceDrier' : rainDelta > 10 ? 'simAdviceWetter' : 'simAdviceNormal';

  return (
    <section className="panel sim-panel">
      <header className="panel-head">
        <div>
          <span className="eyebrow"><Icon name="sparkle" size={16} /> {t.simTitle}</span>
          <h2>{t.simTitle}</h2>
          <p className="muted">{t.simSub}</p>
        </div>
        {(rainDelta !== 0 || heatDelta !== 0) && (
          <button type="button" className="btn btn-ghost btn-small" onClick={() => { setRainDelta(0); setHeatDelta(0); }}>
            <Icon name="rotate" size={14} /> {t.simReset}
          </button>
        )}
      </header>

      <div className="sim-controls-grid">
        <div className="sim-control">
          <div className="sim-control-label">
            <span><Icon name="drop" size={16} /> {t.simRainSlider}</span>
            <strong className="mono">{rainDelta > 0 ? `+${rainDelta}%` : `${rainDelta}%`}</strong>
          </div>
          <input
            type="range"
            min="-30"
            max="30"
            step="5"
            value={rainDelta}
            onChange={(e) => setRainDelta(Number(e.target.value))}
            className="sim-slider"
          />
        </div>

        <div className="sim-control">
          <div className="sim-control-label">
            <span><Icon name="sun" size={16} /> {t.simHeatSlider}</span>
            <strong className="mono">+{heatDelta} {t.daysShort}</strong>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={heatDelta}
            onChange={(e) => setHeatDelta(Number(e.target.value))}
            className="sim-slider"
          />
        </div>
      </div>

      <div className="sim-results-grid">
        <div className="sim-metric">
          <span className="muted small">{t.simProjectedRain}</span>
          <strong>{fmt(projectedRain)} <small>{t.chartUnitRain}</small></strong>
          <span className={`tag ${rainDelta < 0 ? 'tag-warn' : rainDelta > 0 ? 'tag-good' : ''}`}>
            {rainDelta > 0 ? `+${fmt(projectedRain - baseRain)} mm` : `${fmt(projectedRain - baseRain)} mm`}
          </span>
        </div>

        <div className="sim-metric">
          <span className="muted small">{t.simWaterDeficit}</span>
          <strong>{deficitShift > 0 ? `+${fmt(deficitShift)}` : fmt(deficitShift)} <small>{t.chartUnitRain}</small></strong>
          <span className="muted small">{deficitShift > 0 ? t.metricWater : t.source}</span>
        </div>

        <div className="sim-metric">
          <span className="muted small">{t.statHeatTitle}</span>
          <strong>{projectedHot} <small>{t.daysShort}</small></strong>
          <span className={`tag ${projectedHot > 30 ? 'tag-warn' : 'tag-good'}`}>
            {projectedHot > 30 ? t.heatHazard : t.statusGood}
          </span>
        </div>
      </div>

      <div className="sim-advice-box">
        <Icon name="info" size={18} />
        <p>{t[adviceKey]}</p>
      </div>
    </section>
  );
}

export default function ConditionsTab({ climate, rain, soil, retryRain }) {
  const { t } = useLang();
  return (
    <div className="conditions-page">
      <StatCards climate={climate} rain={rain} soil={soil} />
      <Findings climate={climate} rain={rain} soil={soil} />

      <ClimateScenarioSimulator rain={rain} climate={climate} />

      <ChartPanel
        title={t.chartTempTitle}
        sub={t.chartTempSub}
        icon="sun"
        meta={climate.status === 'ok' ? climate.data.meta : null}
        note={t.chartUnitTemp}
      >
        <TemperatureChart state={climate} />
      </ChartPanel>

      <ChartPanel
        title={t.chartRainTitle}
        sub={t.chartRainSub}
        icon="drop"
        meta={rain.status === 'ok' ? rain.data.meta : null}
        note={t.chartUnitRain}
      >
        <RainChart state={rain} onRetry={retryRain} />
      </ChartPanel>

      <ChartPanel
        title={t.chartSoilTitle}
        sub={t.chartSoilSub}
        icon="soil"
        meta={soil.status === 'ok' ? soil.data.meta : null}
        note={t.chartUnitSoil}
      >
        <SoilChart state={soil} />
      </ChartPanel>

      <ScientificGlossary />

      <p className="page-note">
        <Icon name="info" size={16} /> {t.dataUsedSub}
      </p>
    </div>
  );
}
