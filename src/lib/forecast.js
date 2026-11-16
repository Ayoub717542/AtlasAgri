// Simulated 14-day forecast for the Weather tab.
//
// This is not a weather service. The daily values are generated from the same
// demonstration monthly records the rest of the app loads, so the outlook is
// internally consistent and reproducible: the same region and the same day
// always produce the same forecast. Nothing here calls a forecast API.

import { sum } from './format';

export const FORECAST_DAYS = 14;
export const THIS_WEEK_DAYS = 7;

// Heat is the peak afternoon temperature during this week.
// Low < 28 °C, Moderate 28–34 °C, High 35–39 °C, Very high >= 40 °C.
export function heatLevel(peakC) {
  if (peakC < 28) return 'low';
  if (peakC < 35) return 'moderate';
  if (peakC < 40) return 'high';
  return 'veryHigh';
}

// Water pressure combines the current root-zone soil water with this week's
// rain. Low pressure means the crop has enough water; high means it is dry.
// Low: soil >= 20%, or soil >= 15% with at least 5 mm rain this week.
// Moderate: soil >= 10%, or at least 5 mm rain this week.
// High: below both.
export function waterLevel(soilPct, weekRainMm) {
  if (soilPct >= 20 || (soilPct >= 15 && weekRainMm >= 5)) return 'low';
  if (soilPct >= 10 || weekRainMm >= 5) return 'moderate';
  return 'high';
}

// Rain next week. Low < 5 mm, Moderate 5–20 mm, High > 20 mm.
export function rainLevel(mm) {
  if (mm < 5) return 'low';
  if (mm <= 20) return 'moderate';
  return 'high';
}

// Deterministic 0–1 hash so the outlook never flickers between renders.
function seedFrom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function buildForecast({
  dataKey,
  climateMonths,
  rainMonths,
  soilMonths,
  startDate = new Date(),
}) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const base = seedFrom(dataKey);
  const days = [];

  for (let i = 0; i < FORECAST_DAYS; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const month = date.getMonth();
    const climate = climateMonths?.[month] ?? {};
    const rain = rainMonths?.[month] ?? {};
    const soil = soilMonths?.[month] ?? {};

    const tempNoise = seedFrom(`${dataKey}:temp:${i}`);
    const rainNoise = seedFrom(`${dataKey}:rain:${i}`);
    const soilNoise = seedFrom(`${dataKey}:soil:${i}`);

    // A slow wave keeps day-to-day changes smooth instead of random-looking.
    const wave = Math.sin((i + base * 9) * (2 * Math.PI / 9));
    const t2mMax = Math.round((climate.t2mMax ?? 26) + wave * 2.4 + (tempNoise - 0.5) * 2.2);
    const t2mMin = Math.round((climate.t2mMin ?? 12) + wave * 1.3 + (tempNoise - 0.5) * 1.4);

    // Rain chance and amount both follow the month's demonstration total.
    const monthlyRain = rain.precip ?? 30;
    const chance = clamp(monthlyRain / 120, 0.04, 0.5);
    const wet = rainNoise < chance;
    const dailyMean = monthlyRain / 30;
    const precip = wet ? Math.max(1, Math.round(dailyMean * (1.4 + tempNoise * 2.2))) : 0;

    // Soil water starts from the month's root-zone value and reacts to rain.
    const baseSoil = typeof soil.rootzone === 'number' ? soil.rootzone * 100 : 14;
    const soilPct = Math.round(clamp(baseSoil + (precip > 0 ? 1 : -0.5) * (soilNoise - 0.5) * 4, 2, 45));

    days.push({
      index: i,
      date: date.toISOString().slice(0, 10),
      dayOfWeek: date.getDay(),
      month,
      t2mMax,
      t2mMin,
      precip,
      soilPct,
    });
  }

  return {
    meta: {
      simulated: true,
      days: FORECAST_DAYS,
      generatedFor: dataKey,
    },
    days,
  };
}

export function summarizeForecast(days) {
  const thisWeek = days.slice(0, THIS_WEEK_DAYS);
  const nextWeek = days.slice(THIS_WEEK_DAYS, FORECAST_DAYS);
  const today = days[0] ?? null;

  const peak = thisWeek.length ? Math.max(...thisWeek.map((d) => d.t2mMax)) : 0;
  const soilNow = today?.soilPct ?? 0;
  const weekRain = Math.round(sum(thisWeek, 'precip'));
  const nextRain = Math.round(sum(nextWeek, 'precip'));

  return {
    today,
    thisWeek,
    nextWeek,
    peak,
    soilNow,
    weekRain,
    nextRain,
    heat: heatLevel(peak),
    water: waterLevel(soilNow, weekRain),
    rain: rainLevel(nextRain),
  };
}
