import { gridBounds } from './geo';

// Demonstration climate layers.
//
// Each layer is drawn with the native grid of its source dataset and one real
// dataset value per demonstration region. The values are simulated samples in
// the shape of NASA POWER, GPM IMERG, SMAP and FAO GAEZ records. They are not
// live measurements, and no finer grid is invented by subdividing a cell.
export const LAYERS = [
  {
    id: 'rain',
    icon: 'drop',
    label: 'layerRain',
    sub: 'layerRainSub',
    unit: 'legendUnitRain',
    metric: 'rain',
    grid: 'gpm',
    source: 'NASA GPM IMERG Final V07',
    resolution: '0.1° × 0.1° (about 10 km)',
    decimals: 0,
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
    grid: 'power',
    source: 'NASA POWER',
    resolution: '0.5° × 0.625° (about 50 km)',
    decimals: 0,
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
    grid: 'smap',
    source: 'NASA SMAP L4 SPL4SMGP.008',
    resolution: '9 km EASE-Grid 2.0 (9,008 m)',
    decimals: 0,
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
    grid: 'gaez',
    source: 'FAO GAEZ v5',
    resolution: '30 arc-seconds (about 1 km)',
    decimals: 0,
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

const boundsKey = (bounds) => bounds.flat().map((v) => v.toFixed(5)).join('|');

// One native grid cell per demonstration area. Areas in the same region share
// the same regional value, so overlapping cells are collapsed to one rectangle.
export function layerCells(layer, places, valuesByRegion, selectedId) {
  const cells = new Map();
  for (const place of places ?? []) {
    const values = valuesByRegion?.[place.dataKey] ?? {};
    const raw = values[layer.metric];
    const value = typeof raw === 'number' ? raw : valueForLayer(layer, null);
    const bounds = gridBounds(layer.grid, place.lat, place.lon);
    const key = boundsKey(bounds);
    const cell = {
      key,
      bounds,
      value: Math.round(value * 10 ** layer.decimals) / 10 ** layer.decimals,
      color: layer.colors[bandIndex(value, layer.breaks)],
      selected: place.id === selectedId,
    };
    const existing = cells.get(key);
    if (!existing) cells.set(key, cell);
    else if (cell.selected) cells.set(key, { ...existing, selected: true });
  }
  return [...cells.values()];
}

export function legendBands(layer, unitLabel, labels) {
  return layer.colors.map((color, i) => {
    const from = layer.breaks[i];
    const to = layer.breaks[i + 1];
    const label = !Number.isFinite(to)
      ? `> ${from}`
      : i === 0
        ? `< ${to}`
        : `${from}–${to}`;
    return { color, label: labels?.[i] ?? `${label} ${unitLabel}`.trim(), from, to };
  });
}
