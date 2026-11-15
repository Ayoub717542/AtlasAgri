// Builds the analysis in all three languages and checks that it is complete,
// data-driven and free of empty or broken sentences.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const server = await createServer({
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const load = (path) => server.ssrLoadModule(path);
const { buildAnalysis, soilItemsFor } = await load('/src/lib/analysis.js');
const { loadClimate, loadRainfall, loadSoil, loadCrops } = await load('/src/lib/api.js');
const { findPlace, PLACES } = await load('/src/lib/places.js');
const { sampleLab } = await load('/src/lib/lab.js');
const {
  EFFECTIVE_RAIN_SHARE,
  IRRIGATION_EFFICIENCY,
  N_CREDIT_SHARE,
  N_PRICE_MAD_PER_KG,
  roundTo,
} = await load('/src/lib/assumptions.js');
const en = (await load('/src/i18n/en.js')).default;
const fr = (await load('/src/i18n/fr.js')).default;
const ar = (await load('/src/i18n/ar.js')).default;

const problems = [];
const dicts = { en, fr, ar };
const place = findPlace('beni-mellal');
const [climate, rain, soil, crops] = await Promise.all([
  loadClimate(place.dataKey),
  loadRainfall(place.dataKey),
  loadSoil(place.dataKey),
  loadCrops(place.dataKey),
]);
const lab = sampleLab();

const checkText = (value, path) => {
  if (typeof value !== 'string' || !value.trim()) problems.push(`${path}: empty`);
  else if (/undefined|NaN|\[object/.test(value)) problems.push(`${path}: broken text "${value}"`);
};

for (const [lang, t] of Object.entries(dicts)) {
  for (const useLab of [false, true]) {
    const result = buildAnalysis({
      t,
      lang,
      place,
      climate: climate.months,
      rain: rain.months,
      soil: soil.months,
      crops: crops.crops,
      lab: useLab ? lab : null,
    });
    const tag = `${lang}${useLab ? '+lab' : ''}`;

    if (result.year !== new Date().getFullYear()) problems.push(`${tag}: wrong year ${result.year}`);
    if (result.soil.length !== 7) problems.push(`${tag}: ${result.soil.length} soil values, expected 7`);
    if (result.climate.length !== 3) problems.push(`${tag}: ${result.climate.length} climate facts, expected 3`);
    if (result.crops.length !== 3) problems.push(`${tag}: ${result.crops.length} crops, expected 3`);
    if (result.actions.length < 1 || result.actions.length > 4) {
      problems.push(`${tag}: ${result.actions.length} actions, expected 1-4`);
    }
    if (result.soilSource !== (useLab ? 'lab' : 'regional')) problems.push(`${tag}: wrong soil source`);
    if (result.confidence.level !== (useLab ? 'medium' : 'low')) problems.push(`${tag}: wrong confidence`);

    for (const item of result.soil) {
      checkText(item.label, `${tag}.soil.${item.id}.label`);
      checkText(item.meaning, `${tag}.soil.${item.id}.meaning`);
      if (!['good', 'low', 'high'].includes(item.status)) problems.push(`${tag}.soil.${item.id}: bad status`);
      if (typeof item.value !== 'number') problems.push(`${tag}.soil.${item.id}: value is not a number`);
    }
    for (const item of result.climate) {
      checkText(item.label, `${tag}.climate.${item.id}.label`);
      checkText(item.unit, `${tag}.climate.${item.id}.unit`);
    }
    for (const crop of result.crops) {
      checkText(crop.name, `${tag}.crop.name`);
      checkText(crop.reason, `${tag}.crop.reason`);
      if (!['best', 'good', 'marginal'].includes(crop.fit)) problems.push(`${tag}.crop.${crop.crop}: bad fit`);
      if (!Array.isArray(crop.seasonMonths) || crop.seasonMonths.length !== 2) {
        problems.push(`${tag}.crop.${crop.crop}: missing seasonMonths`);
      }
    }
    for (const key of ['what', 'why', 'how', 'solution']) {
      checkText(result.fourQ[key], `${tag}.fourQ.${key}`);
    }
    for (const action of result.actions) {
      checkText(action.title, `${tag}.action.${action.id}.title`);
      checkText(action.detail, `${tag}.action.${action.id}.detail`);
      checkText(action.when, `${tag}.action.${action.id}.when`);
    }
    checkText(result.overall.headline, `${tag}.headline`);
    checkText(result.overall.summary, `${tag}.summary`);
    checkText(result.rotation.name, `${tag}.rotation.name`);
    checkText(result.rotation.summary, `${tag}.rotation.summary`);
    if (result.overall.score < 0 || result.overall.score > 100) problems.push(`${tag}: score out of range`);

    const water = result.water;
    if (!water || typeof water.netMm !== 'number') {
      problems.push(`${tag}.water: missing balance`);
    } else {
      if (water.effectiveRainMm > water.needMm) problems.push(`${tag}.water: effective rain exceeds crop need`);
      if (water.netMm > water.needMm) problems.push(`${tag}.water: net deficit exceeds crop need`);
      if (Math.abs(water.effectiveRainMm + water.netMm - water.needMm) > 1) {
        problems.push(`${tag}.water: need ≠ effective rain + net deficit`);
      }
      if (water.grossMm !== Math.round(water.netMm / IRRIGATION_EFFICIENCY)) {
        problems.push(`${tag}.water: gross mm does not use application efficiency`);
      }
      if (water.m3Ha !== roundTo(water.grossMm * 10, 10)) {
        problems.push(`${tag}.water: m³/ha conversion is wrong`);
      }
      if (water.effectiveRainShare !== EFFECTIVE_RAIN_SHARE) problems.push(`${tag}.water: wrong effective-rain share`);
      if (water.irrigationEfficiency !== IRRIGATION_EFFICIENCY) problems.push(`${tag}.water: wrong irrigation efficiency`);
      if (water.crop !== result.crops[0].crop) problems.push(`${tag}.water: not based on the first recommended crop`);
    }

    const rotation = result.rotation;
    const expectedCredit = Math.max(0, rotation.nitrogenKgHa - rotation.currentNitrogenKgHa) * N_CREDIT_SHARE;
    if (rotation.currentNitrogenKgHa < 0) problems.push(`${tag}.rotation: negative current nitrogen`);
    if (rotation.nitrogenCreditKg < 0) problems.push(`${tag}.rotation: negative nitrogen credit`);
    if (Math.abs(rotation.nitrogenCreditKg - expectedCredit) > 0.001) {
      problems.push(`${tag}.rotation: nitrogen credit does not use the current rotation baseline`);
    }
    if (rotation.nitrogenSavingsMad !== Math.round(rotation.nitrogenCreditKg * N_PRICE_MAD_PER_KG)) {
      problems.push(`${tag}.rotation: MAD savings are inconsistent with the credit`);
    }
  }
}

// Every study area must borrow a dataset and produce a bounded water balance.
const dataKeys = [...new Set(PLACES.map((area) => area.dataKey))];
const areaData = {};
for (const key of dataKeys) {
  const [areaClimate, areaRain, areaSoil, areaCrops] = await Promise.all([
    loadClimate(key),
    loadRainfall(key, 1),
    loadSoil(key),
    loadCrops(key),
  ]);
  areaData[key] = {
    climate: areaClimate.months,
    rain: areaRain.months,
    soil: areaSoil.months,
    crops: areaCrops.crops,
  };
}

for (const area of PLACES) {
  if (!area.dataKey) problems.push(`place ${area.id}: no dataKey`);
  const values = soilItemsFor(en, area, null);
  if (values.some((item) => typeof item.value !== 'number')) problems.push(`place ${area.id}: bad regional soil`);

  const result = buildAnalysis({
    t: en,
    lang: 'en',
    place: area,
    ...areaData[area.dataKey],
    lab: null,
  });
  const water = result.water;
  if (!water || ![water.needMm, water.seasonRainMm, water.effectiveRainMm, water.netMm, water.grossMm, water.m3Ha].every(Number.isFinite)) {
    problems.push(`place ${area.id}: incomplete water balance`);
  } else {
    if (water.effectiveRainMm > water.needMm || water.netMm > water.needMm) {
      problems.push(`place ${area.id}: water balance exceeds crop need`);
    }
    if (Math.abs(water.effectiveRainMm + water.netMm - water.needMm) > 1) {
      problems.push(`place ${area.id}: water balance does not add up`);
    }
    if (water.m3Ha !== roundTo(water.grossMm * 10, 10)) {
      problems.push(`place ${area.id}: m³/ha conversion is wrong`);
    }
  }
}

await server.close();

if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log(
  `Analysis valid in en/fr/ar, with and without a lab report: `
  + `7 soil values, 3 crops, 3 climate facts, 4 answers, ${PLACES.length} study areas.`,
);
