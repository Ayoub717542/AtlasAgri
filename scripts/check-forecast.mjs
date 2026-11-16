// Checks the simulated 14-day forecast: shape, determinism, threshold bands
// and that the weekly split really is days 1–7 and days 8–14.
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
const {
  buildForecast, summarizeForecast, heatLevel, waterLevel, rainLevel, FORECAST_DAYS,
} = await load('/src/lib/forecast.js');
const { loadClimate, loadRainfall, loadSoil } = await load('/src/lib/api.js');

const problems = [];
const keys = ['beni-mellal', 'meknes', 'settat', 'marrakech', 'errachidia'];
const startDate = new Date('2026-11-15T00:00:00Z');

for (const key of keys) {
  const [climate, rain, soil] = await Promise.all([
    loadClimate(key),
    loadRainfall(key, 1),
    loadSoil(key),
  ]);
  const args = {
    dataKey: key,
    climateMonths: climate.months,
    rainMonths: rain.months,
    soilMonths: soil.months,
    startDate,
  };
  const forecast = buildForecast(args);
  const again = buildForecast(args);

  if (forecast.days.length !== FORECAST_DAYS) {
    problems.push(`${key}: expected ${FORECAST_DAYS} days, got ${forecast.days.length}`);
  }
  if (JSON.stringify(forecast) !== JSON.stringify(again)) {
    problems.push(`${key}: forecast is not deterministic`);
  }

  const summary = summarizeForecast(forecast.days);
  if (summary.thisWeek.length !== 7 || summary.nextWeek.length !== 7) {
    problems.push(`${key}: week split is not 7 + 7`);
  }

  const weekSum = forecast.days.slice(0, 7).reduce((s, d) => s + d.precip, 0);
  const nextSum = forecast.days.slice(7, 14).reduce((s, d) => s + d.precip, 0);
  if (summary.weekRain !== Math.round(weekSum)) {
    problems.push(`${key}: this-week rain does not match days 1–7`);
  }
  if (summary.nextRain !== Math.round(nextSum)) {
    problems.push(`${key}: next-week rain does not match days 8–14`);
  }
  if (summary.peak !== Math.max(...forecast.days.slice(0, 7).map((d) => d.t2mMax))) {
    problems.push(`${key}: peak heat does not match this week`);
  }

  for (const day of forecast.days) {
    const month = climate.months[day.month] ?? {};
    if (!Number.isFinite(day.t2mMax) || !Number.isFinite(day.t2mMin)) {
      problems.push(`${key}/${day.date}: temperature is not a number`);
    }
    if (day.t2mMax < day.t2mMin) {
      problems.push(`${key}/${day.date}: max is below min`);
    }
    if (typeof month.t2mMax === 'number' && Math.abs(day.t2mMax - month.t2mMax) > 8) {
      problems.push(`${key}/${day.date}: daily max is too far from the month record`);
    }
    if (!Number.isFinite(day.precip) || day.precip < 0) {
      problems.push(`${key}/${day.date}: invalid rain`);
    }
    if (day.soilPct < 2 || day.soilPct > 45) {
      problems.push(`${key}/${day.date}: soil water out of range (${day.soilPct})`);
    }
  }

  if (summary.heat !== heatLevel(summary.peak)) problems.push(`${key}: heat level mismatch`);
  if (summary.water !== waterLevel(summary.soilNow, summary.weekRain)) problems.push(`${key}: water level mismatch`);
  if (summary.rain !== rainLevel(summary.nextRain)) problems.push(`${key}: rain level mismatch`);
}

// Threshold boundaries.
const boundaries = [
  [heatLevel(27.9), 'low', 'heat 27.9'],
  [heatLevel(28), 'moderate', 'heat 28'],
  [heatLevel(34.9), 'moderate', 'heat 34.9'],
  [heatLevel(35), 'high', 'heat 35'],
  [heatLevel(39.9), 'high', 'heat 39.9'],
  [heatLevel(40), 'veryHigh', 'heat 40'],
  [rainLevel(4.9), 'low', 'rain 4.9'],
  [rainLevel(5), 'moderate', 'rain 5'],
  [rainLevel(20), 'moderate', 'rain 20'],
  [rainLevel(20.1), 'high', 'rain 20.1'],
  [waterLevel(20, 0), 'low', 'water 20/0'],
  [waterLevel(15, 5), 'low', 'water 15/5'],
  [waterLevel(15, 4.9), 'moderate', 'water 15/4.9'],
  [waterLevel(10, 0), 'moderate', 'water 10/0'],
  [waterLevel(0, 5), 'moderate', 'water 0/5'],
  [waterLevel(9.9, 4.9), 'high', 'water 9.9/4.9'],
];
for (const [got, want, label] of boundaries) {
  if (got !== want) problems.push(`threshold ${label}: got ${got}, want ${want}`);
}

await server.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Forecast valid: ${keys.length} regions, ${FORECAST_DAYS} days, 7 + 7 split, deterministic, thresholds checked.`);
