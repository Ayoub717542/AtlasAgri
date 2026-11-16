// Render smoke test: catches missing providers, bad data shapes and crashes in
// the main screens without needing a browser.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import React, { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

globalThis.localStorage = {
  _data: {},
  getItem(key) { return this._data[key] ?? null; },
  setItem(key, value) { this._data[key] = String(value); },
};
globalThis.document = { documentElement: {} };
globalThis.window = { addEventListener() {}, removeEventListener() {} };

const server = await createServer({
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const load = (path) => server.ssrLoadModule(path);
const { LangProvider } = await load('/src/i18n.jsx');
const { default: Landing } = await load('/src/pages/Landing.jsx');
const { default: FarmTab } = await load('/src/components/FarmTab.jsx');
const { default: CropsTab } = await load('/src/components/CropsTab.jsx');
const { default: RotationsTab } = await load('/src/components/RotationsTab.jsx');
const { default: SuppliersTab } = await load('/src/components/SuppliersTab.jsx');
const { default: ConditionsTab } = await load('/src/components/ConditionsTab.jsx');
const { default: Chatbot } = await load('/src/components/Chatbot.jsx');
const { findPlace } = await load('/src/lib/places.js');
const { loadCrops, loadForecast, suppliersFor } = await load('/src/lib/api.js');

const place = findPlace('beni-mellal');
const crops = await loadCrops(place.dataKey);
const suppliers = suppliersFor(place, 120);
const forecast = { status: 'ok', data: await loadForecast(place.dataKey) };
const loading = { status: 'loading' };
const noop = () => {};
const hrefFor = () => '#/dashboard/map';

const cases = [
  ['Landing (en)', 'en', h(Landing), ['Know your land before you sow', 'Use my location', 'Open the farm map']],
  ['Landing (ar)', 'ar', h(Landing), ['اعرف أرضك', 'استعمل موقعي']],
  ['Farm (en)', 'en', h(FarmTab, {
    place, data: { climate: loading, rain: loading, soil: loading, crops: loading },
    retries: { rain: noop }, hrefFor, lab: null, setLab: noop,
  }), ['Understand what your land needs', 'Soil laboratory report', 'Soil health in plain words']],
  ['Farm (fr)', 'fr', h(FarmTab, {
    place, data: { climate: loading, rain: loading, soil: loading, crops: loading },
    retries: { rain: noop }, hrefFor, lab: null, setLab: noop,
  }), ['Comprendre', 'Analyse de sol du laboratoire']],
  ['Weather (en)', 'en', h(ConditionsTab, { climate: loading, rain: loading, soil: loading, forecast, retryRain: noop, retryForecast: noop }),
    ['Today, this week and next week', 'How these levels are set', 'How hot it gets, month by month', 'Three things that matter this year']],
  ['Weather (ar)', 'ar', h(ConditionsTab, { climate: loading, rain: loading, soil: loading, forecast, retryRain: noop, retryForecast: noop }),
    ['اليوم، هذا الأسبوع والأسبوع القادم', 'كيف تُحدَّد هذه المستويات']],
  ['Crops (en)', 'en', h(CropsTab, { state: { status: 'ok', data: crops }, place: 'Béni Mellal', rainTotal: 280 }),
    ['Crops that suit this land', 'Durum wheat']],
  ['Rotations (en)', 'en', h(RotationsTab, { place }), ['See your options side by side', 'Compare the three rotations']],
  ['Suppliers (en)', 'en', h(SuppliersTab, { suppliers, hrefFor }), ['Names, addresses and hours are invented']],
  ['Chatbot (en)', 'en', h(Chatbot, { context: { place: 'Béni Mellal' } }), ['Ask a question']],
];

let failed = 0;
for (const [label, lang, element, needles] of cases) {
  localStorage._data['atlasagri-lang'] = lang;
  let html;
  try {
    html = renderToString(h(LangProvider, null, element));
  } catch (error) {
    failed++;
    console.log('FAIL', label, '-', error.message);
    continue;
  }
  const missing = needles.filter((needle) => !html.includes(needle));
  if (missing.length) {
    failed++;
    console.log('FAIL', label, '- missing:', missing.join(', '));
  } else {
    console.log('ok  ', label, `(${html.length} chars)`);
  }
}

await server.close();
if (failed) {
  console.log(`${failed} smoke test(s) failed`);
  process.exit(1);
}
console.log('all smoke tests passed');
