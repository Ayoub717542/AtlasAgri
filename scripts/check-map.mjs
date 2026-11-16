// Verifies that every map layer uses its dataset's native grid geometry and
// that no layer subdivides a cell into a finer resolution.
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
const { gridBounds, haversine } = await load('/src/lib/geo.js');
const { LAYERS, layerCells } = await load('/src/lib/layers.js');
const { layerValuesByRegion } = await load('/src/lib/api.js');
const { PLACES } = await load('/src/lib/places.js');

const problems = [];
const valuesByRegion = layerValuesByRegion();
const near = (value, target, tolerance) => Math.abs(value - target) <= tolerance;
const inside = (lat, lon, bounds) => {
  const [[south, west], [north, east]] = bounds;
  return lat >= south && lat <= north && lon >= west && lon <= east;
};

for (const layer of LAYERS) {
  const cells = layerCells(layer, PLACES, valuesByRegion, PLACES[0].id);
  if (!cells.length) problems.push(`${layer.id}: no cells`);

  for (const place of PLACES) {
    const bounds = gridBounds(layer.grid, place.lat, place.lon);
    const [[south, west], [north, east]] = bounds;
    const latSpan = north - south;
    const lonSpan = east - west;

    if (!inside(place.lat, place.lon, bounds)) {
      problems.push(`${layer.id}/${place.id}: point is outside its cell`);
    }
    if (!Number.isFinite(latSpan) || !Number.isFinite(lonSpan) || latSpan <= 0 || lonSpan <= 0) {
      problems.push(`${layer.id}/${place.id}: invalid cell bounds`);
      continue;
    }

    if (layer.grid === 'gpm' && (!near(latSpan, 0.1, 1e-9) || !near(lonSpan, 0.1, 1e-9))) {
      problems.push(`${layer.id}/${place.id}: GPM cell is not 0.1°`);
    }
    if (layer.grid === 'power' && (!near(latSpan, 0.5, 1e-9) || !near(lonSpan, 0.625, 1e-9))) {
      problems.push(`${layer.id}/${place.id}: NASA POWER cell is not 0.5° x 0.625°`);
    }
    if (layer.grid === 'gaez' && (!near(latSpan, 1 / 120, 1e-9) || !near(lonSpan, 1 / 120, 1e-9))) {
      problems.push(`${layer.id}/${place.id}: GAEZ cell is not 30 arc-seconds`);
    }
    if (layer.grid === 'smap') {
      const widthKm = haversine({ lat: south, lon: west }, { lat: south, lon: east });
      const heightKm = haversine({ lat: south, lon: west }, { lat: north, lon: west });
      if (widthKm < 8.5 || widthKm > 9.5 || heightKm < 8.5 || heightKm > 9.5) {
        problems.push(`${layer.id}/${place.id}: SMAP cell is not about 9 km (${widthKm.toFixed(2)} x ${heightKm.toFixed(2)} km)`);
      }
      const area = widthKm * heightKm;
      if (area < 78 || area > 84) {
        problems.push(`${layer.id}/${place.id}: SMAP cell area is not about 81 km² (${area.toFixed(2)})`);
      }
    }
  }

  // The selected area must be coloured with its own regional dataset value.
  const selected = cells.find((cell) => cell.selected);
  if (!selected) {
    problems.push(`${layer.id}: no selected cell`);
  } else {
    const expected = valuesByRegion[PLACES[0].dataKey]?.[layer.metric];
    if (expected !== undefined && selected.value !== expected) {
      problems.push(`${layer.id}: selected cell shows ${selected.value}, expected ${expected}`);
    }
  }
}

await server.close();
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Map layers valid: ${LAYERS.length} native grids, ${PLACES.length} demonstration areas, no cell subdivision.`);
