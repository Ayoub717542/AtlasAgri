import Logo from '../components/Logo';
import Icon from '../components/Icons';
import LangToggle from '../components/LangToggle';
import LocateButton from '../components/LocateButton';
import gpm from '../data/gpm-imerg.json';
import { CURRENT_YEAR, MONTH, sum, fmt } from '../lib/format';
import { defaultPlace } from '../lib/places';
import { cropInfo } from '../lib/api';
import { cropName, photoCredits } from '../lib/names';
import { useLang } from '../i18n';

const DASH = `#/dashboard/map?loc=${defaultPlace().id}`;

// One year of rain against a normal year, with the wheat season underneath.
function SeasonStrip() {
  const { t } = useLang();
  const months = gpm.locations['beni-mellal'];
  const max = Math.max(...months.map((m) => Math.max(m.precip, m.normal)));
  const total = sum(months, 'precip');
  const normal = sum(months, 'normal');
  const wheat = (i) => i <= 5 || i >= 10;

  return (
    <figure className="strip">
      <figcaption>
        <span className="eyebrow">{t.stripRain(CURRENT_YEAR)}</span>
        {t.stripCaption(fmt(total), fmt(normal), CURRENT_YEAR)}
      </figcaption>
      <div
        className="strip-chart"
        role="img"
        aria-label={`${t.stripCaption(fmt(total), fmt(normal), CURRENT_YEAR)} ${t.stripRain(CURRENT_YEAR)}: ${fmt(total)} mm. ${t.stripNormal}: ${fmt(normal)} mm.`}
      >
        {months.map((month, index) => (
          <div className="strip-col" key={month.month}>
            <div className="strip-bars">
              <span className="strip-normal" style={{ bottom: `${(month.normal / max) * 100}%` }} />
              <span className="strip-rain" style={{ height: `${(month.precip / max) * 100}%`, '--i': index * 55 }} />
            </div>
            <span className={`strip-season ${wheat(index) ? 'is-on' : ''}`} />
            <span className="strip-month">{t.monthShort[index] ?? MONTH[index]}</span>
          </div>
        ))}
      </div>
      <div className="strip-key">
        <span><i className="k-rain" /> {t.stripRain(CURRENT_YEAR)}</span>
        <span><i className="k-normal" /> {t.stripNormal}</span>
        <span><i className="k-wheat" /> {t.stripWheat}</span>
      </div>
    </figure>
  );
}

const FEATURES = [
  { icon: 'map', title: 'featureMapTitle', text: 'featureMapText' },
  { icon: 'drop', title: 'featureWaterTitle', text: 'featureWaterText' },
  { icon: 'leaf', title: 'featureCropTitle', text: 'featureCropText' },
  { icon: 'rotate', title: 'featureRotTitle', text: 'featureRotText' },
];

const STEPS = [
  { n: 1, title: 'howStep1', text: 'howStep1d' },
  { n: 2, title: 'howStep2', text: 'howStep2d' },
  { n: 3, title: 'howStep3', text: 'howStep3d' },
];

const SOURCES = [
  { q: 'sourcesQ1', a: 'sourcesA1', icon: 'sun' },
  { q: 'sourcesQ2', a: 'sourcesA2', icon: 'drop' },
  { q: 'sourcesQ3', a: 'sourcesA3', icon: 'soil' },
  { q: 'sourcesQ4', a: 'sourcesA4', icon: 'leaf' },
];

function PhotoCredits() {
  const { t, lang } = useLang();
  return (
    <details className="credits">
      <summary>{t.photoCredits}</summary>
      <ul>
        {Object.entries(photoCredits).map(([id, credit]) => (
          <li key={id}>
            <a href={credit.source} target="_blank" rel="noreferrer">{cropName(cropInfo(id), lang)}</a>
            <span> — {credit.license}{credit.author ? `, ${credit.author}` : ''}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function Landing() {
  const { t } = useLang();

  return (
    <div className="landing">
      <header className="land-bar">
        <Logo />
        <div className="land-bar-actions">
          <LangToggle compact />
          <a className="btn btn-secondary btn-small" href={DASH}>{t.heroCta}</a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-text">
            <p className="hero-kicker"><Icon name="sparkle" size={16} /> {t.heroKicker}</p>
            <h1>{t.heroTitle}</h1>
            <p className="lead">{t.heroLead}</p>
            <div className="hero-actions">
              <LocateButton className="btn btn-primary btn-large">{t.heroSecondary}</LocateButton>
              <a className="btn btn-secondary btn-large" href={DASH}>
                {t.heroCta} <Icon name="arrowRight" size={18} />
              </a>
            </div>
            <ul className="hero-proof">
              <li><Icon name="check" size={15} /> {t.heroProof1}</li>
              <li><Icon name="check" size={15} /> {t.heroProof2}</li>
              <li><Icon name="check" size={15} /> {t.heroProof3}</li>
            </ul>
          </div>
          <div className="hero-visual">
            <img className="hero-photo" src="/crops/durum-wheat.jpg" alt="" />
            <SeasonStrip />
          </div>
        </section>

        <section className="land-section">
          <div className="section-head">
            <h2>{t.howTitle}</h2>
          </div>
          <ol className="land-steps">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="land-step-num">{step.n}</span>
                <div>
                  <h3>{t[step.title]}</h3>
                  <p>{t[step.text]}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="land-section">
          <div className="section-head">
            <h2>{t.sourcesTitle}</h2>
            <span className="tag tag-warn">{t.simulatedData}</span>
          </div>
          <div className="source-grid">
            {SOURCES.map((source) => (
              <article className="source-card" key={source.q}>
                <span className="source-icon"><Icon name={source.icon} size={20} /></span>
                <h3>{t[source.q]}</h3>
                <p>{t[source.a]}</p>
              </article>
            ))}
          </div>
          <p className="sources-scale-note"><Icon name="info" size={16} /> {t.sourcesScaleNote}</p>
          <p className="page-note"><Icon name="info" size={16} /> {t.landFooter}</p>
        </section>

        <section className="land-section">
          <div className="section-head">
            <h2>{t.tagline}</h2>
          </div>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className="feature-icon"><Icon name={feature.icon} size={22} /></span>
                <h3>{t[feature.title]}</h3>
                <p>{t[feature.text]}</p>
              </article>
            ))}
          </div>
          <div className="land-cta">
            <div>
              <h3>{t.heroTitle}</h3>
              <p>{t.heroProof3}</p>
            </div>
            <a className="btn btn-primary btn-large" href={DASH}>
              {t.heroCta} <Icon name="arrowRight" size={18} />
            </a>
          </div>
        </section>
      </main>

      <footer className="land-foot">
        <Logo />
        <div>
          <p>{t.landFooter}</p>
          <p className="foot-meta"><span>{t.demoBadge}</span><span>{t.privacyNote}</span></p>
          <PhotoCredits />
        </div>
      </footer>
    </div>
  );
}
