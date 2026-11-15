// Small geometry helpers used by the map and the supplier list.
const RAD = Math.PI / 180;

export function haversine(a, b) {
  const dLat = (b.lat - a.lat) * RAD;
  const dLon = (b.lon - a.lon) * RAD;
  const lat1 = a.lat * RAD;
  const lat2 = b.lat * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const km = (value) => (value < 1 ? 1 : Math.round(value));

export function sortByDistance(items, ref) {
  return items
    .map((item) => ({ ...item, distanceKm: haversine(ref, item) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

export function nearest(items, ref) {
  return sortByDistance(items, ref)[0] ?? null;
}

// Move a point by a distance in km. Used to draw the demonstration cells.
export function offsetPoint(lat, lon, northKm, eastKm) {
  const dLat = northKm / 111;
  const dLon = eastKm / (111 * Math.cos(lat * RAD));
  return { lat: lat + dLat, lon: lon + dLon };
}

export function squareBounds(lat, lon, sideKm) {
  const half = sideKm / 2;
  const nw = offsetPoint(lat, lon, half, -half);
  const se = offsetPoint(lat, lon, -half, half);
  return [[se.lat, nw.lon], [nw.lat, se.lon]];
}

// A deterministic pseudo-random number in [0,1). Same cell always gets the same colour,
// so the map does not flicker when the farmer switches layers.
export function cellNoise(lat, lon, salt = '') {
  const seed = `${lat.toFixed(3)}:${lon.toFixed(3)}:${salt}`;
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1000) / 1000;
}

// Square cells around the study area, in a 6 x 6 grid.
export function coverCells(lat, lon, count = 6, sideKm = 4) {
  const cells = [];
  const start = -((count - 1) / 2) * sideKm;
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      const north = start + (count - 1 - row) * sideKm;
      const east = start + col * sideKm;
      const { lat: cLat, lon: cLon } = offsetPoint(lat, lon, north, east);
      cells.push({ lat: cLat, lon: cLon, row, col, bounds: squareBounds(cLat, cLon, sideKm) });
    }
  }
  return cells;
}
