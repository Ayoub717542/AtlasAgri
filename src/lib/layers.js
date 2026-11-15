import { coverCells, cellNoise } from './geo';

// Demonstration climate layers. The values are derived from the regional demo
// record and varied cell by cell with a deterministic pattern: it looks like a
// climate surface without pretending to be a measurement.
export const LAYERS = [
  {
    id: 'rain',
    icon: 'drop',
    label: 'layerRain',
    sub: 'layerRainSub',
    unit: 'legendUnitRain',
    metric: 'rain',
    decimals: 0,
    clamp: [0, 900],
    jitter: 0.11,
    breaks: [0, 150, 300, 450, 600, Infinity],
    colors: ['#E6F0F6', '#BFD9E8', '#87B7D3', '#4A90B8', '#1F6FA8'],
  },
  {
    id: 'temp',
    icon: 'thermometer',
    label: 'layerTemp',
    sub: 'layerTempSub',
    unit: 'legendUnitTemp',
    metric: 'temp',
    decimals: 0,
    clamp: [0, 50],
    jitter: 2.2,
    breaks: [0, 15, 20, 25, 30, 60],
    colors: ['#FDF0D8', '#F7D9A3', '#E9B36B', '#CE8438', '#A3412A'],
  },
  {
    id: 'soil',
    icon: 'soil',
    label: 'layerSoil',
    sub: 'layerSoilSub',
    unit: 'legendUnitSoil',
    metric: 'soil',
    decimals: 0,
    clamp: [0, 100],
    jitter: 0.28,
    breaks: [0, 5, 10, 15, 25, 100],
    colors: ['#F0EFE8', '#D7E4C8', '#B4CF9B', '#7FAE72', '#3E7C48'],
  },
  {
    id: 'crop',
    icon: 'sprout',
    label: 'layerCrop',
    sub: 'layerCropSub',
    unit: 'legendUnitCrop',
    metric: 'crop',
    decimals: 0,
    clamp: [0, 100],
    jitter: 9,
    breaks: [0, 20, 40, 60, 80, 100],
    colors: ['#F1F1EC', '#D9E4C9', '#B7CE9C', '#86AD6C', '#2F6B3B'],
  },
];

export const layerById = (id) => LAYERS.find((l) => l.id === id) ?? LAYERS[0];

export function valueForLayer(layer, metrics) {
  const value = metrics?.[layer.metric];
  if (typeof value === 'number') return value;
  return { rain: 300, temp: 24, soil: 14, crop: 60 }[layer.metric];
}

export function bandIndex(value, breaks) {
  for (let i = 0; i < breaks.length - 1; i++) {
    if (value < breaks[i + 1]) return i;
  }
  return breaks.length - 2;
}

export function cellValue(layer, base, cell) {
  const noise = cellNoise(cell.lat, cell.lon, layer.id) * 2 - 1; // -1 … 1
  let value;
  if (layer.metric === 'temp' || layer.metric === 'crop') {
    value = base + noise * layer.jitter;
  } else {
    value = base * (1 + noise * layer.jitter);
  }
  return Math.max(layer.clamp[0], Math.min(layer.clamp[1], value));
}

export function layerCells(layer, center, metrics, options = {}) {
  const base = valueForLayer(layer, metrics);
  return coverCells(center.lat, center.lon, options.count ?? 6, options.sideKm ?? 4)
    .map((cell) => {
      const value = cellValue(layer, base, cell);
      return {
        ...cell,
        value: Math.round(value * 10 ** layer.decimals) / 10 ** layer.decimals,
        color: layer.colors[bandIndex(value, layer.breaks)],
      };
    });
}

export function legendBands(layer, unitLabel) {
  return layer.colors.map((color, i) => {
    const from = layer.breaks[i];
    const to = layer.breaks[i + 1];
    const label = !Number.isFinite(to)
      ? `> ${from}`
      : i === 0
        ? `< ${to}`
        : `${from}–${to}`;
    return { color, label: `${label} ${unitLabel}`.trim(), from, to };
  });
}

// Average of a numeric field over the current-year months, ignoring gaps.
export function average(months, key) {
  const values = (months ?? []).map((m) => m[key]).filter((v) => typeof v === 'number');
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
}
