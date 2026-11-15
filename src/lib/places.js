import locations from '../data/locations.json';
import areas from '../data/study-areas.json';
import { haversine, sortByDistance } from './geo';

// Study areas are demonstration agricultural zones. Each one borrows the climate
// record of its region (the five base locations used by the sample datasets).
const baseById = Object.fromEntries(locations.map((l) => [l.id, l]));

export const PLACES = areas.map((a) => {
  const base = baseById[a.regionId];
  return {
    ...a,
    kind: 'study-area',
    dataKey: base.id,
    region: base.region,
    regionAr: base.regionAr,
    regionFr: base.regionFr,
    area: base.area,
    areaAr: base.areaAr,
    areaFr: base.areaFr,
    baseName: base.name,
    baseNameAr: base.nameAr,
  };
});

export const placeName = (place, lang) => {
  if (!place) return '';
  if (lang === 'ar') return place.nameAr ?? place.name;
  if (lang === 'fr') return place.nameFr ?? place.name;
  return place.name;
};

export const placeRegion = (place, lang) => {
  if (!place) return '';
  if (lang === 'ar') return place.regionAr ?? place.region;
  if (lang === 'fr') return place.regionFr ?? place.region;
  return place.region;
};

export const placeArea = (place, lang) => {
  if (!place) return '';
  if (lang === 'ar') return place.areaAr ?? place.area;
  if (lang === 'fr') return place.areaFr ?? place.area;
  return place.area;
};

export const getPlaces = () => PLACES;

export function defaultPlace() {
  return PLACES.find((p) => p.id === 'ouled-ayad') ?? PLACES[0];
}

// Accepts a study-area id, or a legacy base-location id such as "beni-mellal".
export function findPlace(id) {
  const direct = PLACES.find((p) => p.id === id);
  if (direct) return direct;
  const base = baseById[id];
  if (base) {
    const inRegion = PLACES.filter((p) => p.regionId === base.id);
    if (inRegion.length) {
      return sortByDistance(inRegion, { lat: base.lat, lon: base.lon })[0];
    }
  }
  return defaultPlace();
}

export function nearbyPlaces(place, radiusKm = 80) {
  return sortByDistance(PLACES.filter((p) => p.id !== place.id), place)
    .filter((p) => p.distanceKm <= radiusKm);
}

// The study area closest to an arbitrary point chosen on the map.
export function nearestPlace(point) {
  return sortByDistance(PLACES, point)[0];
}

export const distanceBetween = haversine;

export const typeLabelKey = (place) => ({
  irrigated: 'areaIrrigated',
  rainfed: 'areaRainfed',
  oasis: 'areaOasis',
}[place?.type] ?? 'areaIrrigated');

export const groupByRegion = (places = PLACES) => locations
  .map((base) => ({
    base,
    places: places.filter((p) => p.regionId === base.id),
  }))
  .filter((g) => g.places.length > 0);
