// Mock data layer. Behaves like a real API (delays, one recoverable failure)
// but reads local JSON. Nothing here calls NASA or any server.
import power from '../data/nasa-power.json';
import gpm from '../data/gpm-imerg.json';
import smap from '../data/smap.json';
import gaez from '../data/gaez.json';
import rotations from '../data/rotations.json';
import cropDetails from '../data/crop-details.json';
import supplierData from '../data/suppliers.json';
import { withCurrentYear, CURRENT_YEAR } from './format';
import { haversine } from './geo';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const meta = ({ locations: _l, crops: _c, ...rest }) => rest;

const cropById = Object.fromEntries(gaez.crops.map((c) => [c.id, c]));

export const SAMPLE_PDF = '/soil-report-beni-mellal.pdf';
export const DATA_YEAR = CURRENT_YEAR;

export const cropInfo = (id) => cropById[id];
export const cropDetail = (id) => cropDetails[id] ?? null;

export async function loadClimate(dataKey) {
  await wait(650);
  return { meta: meta(power), months: withCurrentYear(power.locations[dataKey]) };
}

// Errachidia fails on the first try, so the error and retry states are real.
export async function loadRainfall(dataKey, attempt = 0) {
  await wait(900);
  if (dataKey === 'errachidia' && attempt === 0) throw new Error('errRain');
  return { meta: meta(gpm), months: withCurrentYear(gpm.locations[dataKey]) };
}

export async function loadSoil(dataKey) {
  await wait(1100);
  return { meta: meta(smap), months: withCurrentYear(smap.locations[dataKey]) };
}

export async function loadCrops(dataKey) {
  await wait(800);
  return {
    meta: meta(gaez),
    crops: gaez.locations[dataKey].map((row) => {
      const crop = cropById[row.crop];
      return {
        ...crop,
        ...row,
        family: crop.family,
        waterMm: crop.waterMm,
        season: crop.season,
        seasonAr: crop.seasonAr,
        seasonFr: crop.seasonFr,
        nameAr: crop.nameAr,
        nameFr: crop.nameFr,
        detail: cropDetails[row.crop] ?? null,
      };
    }),
  };
}

export async function compareRotations(profileId) {
  await wait(1200);
  const { note, note_ar, note_fr, units } = rotations;
  return { note, note_ar, note_fr, units, ...rotations.profiles[profileId] };
}

// Demonstration suppliers sorted by distance from the chosen study area.
export function suppliersFor(place, radiusKm = 80) {
  return supplierData.suppliers
    .map((s) => ({ ...s, distanceKm: haversine(place, s) }))
    .filter((s) => s.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export const SUPPLIER_CATEGORIES = ['seeds', 'fertilizer', 'irrigation', 'supplies', 'services'];

// Simulated analysis run: five visible stages, about ten seconds in total.
// It returns no analysis object on purpose. The screen builds the result from
// the data it already loaded, so changing language updates the text instantly.
export async function analyzeFarm(onStep) {
  for (let step = 0; step < 5; step++) {
    onStep(step);
    await wait(2000);
  }
  return { ok: true, completedAt: new Date().toISOString(), simulated: true };
}
