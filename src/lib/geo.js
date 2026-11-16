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

// ---------------------------------------------------------------------------
// Native grid geometry for the map layers.
//
// Each layer is drawn with the real grid of its source dataset:
//   gpm   GPM IMERG Final V07, 0.1 deg x 0.1 deg
//   power NASA POWER, 0.5 deg x 0.625 deg
//   gaez  FAO GAEZ v5, 30 arc-seconds (1/120 deg)
//   smap  SMAP L4 9 km EASE-Grid 2.0, 9008.055 m cylindrical equal-area cells
//
// Only the cell that contains the point is returned. No cell is subdivided.
// ---------------------------------------------------------------------------

// EASE-Grid 2.0 global 9 km parameters (NSIDC EASE2_M09km.gpd).
const EASE2 = {
  a: 6378137.0,
  e: 0.081819190843,
  latTs: 30 * RAD,
  xOrigin: -17367530.4451615,
  yOrigin: 7314540.8306386,
  cell: 9008.055210146,
};

const EASE2_K0 = Math.cos(EASE2.latTs)
  / Math.sqrt(1 - EASE2.e ** 2 * Math.sin(EASE2.latTs) ** 2);

// Authalic latitude integral q(phi) used by the ellipsoidal cylindrical
// equal-area projection. q(90) is the pole value.
function authalicQ(phi) {
  const e = EASE2.e;
  const e2 = e * e;
  const s = Math.sin(phi);
  return (1 - e2) * (
    s / (1 - e2 * s * s)
    + (1 / (2 * e)) * Math.log((1 + e * s) / (1 - e * s))
  );
}

const EASE2_QP = authalicQ(Math.PI / 2);

// Solve q(phi) = target by Newton iteration. The initial guess is the
// authalic latitude, which is already very close for WGS84.
function authalicQInverse(target) {
  const e2 = EASE2.e ** 2;
  let phi = Math.asin(Math.max(-1, Math.min(1, target / EASE2_QP)));
  for (let i = 0; i < 6; i++) {
    const s = Math.sin(phi);
    const dq = (2 * (1 - e2) * Math.cos(phi)) / (1 - e2 * s * s) ** 2;
    if (!Number.isFinite(dq) || dq === 0) break;
    phi -= (authalicQ(phi) - target) / dq;
  }
  return phi;
}

function ease2Forward(lat, lon) {
  return {
    x: EASE2.a * EASE2_K0 * (lon * RAD),
    y: (EASE2.a * authalicQ(lat * RAD)) / (2 * EASE2_K0),
  };
}

function ease2Inverse(x, y) {
  return {
    lon: (x / (EASE2.a * EASE2_K0)) / RAD,
    lat: authalicQInverse((2 * EASE2_K0 * y) / EASE2.a) / RAD,
  };
}

const floorTo = (value, step) => Math.floor(value / step) * step;

// Leaflet bounds [[south, west], [north, east]] for the native grid cell that
// contains the point. The cell size is fixed by the dataset, never by the map.
export function gridBounds(grid, lat, lon) {
  if (grid === 'power') {
    const south = floorTo(lat, 0.5);
    const west = floorTo(lon, 0.625);
    return [[south, west], [south + 0.5, west + 0.625]];
  }

  if (grid === 'gaez') {
    const step = 1 / 120;
    const south = floorTo(lat, step);
    const west = floorTo(lon, step);
    return [[south, west], [south + step, west + step]];
  }

  if (grid === 'smap') {
    const { x, y } = ease2Forward(lat, lon);
    const col = Math.floor((x - EASE2.xOrigin) / EASE2.cell);
    const row = Math.floor((EASE2.yOrigin - y) / EASE2.cell);
    const xMin = EASE2.xOrigin + col * EASE2.cell;
    const xMax = xMin + EASE2.cell;
    const yMax = EASE2.yOrigin - row * EASE2.cell;
    const yMin = yMax - EASE2.cell;
    const sw = ease2Inverse(xMin, yMin);
    const ne = ease2Inverse(xMax, yMax);
    return [[sw.lat, sw.lon], [ne.lat, ne.lon]];
  }

  // GPM IMERG is 0.1 deg x 0.1 deg and is also the safe fallback.
  const south = floorTo(lat, 0.1);
  const west = floorTo(lon, 0.1);
  return [[south, west], [south + 0.1, west + 0.1]];
}
