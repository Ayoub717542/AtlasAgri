export const CURRENT_YEAR = new Date().getFullYear();

export const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const monthIndex = (iso) => Number(iso.slice(5, 7)) - 1;
export const monthLabel = (iso) => MONTH[monthIndex(iso)];

export const sum = (arr, key) => (arr ?? []).reduce((s, x) => s + (x[key] ?? 0), 0);
export const mean = (arr, key) => {
  const values = (arr ?? []).map((x) => x[key]).filter((v) => typeof v === 'number');
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0;
};
export const maxBy = (arr, key) => (arr ?? []).reduce((best, x) => (x[key] > (best?.[key] ?? -Infinity) ? x : best), null);
export const minBy = (arr, key) => (arr ?? []).reduce((best, x) => (x[key] < (best?.[key] ?? Infinity) ? x : best), null);
export const fmt = (n, digits = 0) => Number(n).toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const pct = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

// The demo JSON files carry a placeholder year. The interface always shows the current year.
export const withCurrentYear = (months) => (months ?? []).map((m) => ({
  ...m,
  month: `${CURRENT_YEAR}-${String(m.month).slice(5, 7)}`,
}));

// Grid cell (as Leaflet bounds) that contains the point, for each dataset
export function gridCells(lat, lon) {
  const powerLat = Math.round(lat / 0.5) * 0.5;
  const powerLon = Math.round(lon / 0.625) * 0.625;
  const gLat = Math.floor(lat * 10) / 10;
  const gLon = Math.floor(lon * 10) / 10;
  const sHalfLat = 4.5 / 111;
  const sHalfLon = 4.5 / (111 * Math.cos((lat * Math.PI) / 180));
  const fLat = Math.floor(lat * 120) / 120;
  const fLon = Math.floor(lon * 120) / 120;
  return {
    power: [[powerLat - 0.25, powerLon - 0.3125], [powerLat + 0.25, powerLon + 0.3125]],
    gpm: [[gLat, gLon], [gLat + 0.1, gLon + 0.1]],
    smap: [[lat - sHalfLat, lon - sHalfLon], [lat + sHalfLat, lon + sHalfLon]],
    gaez: [[fLat, fLon], [fLat + 1 / 120, fLon + 1 / 120]],
  };
}
