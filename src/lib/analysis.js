import soilRegions from '../data/soil-regions.json';
import rotations from '../data/rotations.json';
import { CURRENT_YEAR, sum, mean, maxBy, minBy, monthIndex } from './format';
import { placeName, placeRegion, placeArea } from './places';
import { irrigationGap, nitrogenCreditKg, nitrogenSavingsMad } from './assumptions';

// Demonstration guideline bands used by the soil panel. They are broad
// field-crop ranges, not Moroccan legal thresholds or laboratory standards.
// The 2% organic-matter lower bound is also the ledger's working target.
const SOIL_META = [
  { id: 'ph', key: 'soilPh', unit: '', target: '6.5–7.5' },
  { id: 'organic', key: 'soilOrganic', unit: '%', target: '2–6' },
  { id: 'nitrogen', key: 'soilNitrogen', unit: '%', target: '0.10–0.20' },
  { id: 'phosphorus', key: 'soilPhosphorus', unit: 'mg/kg', target: '15–25' },
  { id: 'potassium', key: 'soilPotassium', unit: 'mg/kg', target: '200–300' },
  { id: 'salinity', key: 'soilSalinity', unit: 'dS/m', target: '< 2' },
  { id: 'calcium', key: 'soilCalcium', unit: '%', target: '< 15' },
];

const RULES = {
  ph: (v) => (v < 6.5 ? 'low' : v > 7.5 ? 'high' : 'good'),
  organic: (v) => (v < 2 ? 'low' : 'good'),
  nitrogen: (v) => (v < 0.1 ? 'low' : 'good'),
  phosphorus: (v) => (v < 15 ? 'low' : 'good'),
  potassium: (v) => (v < 200 ? 'low' : 'good'),
  salinity: (v) => (v > 2 ? 'high' : 'good'),
  calcium: (v) => (v > 15 ? 'high' : 'good'),
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const trim = (n, digits = 0) => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

export function soilValuesFor(place, lab) {
  return lab?.values ?? soilRegions[place.profile] ?? soilRegions['irrigated-plain'];
}

export function soilItemsFor(t, place, lab) {
  const source = lab ? 'lab' : 'regional';
  const raw = soilValuesFor(place, lab);
  return SOIL_META.map((meta) => {
    const value = raw[meta.id];
    const status = RULES[meta.id](value);
    return {
      id: meta.id,
      label: t[meta.key],
      value,
      unit: meta.unit,
      target: meta.target,
      status,
      statusLabel: t[status === 'good' ? 'statusGood' : status === 'low' ? 'statusLow' : 'statusHigh'],
      meaning: t.soilMeaning[meta.id]?.[status] ?? '',
      source,
      sourceLabel: lab ? t.soilSourceLab : t.soilSourceRegional,
    };
  });
}

export function buildAnalysis({ t, lang, place, climate, rain, soil, crops, lab }) {
  const thisYear = CURRENT_YEAR;
  const months = (arr) => arr ?? [];
  const climateMonths = months(climate);
  const rainMonths = months(rain);
  const soilMonths = months(soil).filter((m) => typeof m.rootzone === 'number');
  const cropRows = months(crops);

  const local = (obj, field) => {
    if (!obj) return '';
    if (lang === 'ar') return obj[`${field}_ar`] ?? obj[field];
    if (lang === 'fr') return obj[`${field}_fr`] ?? obj[field];
    return obj[field];
  };
  const cropName = (c) => (lang === 'ar' ? c.nameAr : lang === 'fr' ? c.nameFr ?? c.name : c.name);

  // ---- Climate facts -------------------------------------------------------
  const rainTotal = Math.round(sum(rainMonths, 'precip'));
  const rainNormal = Math.round(sum(rainMonths, 'normal'));
  const diff = rainNormal ? Math.round(((rainTotal - rainNormal) / rainNormal) * 100) : 0;
  const hotDays = Math.round(sum(climateMonths, 'hotDays'));
  const hottest = maxBy(climateMonths.filter((m) => typeof m.t2mMax === 'number'), 't2mMax');
  const avgMax = Math.round(mean(climateMonths, 't2mMax') || 0);
  const wettest = soilMonths.length ? maxBy(soilMonths, 'rootzone') : null;
  const driest = soilMonths.length ? minBy(soilMonths, 'rootzone') : null;
  const moistPct = driest ? Math.round(driest.rootzone * 100) : null;
  const monthName = (iso) => t.months[monthIndex(iso)] ?? '';

  // ---- Soil ----------------------------------------------------------------
  const soilSource = lab ? 'lab' : 'regional';
  const raw = soilValuesFor(place, lab);
  const soilItems = soilItemsFor(t, place, lab);

  // ---- Land score ----------------------------------------------------------
  let score = 78;
  if (raw.organic < 2) score -= 5;
  if (raw.nitrogen < 0.1) score -= 4;
  if (raw.phosphorus < 15) score -= 2;
  if (raw.ph > 7.8) score -= 3;
  if (raw.salinity > 1.5) score -= 4;
  if (raw.calcium > 15) score -= 2;
  if (diff <= -15) score -= 6;
  else if (diff < 0) score -= 3;
  else if (diff >= 15) score += 2;
  if (hotDays > 45) score -= 4;
  else if (hotDays > 30) score -= 2;
  if (moistPct != null && moistPct < 12) score -= 2;
  score = clamp(Math.round(score), 30, 92);

  // ---- Crops ---------------------------------------------------------------
  const regime = place.profile === 'rainfed-plateau' ? 'rainfed' : 'irrigated';
  const ranked = cropRows
    .map((c) => ({ ...c, fitIndex: c[regime]?.index ?? 0 }))
    .sort((a, b) => b.fitIndex - a.fitIndex);
  const fitOf = (index) => (index >= 80 ? 'best' : index >= 65 ? 'good' : index >= 45 ? 'marginal' : 'none');
  const fitLabel = (fit) => ({
    best: t.bestMatch,
    good: t.goodMatch,
    marginal: t.marginalMatch,
    none: t.notSuitable,
  }[fit]);

  const recommended = ranked.slice(0, 3).map((c) => {
    const fit = fitOf(c.fitIndex);
    return {
      crop: c.crop,
      name: cropName(c),
      index: c.fitIndex,
      fit,
      fitLabel: fitLabel(fit),
      needMm: c.waterMm,
      seasonMonths: c.seasonMonths,
      family: c.family,
      reason: regime === 'rainfed'
        ? t.cropReasonRainfed(cropName(c), c.fitIndex, c.waterMm, rainTotal)
        : t.cropReason(cropName(c), c.fitIndex, c.waterMm, rainTotal),
    };
  });

  const avoided = ranked
    .filter((c) => c.fitIndex < 30)
    .slice(-2)
    .reverse()
    .map((c) => ({
      crop: c.crop,
      name: cropName(c),
      index: c.fitIndex,
      needMm: c.waterMm,
      seasonMonths: c.seasonMonths,
      family: c.family,
      reason: t.cropReasonAvoid(cropName(c), c.fitIndex, c.waterMm),
    }));

  // ---- Actions -------------------------------------------------------------
  const actionList = [];
  if (raw.organic < 2) actionList.push({ id: 'manure', order: 1, when: t.actManureWhen, title: t.actManureTitle, detail: t.actManureDetail });
  if (raw.nitrogen < 0.1) actionList.push({ id: 'legume', order: 2, when: t.actLegumeWhen, title: t.actLegumeTitle, detail: t.actLegumeDetail });
  if (raw.phosphorus < 20) actionList.push({ id: 'phosphorus', order: 3, when: t.actPhosphorusWhen, title: t.actPhosphorusTitle, detail: t.actPhosphorusDetail });
  if (diff < -10) actionList.push({ id: 'water', order: 4, when: t.actWaterWhen, title: t.actWaterTitle, detail: t.actWaterDetail });
  if (hotDays > 40) actionList.push({ id: 'heat', order: 5, when: t.actHeatWhen, title: t.actHeatTitle, detail: t.actHeatDetail });
  if (raw.salinity > 1.5) actionList.push({ id: 'salt', order: 6, when: t.actSaltWhen, title: t.actSaltTitle, detail: t.actSaltDetail });
  if (raw.ph > 7.8) actionList.push({ id: 'ph', order: 7, when: t.actPhWhen, title: t.actPhTitle, detail: t.actPhDetail });
  const actions = actionList.sort((a, b) => a.order - b.order).slice(0, 4);

  // ---- Seasonal water balance ---------------------------------------------
  // The ledger compares the top recommended crop with rain that falls during
  // its own season, not with the whole calendar year. Effective rain and
  // application efficiency are explicitly labelled demonstration assumptions.
  const monthNumber = (iso) => monthIndex(iso) + 1;
  const inSeason = (month, range) => {
    if (!range) return true;
    const [start, end] = range;
    return start <= end
      ? month >= start && month <= end
      : month >= start || month <= end;
  };
  const seasonRainMm = (range) => Math.round(sum(
    rainMonths.filter((m) => inSeason(monthNumber(m.month), range)),
    'precip',
  ));
  const top = recommended[0];
  const water = {
    crop: top?.crop ?? null,
    cropName: top?.name ?? '',
    needMm: top?.needMm ?? 0,
    seasonMonths: top?.seasonMonths ?? null,
    ...irrigationGap({
      needMm: top?.needMm ?? 0,
      seasonRainMm: top?.seasonMonths ? seasonRainMm(top.seasonMonths) : rainTotal,
    }),
  };

  // ---- Four questions ------------------------------------------------------
  const firstAction = actions[0]?.title ?? t.actManureTitle;
  const fourQ = {
    what: t.whatSentence({
      rain: rainTotal,
      diff,
      normal: rainNormal,
      hot: hotDays,
      moist: moistPct ?? '—',
      month: driest ? monthName(driest.month) : '—',
      lab: Boolean(lab),
    }),
    why: `${t.whyProfile[place.profile] ?? ''} ${t.whyData(diff)}`.trim(),
    how: top
      ? t.howSentence({
        crop: top.name,
        need: top.needMm,
        rain: water.seasonRainMm,
        effectiveRain: water.effectiveRainMm,
        hot: hotDays,
      })
      : t.howSentence({ crop: t.recCrops, need: 400, rain: rainTotal, effectiveRain: rainTotal, hot: hotDays }),
    solution: t.solutionSentence(firstAction),
  };

  // ---- Rotation ------------------------------------------------------------
  const profileRot = rotations.profiles[place.profile] ?? rotations.profiles['irrigated-plain'];
  const option = profileRot.scenarios.find((s) => s.id === 'a') ?? profileRot.scenarios[1];
  const currentOption = profileRot.scenarios.find((s) => s.id === 'current') ?? null;
  const currentNitrogenKgHa = currentOption?.nitrogenKgHa ?? 0;
  const rotation = {
    id: option.id,
    name: local(option, 'name'),
    summary: local(option, 'summary'),
    text: local(profileRot, 'recommendationText'),
    waterMm: option.waterMm,
    nitrogenKgHa: option.nitrogenKgHa,
    currentNitrogenKgHa,
    nitrogenCreditKg: nitrogenCreditKg(option.nitrogenKgHa, currentNitrogenKgHa),
    nitrogenSavingsMad: nitrogenSavingsMad(option.nitrogenKgHa, currentNitrogenKgHa),
    soilScore: option.soilScore,
    erosionRisk: option.erosionRisk,
  };

  // ---- Confidence ----------------------------------------------------------
  const confidence = {
    level: lab ? 'medium' : 'low',
    label: lab ? t.confMedium : t.confLow,
    notes: [
      lab ? t.confNoteLab : t.confNoteRegional,
      t.confNoteClimate,
      t.confNoteRules,
    ],
  };

  const headline = diff < -10 && (raw.organic < 2 || raw.nitrogen < 0.1)
    ? t.headlineDeficit
    : score < 52
      ? t.headlineStress
      : t.headlineBalanced;

  return {
    simulated: true,
    model: 'AtlasAgri rules-based demonstration assistant',
    language: lang,
    generatedAt: new Date().toISOString(),
    year: thisYear,
    farm: {
      location: place.id,
      locationName: placeName(place, lang),
      region: placeRegion(place, lang),
      profile: place.profile,
      profileLabel: t[`area${place.type === 'rainfed' ? 'Rainfed' : place.type === 'oasis' ? 'Oasis' : 'Irrigated'}`],
      area: placeArea(place, lang),
      lat: trim(place.lat, 4),
      lon: trim(place.lon, 4),
    },
    soilSource,
    soil: soilItems,
    climate: [
      {
        id: 'rain',
        label: t.layerRain,
        value: rainTotal,
        normal: rainNormal,
        unit: t.legendUnitRain,
        diffPct: diff,
        note: diff < 0
          ? t.findingRainLess(rainTotal, Math.abs(diff), rainNormal, thisYear)
          : t.findingRainMore(rainTotal, Math.abs(diff), rainNormal, thisYear),
      },
      {
        id: 'heat',
        label: t.statHeatTitle,
        value: hotDays,
        unit: t.chartUnitTemp,
        note: t.findingHeat(hotDays, hottest ? monthName(hottest.month) : '—', Math.round(hottest?.t2mMax ?? avgMax)),
      },
      {
        id: 'moisture',
        label: t.soilHealthTitle,
        value: moistPct,
        unit: '%',
        note: driest
          ? t.findingSoil(wettest ? monthName(wettest.month) : '—', monthName(driest.month), moistPct)
          : '',
      },
    ],
    overall: {
      score,
      headline,
      summary: top ? t.summarySentence(diff, top.name) : '',
    },
    fourQ,
    crops: recommended,
    avoid: avoided,
    actions,
    water,
    rotation,
    confidence,
    inputs: [
      {
        id: 'soil',
        source: lab ? `${t.labTitle} (demo)` : t.regionalSoilTitle,
        covers: lab ? t.coversPlot : t.covers50,
        kind: soilSource,
      },
      { id: 'power', source: `NASA POWER format, ${thisYear} (demo)`, covers: t.covers50, kind: 'satellite' },
      { id: 'gpm', source: `NASA GPM IMERG Final V07 format, ${thisYear} (demo)`, covers: t.covers10, kind: 'satellite' },
      { id: 'smap', source: `NASA SMAP L4 format, ${thisYear} (demo)`, covers: t.covers9, kind: 'satellite' },
      { id: 'gaez', source: 'FAO GAEZ v5 format (demo)', covers: t.covers1, kind: 'model' },
    ],
  };
}
