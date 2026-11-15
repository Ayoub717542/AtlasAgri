import { useMemo, useState } from 'react';
import FarmMap from './FarmMap';
import Icon from './Icons';
import LocateButton from './LocateButton';
import { LAYERS, layerCells, legendBands } from '../lib/layers';
import { PLACES, placeName, placeRegion, typeLabelKey } from '../lib/places';
import { sortByDistance, km } from '../lib/geo';
import { cropInfo, layerValuesByRegion } from '../lib/api';
import { useLang } from '../i18n';

export default function MapPage({
  place,
  refPoint,
  refIsManual,
  suppliers,
  _metrics,
  onRefChange,
  onSelectPlace,
  onLocated,
  hrefFor,
  initialSuppliersOpen = false,
}) {
  const { t, lang } = useLang();
  const [layerId, setLayerId] = useState('rain');
  const [suppliersOn, setSuppliersOn] = useState(initialSuppliersOpen);

  const layer = LAYERS.find((l) => l.id === layerId) ?? LAYERS[0];
  const regionValues = useMemo(() => layerValuesByRegion(), []);
  const cells = useMemo(
    () => layerCells(layer, PLACES, regionValues, place.id),
    [layer, regionValues, place.id],
  );
  const selectedCell = cells.find((cell) => cell.selected) ?? cells[0];
  const bands = legendBands(layer, t[layer.unit]);

  const nearby = useMemo(
    () => sortByDistance(PLACES.filter((p) => p.id !== place.id), refPoint),
    [refPoint, place.id],
  );
  const nearest = nearby[0];
  const shown = nearby.filter((p) => p.distanceKm <= 80).slice(0, 6);

  const cropLabel = (id) => {
    const crop = cropInfo(id);
    if (!crop) return id;
    if (lang === 'ar') return crop.nameAr;
    if (lang === 'fr') return crop.nameFr ?? crop.name;
    return crop.name;
  };

  return (
    <div className="map-page">
      <div className="map-topline">
        <div className="pos-block">
          <span className="eyebrow"><Icon name="target" size={16} /> {t.yourPosition}</span>
          <strong className="mono">{refPoint.lat.toFixed(4)}, {refPoint.lon.toFixed(4)}</strong>
          <span className="muted small">
            {refIsManual ? t.mapYourPin : t.locManualHint}
          </span>
        </div>
        <div className="pos-divider" aria-hidden="true" />
        <div className="pos-block">
          <span className="eyebrow"><Icon name="pin" size={16} /> {t.studyAreaLabel}</span>
          <strong>{placeName(place, lang)}</strong>
          <span className="muted small">{placeRegion(place, lang)} · {t[typeLabelKey(place)]}</span>
        </div>
        <LocateButton className="btn btn-secondary map-locate" onLocated={onLocated} showMessage={false}>
          {t.locate}
        </LocateButton>
      </div>

      {nearest && nearest.id !== place.id && nearest.distanceKm <= 80 && (
        <div className="nearest-banner" role="status">
          <Icon name="navigation" size={18} />
          <span>
            {t.nearestToPin}:{' '}
            <strong>{placeName(nearest, lang)}</strong> · {t.approxDistance(km(nearest.distanceKm))}
          </span>
          <button
            type="button"
            className="btn btn-small btn-primary"
            onClick={() => onSelectPlace(nearest.id)}
          >
            {t.studyThisArea}
          </button>
        </div>
      )}

      <div className="map-layout">
        <section className="map-card" aria-label={t.mapTitle}>
          <div className="map-toolbar">
            <div className="layer-chips" role="group" aria-label={t.mapPanelLayers}>
              {LAYERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`layer-chip ${item.id === layerId ? 'is-active' : ''}`}
                  aria-pressed={item.id === layerId}
                  onClick={() => setLayerId(item.id)}
                >
                  <span className="layer-swatch" style={{ background: item.colors[3] }} aria-hidden="true" />
                  <Icon name={item.icon} size={17} />
                  <span>{t[item.label]}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className={`toggle-btn ${suppliersOn ? 'is-on' : ''}`}
              aria-pressed={suppliersOn}
              onClick={() => setSuppliersOn((v) => !v)}
            >
              <Icon name="store" size={18} />
              <span className="toggle-text">{suppliersOn ? t.mapHideSuppliers : t.mapShowSuppliers}</span>
            </button>
          </div>

          <div className="map-canvas">
            <FarmMap
              place={place}
              refPoint={refPoint}
              nearby={shown}
              suppliers={suppliers}
              cells={cells}
              suppliersOn={suppliersOn}
              onMapClick={onRefChange}
            />
            <div className="map-overlay" role="note">
              <span className="overlay-title"><Icon name={layer.icon} size={15} /> {t[layer.label]}</span>
              <span className="sim-tag">{t.simulated}</span>
            </div>
            <div className="map-scale-note">
              {selectedCell ? `${selectedCell.value.toFixed(layer.decimals)} ${t[layer.unit]}` : ''}
            </div>
          </div>

          <div className="legend">
            <div className="legend-head">
              <strong>{t.legendTitle}</strong>
              <span className="muted">{t[layer.sub]}</span>
            </div>
            <ul className="legend-list">
              {bands.map((band) => (
                <li key={band.label}>
                  <span className="legend-swatch" style={{ background: band.color }} aria-hidden="true" />
                  <span>{band.label}</span>
                </li>
              ))}
            </ul>
            <p className="legend-note"><Icon name="info" size={15} /> {t.legendNote}</p>
          </div>
        </section>

        <aside className="map-side">
          <section className="panel nearby-panel">
            <header className="panel-head">
              <h2>{t.nearbyTitle}</h2>
              <span className="count-pill">{shown.length}</span>
            </header>
            <p className="muted small">{t.nearbySubtitle(shown.length, 80)}</p>
            {shown.length === 0 ? (
              <p className="empty-inline">{t.nearbyNone}</p>
            ) : (
              <ul className="nearby-list">
                {shown.map((item) => {
                  const selected = item.id === place.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`nearby-item ${selected ? 'is-selected' : ''}`}
                        onClick={() => onSelectPlace(item.id)}
                        aria-current={selected ? 'true' : undefined}
                      >
                        <span className="nearby-top">
                          <span className="nearby-name">{placeName(item, lang)}</span>
                          <span className="nearby-dist">{t.approxDistance(km(item.distanceKm))}</span>
                        </span>
                        <span className="nearby-meta">{t[typeLabelKey(item)]}</span>
                        <span className="nearby-crops">
                          {item.mainCrops.slice(0, 3).map((c) => (
                            <span className="mini-chip" key={c}>{cropLabel(c)}</span>
                          ))}
                        </span>
                        <span className="nearby-action">
                          {selected ? <><Icon name="check" size={15} /> {t.studying}</> : t.studyThisArea}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="map-hint"><Icon name="info" size={15} /> {t.mapHint}</p>
          </section>

          <section className="panel supplier-mini-panel">
            <header className="panel-head">
              <h2>{t.mapPanelSuppliers}</h2>
              <span className="count-pill">{suppliers.length}</span>
            </header>
            <p className="muted small">{t.suppliersSubtitle}</p>
            <ul className="supplier-mini">
              {suppliers.slice(0, 3).map((s) => (
                <li key={s.id}>
                  <span className={`cat-dot cat-${s.category}`} aria-hidden="true" />
                  <span className="supplier-mini-name">{lang === 'ar' ? s.nameAr : s.name}</span>
                  <span className="supplier-mini-dist">{t.distanceFromArea(Math.round(s.distanceKm))}</span>
                </li>
              ))}
            </ul>
            <a className="btn btn-secondary btn-block" href={hrefFor('suppliers')}>
              {t.navSuppliers} <Icon name="arrowRight" size={17} />
            </a>
          </section>
        </aside>
      </div>

      <p className="page-note"><Icon name="info" size={16} /> {t.supplierDisclaimer}</p>
    </div>
  );
}
