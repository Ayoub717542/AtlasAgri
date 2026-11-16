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

