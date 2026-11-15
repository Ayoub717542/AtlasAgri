import { useMemo, useState } from 'react';
import Shell from '../components/Shell';
import { TABS } from '../lib/tabs';
import MapPage from '../components/MapPage';
import FarmTab from '../components/FarmTab';
import ConditionsTab from '../components/ConditionsTab';
import CropsTab from '../components/CropsTab';
import RotationsTab from '../components/RotationsTab';
import SuppliersTab from '../components/SuppliersTab';
import Chatbot from '../components/Chatbot';
import rotations from '../data/rotations.json';
import {
  loadClimate, loadRainfall, loadSoil, loadCrops, suppliersFor,
} from '../lib/api';
import { useLoad } from '../lib/useLoad';
import { findPlace, nearestPlace, placeName } from '../lib/places';
import { soilValuesFor } from '../lib/analysis';
import { sampleLab } from '../lib/lab';
import { CURRENT_YEAR, sum, mean, maxBy, monthIndex } from '../lib/format';
import { useLang } from '../i18n';

const parseRef = (value) => {
  if (!value) return null;
  const [lat, lon] = value.split(',').map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
};

const refString = (point) => `${point.lat.toFixed(5)},${point.lon.toFixed(5)}`;

export default function Dashboard({ tab, locId, refParam, sup, navigate }) {
  const { t, lang } = useLang();
  const place = findPlace(locId);
  const current = TABS.some((item) => item.id === tab) ? tab : 'map';

  const urlPoint = useMemo(() => parseRef(refParam), [refParam]);
  const [userPoint, setUserPoint] = useState(null);
  const manualRef = Boolean(urlPoint || userPoint);
  const refPoint = urlPoint ?? userPoint ?? { lat: place.lat, lon: place.lon };
  const [lab, setLab] = useState(() => sampleLab());

  const [climate] = useLoad(loadClimate, place.dataKey);
  const [rain, retryRain] = useLoad(loadRainfall, place.dataKey);
  const [soil] = useLoad(loadSoil, place.dataKey);
  const [crops] = useLoad(loadCrops, place.dataKey);

  const suppliers = useMemo(() => suppliersFor(place, 100), [place]);

  const metrics = useMemo(() => {
    const climateMonths = climate.status === 'ok' ? climate.data.months : null;
    const rainMonths = rain.status === 'ok' ? rain.data.months : null;
    const soilMonths = soil.status === 'ok' ? soil.data.months.filter((m) => typeof m.rootzone === 'number') : null;
    const cropRows = crops.status === 'ok' ? crops.data.crops : null;
    const wheat = cropRows?.find((c) => c.crop === 'durum-wheat');
    return {
      rain: rainMonths ? Math.round(sum(rainMonths, 'precip')) : 0,
      temp: climateMonths ? Math.round(mean(climateMonths, 't2mMax')) : 24,
      soil: soilMonths?.length ? Math.round(Math.min(...soilMonths.map((m) => m.rootzone)) * 100) : 14,
      crop: wheat?.irrigated?.index ?? 60,
    };
  }, [climate, rain, soil, crops]);

  const hrefFor = (tabId, extra = '') => {
    const ref = manualRef ? `&ref=${refString(refPoint)}` : '';
    return `#/dashboard/${tabId}?loc=${place.id}${ref}${extra}`;
  };

  const selectPlace = (id) => {
    const params = new URLSearchParams({ loc: id });
    if (manualRef) params.set('ref', refString(refPoint));
    navigate(`#/dashboard/${current}?${params.toString()}`);
  };

  const moveRef = (point) => {
    setUserPoint(point);
    const params = new URLSearchParams({ loc: place.id, ref: refString(point) });
    if (current === 'map' && sup) params.set('sup', sup);
    window.history.replaceState(null, '', `#/dashboard/${current}?${params.toString()}`);
  };

  const goLocated = (point) => {
    setUserPoint(point);
    const nearest = nearestPlace(point);
    navigate(`#/dashboard/map?loc=${nearest.id}&ref=${refString(point)}`);
  };

  // Shared context for the helper: the same numbers shown on the page.
  const chatContext = useMemo(() => {
    const rainMonths = rain.status === 'ok' ? rain.data.months : null;
    const total = rainMonths ? Math.round(sum(rainMonths, 'precip')) : 0;
    const normal = rainMonths ? Math.round(sum(rainMonths, 'normal')) : 0;
    const diff = normal ? Math.round(((total - normal) / normal) * 100) : 0;
    const climateMonths = climate.status === 'ok' ? climate.data.months : null;
    const hotDays = climateMonths ? Math.round(sum(climateMonths, 'hotDays')) : 0;
    const hottest = maxBy(climateMonths ?? [], 't2mMax');
    const soilMonths = soil.status === 'ok' ? soil.data.months.filter((m) => typeof m.rootzone === 'number') : [];
    const driest = soilMonths.length ? Math.round(Math.min(...soilMonths.map((m) => m.rootzone)) * 100) : null;
    const values = soilValuesFor(place, lab);

    const regime = place.profile === 'rainfed-plateau' ? 'rainfed' : 'irrigated';
    const rows = crops.status === 'ok'
      ? [...crops.data.crops].sort((a, b) => b[regime].index - a[regime].index)
      : [];
    const cropLabel = (row) => {
      if (!row) return '—';
      if (lang === 'ar') return row.nameAr;
      if (lang === 'fr') return row.nameFr ?? row.name;
      return row.name;
    };
    const top = rows[0];
    const avoid = rows.length ? rows[rows.length - 1] : null;

    const profileRot = rotations.profiles[place.profile] ?? rotations.profiles['irrigated-plain'];
    const option = profileRot.scenarios.find((s) => s.id === 'a') ?? profileRot.scenarios[1];
    const rotationName = lang === 'ar' ? option.name_ar ?? option.name : lang === 'fr' ? option.name_fr ?? option.name : option.name;

    return {
      place: placeName(place, lang),
      year: CURRENT_YEAR,
      rain: total,
      normal,
      diff,
      hot: hotDays,
      hotMonth: hottest ? t.months[monthIndex(hottest.month)] : '—',
      driest,
      organic: values.organic,
      nitrogen: values.nitrogen,
      ph: values.ph,
      salinity: values.salinity,
      topCrop: cropLabel(top),
      topIndex: top ? top[regime].index : 0,
      avoidCrop: avoid && avoid[regime].index < 30 ? cropLabel(avoid) : null,
      rotation: rotationName,
      hasLab: Boolean(lab),
    };
  }, [rain, climate, soil, crops, place, lab, lang, t]);

  return (
    <>
      <Shell
        tab={current}
        place={place}
        hrefFor={hrefFor}
        onSelectPlace={selectPlace}
        suppliersCount={suppliers.length}
      >
        {current === 'map' && (
          <MapPage
            place={place}
            refPoint={refPoint}
            refIsManual={manualRef}
            suppliers={suppliers}
            metrics={metrics}
            onRefChange={moveRef}
            onSelectPlace={selectPlace}
            onLocated={goLocated}
            hrefFor={hrefFor}
            initialSuppliersOpen={sup === '1'}
          />
        )}
        {current === 'farm' && (
          <FarmTab
            place={place}
            data={{ climate, rain, soil, crops }}
            retries={{ rain: retryRain }}
            hrefFor={hrefFor}
            lab={lab}
            setLab={setLab}
          />
        )}
        {current === 'weather' && (
          <ConditionsTab
            climate={climate}
            rain={rain}
            soil={soil}
            retryRain={retryRain}
          />
        )}
        {current === 'crops' && (
          <CropsTab
            state={crops}
            place={placeName(place, lang)}
            rainTotal={rain.status === 'ok' ? sum(rain.data.months, 'precip') : null}
          />
        )}
        {current === 'rotations' && (
          <RotationsTab place={place} />
        )}
        {current === 'suppliers' && (
          <SuppliersTab suppliers={suppliers} hrefFor={hrefFor} />
        )}
      </Shell>
      <Chatbot context={chatContext} />
    </>
  );
}
