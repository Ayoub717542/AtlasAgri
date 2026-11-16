import { useEffect } from 'react';
import Logo from './Logo';
import Icon from './Icons';
import LangToggle from './LangToggle';
import { useLang } from '../i18n';
import { groupByRegion, placeName, placeRegion, typeLabelKey } from '../lib/places';
import { CURRENT_YEAR } from '../lib/format';
import { TABS, GROUPS } from '../lib/tabs';

function PlaceOptions({ groups, lang }) {
  return groups.map((group) => (
    <optgroup key={group.base.id} label={placeRegion({ ...group.places[0] }, lang)}>
      {group.places.map((item) => (
        <option key={item.id} value={item.id}>
          {placeName(item, lang)}
        </option>
      ))}
    </optgroup>
  ));
}

export default function Shell({
  tab = 'map',
  place,
  hrefFor,
  onSelectPlace,
  children,
  suppliersCount = 0,
}) {
  const { t, lang } = useLang();
  const active = TABS.find((item) => item.id === tab) ?? TABS[0];
  const current = TABS.find((item) => item.id === tab);
  const groups = groupByRegion();

  useEffect(() => {
    document.title = `${t[active.title]} · AtlasAgri`;
  }, [t, active]);

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">{t.skipToContent}</a>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo href={hrefFor('map')} />
          <p>{t.tagline}</p>
        </div>

        <div className="place-switcher">
          <label htmlFor="place-select">{t.farmLocation}</label>
          <div className="select-wrap">
            <Icon name="pin" size={17} />
            <select
              id="place-select"
              value={place.id}
              onChange={(event) => onSelectPlace(event.target.value)}
            >
              <PlaceOptions groups={groups} lang={lang} />
            </select>
            <Icon name="chevronDown" size={16} className="select-chevron" />
          </div>
          <p className="place-meta">
            {placeRegion(place, lang)} · {t[typeLabelKey(place)]}
          </p>
        </div>

        <nav className="side-nav" aria-label={t.tagline}>
          {GROUPS.map((group) => {
            const items = TABS.filter((item) => item.group === group);
            if (!items.length) return null;
            return (
              <div className="nav-group" key={group}>
                <p className="nav-group-label">{t[group]}</p>
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={hrefFor(item.id)}
                        className={`nav-item ${item.id === tab ? 'is-active' : ''}`}
                        aria-current={item.id === tab ? 'page' : undefined}
                      >
                        <Icon name={item.icon} size={20} />
                        <span>{t[item.label]}</span>
                        {item.id === 'suppliers' && suppliersCount > 0 && (
                          <span className="nav-count">{suppliersCount}</span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <LangToggle />
          <p className="demo-note">
            <Icon name="info" size={15} />
            <span>{t.demoBadge}. {t.simulatedData}.</span>
          </p>
        </div>
      </aside>

      <div className="main-col">
        <header className="app-header">
          <div className="mobile-brand">
            <Logo href={hrefFor('map')} />
          </div>
          <div className="header-text">
            <p className="eyebrow">{current ? t[current.group] : ''}</p>
            <h1>{t[active.title]}</h1>
            <p className="page-sub">
              {active.id === 'weather' ? t.weatherSubtitle(CURRENT_YEAR)
                : active.id === 'crops' ? t.cropsSubtitle(placeName(place, lang))
                  : active.id === 'rotations' ? t.rotSubtitle(placeName(place, lang))
                    : t[active.sub]}
            </p>
          </div>
          <div className="header-actions">
            <div className="header-place">
              <span className="eyebrow">{t.studyAreaLabel}</span>
              <strong>{placeName(place, lang)}</strong>
              <span className="header-place-meta">{placeRegion(place, lang)} · {t[typeLabelKey(place)]}</span>
            </div>
            <LangToggle compact className="header-lang" />
          </div>
        </header>

        <div className="mobile-place">
          <label htmlFor="mobile-place-select">
            <Icon name="pin" size={16} />
            <span>{t.farmLocation}</span>
          </label>
          <div className="select-wrap">
            <select
              id="mobile-place-select"
              value={place.id}
              onChange={(event) => onSelectPlace(event.target.value)}
            >
              <PlaceOptions groups={groups} lang={lang} />
            </select>
            <Icon name="chevronDown" size={16} className="select-chevron" />
          </div>
          <p className="mobile-place-meta">
            {placeRegion(place, lang)} · {t[typeLabelKey(place)]}
          </p>
        </div>

        <nav className="mobile-nav" aria-label={t.tagline}>
          {TABS.map((item) => (
            <a
              key={item.id}
              href={hrefFor(item.id)}
              className={`mobile-nav-item ${item.id === tab ? 'is-active' : ''}`}
              aria-current={item.id === tab ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span>{t[item.short]}</span>
            </a>
          ))}
        </nav>

        <main id="main-content" className="page-main" tabIndex={-1}>
          {children}
        </main>

        <footer className="app-foot">
          <p>{t.landFooter}</p>
          <p className="foot-meta">
            <span>{t.demoBadge}</span>
            <span>{t.privacyNote}</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
