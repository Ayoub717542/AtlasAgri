// Browser checks against the Vite dev server through the Chrome DevTools Protocol.
// Start Edge/Chrome with:
//   msedge.exe --headless=new --remote-debugging-port=9222 --user-data-dir=<temp> http://127.0.0.1:5173
// Then run: node scripts/e2e-check.mjs
const TARGET = 'http://127.0.0.1:9222';
const APP = 'http://127.0.0.1:5173';

const targets = await (await fetch(`${TARGET}/json`)).json();
const page = targets.find((t) => t.type === 'page' && t.url.startsWith(APP));
if (!page) throw new Error('No app page found. Is the dev server and remote debugging running?');

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let nextId = 0;
const pending = new Map();
const exceptions = [];
const consoleErrors = [];

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push(msg.params.exceptionDetails?.exception?.description ?? msg.params.exceptionDetails?.text ?? 'exception');
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
  }
};

function send(method, params = {}) {
  const id = ++nextId;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const res = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: true,
  });
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
  }
  return res.result.value;
}

const wait = (ms) => evaluate(`new Promise((r) => setTimeout(r, ${ms}))`);

function check(name, cond, detail = '') {
  if (cond) {
    console.log('ok  ', name, detail);
  } else {
    console.log('FAIL', name, detail);
    process.exitCode = 1;
  }
}

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');

// Start from a known language, whatever the previous run stored.
await evaluate("localStorage.setItem('atlasagri-lang', 'en')");
await send('Page.reload');
await wait(1100);

// 1. Landing page, English
await evaluate("location.hash = '#/'");
await wait(500);
let s = await evaluate(`({
  title: document.title,
  lang: document.documentElement.lang,
  dir: document.documentElement.dir,
  hero: document.querySelector('.hero h1')?.textContent,
  hasLocate: !!document.querySelector('.hero .locate button'),
  cards: document.querySelectorAll('.land-section').length,
  overflow: document.documentElement.scrollWidth - window.innerWidth
})`);
check('landing renders', s.hero?.includes('Know your land'), s.hero);
check('landing has location button', s.hasLocate);
check('landing sections', s.cards >= 3, `${s.cards} sections`);
check('landing fits viewport', s.overflow <= 1, `overflow ${s.overflow}px`);

// 2. Arabic switch
await evaluate("document.querySelector('.lang-btn').click()");
await wait(350);
s = await evaluate(`({
  lang: document.documentElement.lang,
  dir: document.documentElement.dir,
  hero: document.querySelector('.hero h1')?.textContent,
  locate: document.querySelector('.hero .locate button')?.textContent,
  overflow: document.documentElement.scrollWidth - window.innerWidth
})`);
check('Arabic language applied', s.lang === 'ar' && s.dir === 'rtl');
check('Arabic hero translated', /اعرف/.test(s.hero), s.hero);
check('Arabic location button', /استعمل/.test(s.locate), s.locate);
check('Arabic landing fits viewport', s.overflow <= 1, `overflow ${s.overflow}px`);

// 3. Geolocation flow: using the location should land on the Béni Mellal farm
await send('Browser.setPermission', {
  permission: { name: 'geolocation' },
  setting: 'granted',
  origin: APP,
});
await send('Emulation.setGeolocationOverride', { latitude: 32.3373, longitude: -6.3498, accuracy: 20 });
await evaluate("location.hash = '#/'");
await wait(400);
await evaluate("document.querySelector('.hero .locate button').click()");
await wait(2600);
s = await evaluate(`({
  hash: location.hash,
  dir: document.documentElement.dir,
  tab: [...document.querySelectorAll('.tab')].map((x) => x.textContent.trim()),
  overflow: document.documentElement.scrollWidth - window.innerWidth
})`);
check('location flow lands on the Béni Mellal farm', s.hash.includes('dashboard/farm?loc=beni-mellal'), s.hash);
check('Arabic dashboard is right-to-left', s.dir === 'rtl' && s.tab.some((x) => x.includes('ضيعتي')), s.tab.join(' / '));
check('Arabic dashboard fits viewport', s.overflow <= 1, `overflow ${s.overflow}px`);

// Back to English for the rest of the checks
await evaluate("document.querySelector('.lang-btn').click()");
await wait(350);
s = await evaluate(`({
  tabs: [...document.querySelectorAll('.tab')].map((x) => x.textContent.trim()),
  report: !!document.querySelector('.report iframe'),
  reportSrc: document.querySelector('.report iframe')?.getAttribute('src'),
  analyze: document.querySelector('.analyze button.btn-primary')?.textContent,
  chat: !!document.querySelector('.chat-fab'),
  overflow: document.documentElement.scrollWidth - window.innerWidth
})`);
check('farm tab is active and shows PDF', s.report && s.reportSrc?.includes('soil-report'), s.reportSrc);
check('analyze button present', /Analyze my farm/.test(s.analyze), s.analyze);
check('chat helper present', s.chat);
check('dashboard fits viewport', s.overflow <= 1, `overflow ${s.overflow}px`);

// 4. Run the simulated AI
await evaluate("document.querySelector('.analyze button.btn-primary').click()");
await wait(600);
s = await evaluate("({ steps: document.querySelectorAll('.ai-steps li').length, active: document.querySelector('.ai-steps li.active')?.textContent })");
check('AI shows its steps', s.steps === 4 && !!s.active, s.active);
await wait(5000);
s = await evaluate(`({
  results: !!document.querySelector('.results'),
  score: document.querySelector('.overall h2')?.textContent,
  soil: document.querySelectorAll('.soil-list li').length,
  actions: document.querySelectorAll('.actions li').length,
  best: [...document.querySelectorAll('.best-crops img')].map((i) => ({ src: i.getAttribute('src'), w: i.naturalWidth })),
  jsonButton: [...document.querySelectorAll('.sure .btn-link')].map((b) => b.textContent)[0]
})`);
check('AI result rendered', s.results && s.soil >= 6 && s.actions >= 4, `${s.soil} soil values, ${s.actions} actions`);
check('best crop photos load', s.best.length >= 3 && s.best.every((i) => i.w > 0), JSON.stringify(s.best));
check('JSON toggle present', /JSON/.test(s.jsonButton), s.jsonButton);

await evaluate("[...document.querySelectorAll('.sure .btn-link')].find((b) => /JSON/.test(b.textContent)).click()");
await wait(250);
s = await evaluate("({ json: !!document.querySelector('pre.json'), starts: document.querySelector('pre.json')?.textContent.slice(0, 1), len: document.querySelector('pre.json')?.textContent.length })");
check('AI JSON output shown', s.json && s.starts === '{' && s.len > 1000, `${s.len} chars`);

// 5. Crops tab with photos
await evaluate("location.hash = '#/dashboard/crops?loc=beni-mellal'");
await wait(1300);
s = await evaluate(`({
  rows: document.querySelectorAll('.crop-row').length,
  photos: [...document.querySelectorAll('.crop-row img')].map((i) => ({ src: i.getAttribute('src'), alt: i.alt, w: i.naturalWidth })),
  overflow: document.documentElement.scrollWidth - window.innerWidth
})`);
check('crop table shows ten crops', s.rows === 10, `${s.rows} rows`);
check('every crop has a loaded photo', s.photos.length === 10 && s.photos.every((p) => p.w > 0 && p.alt), JSON.stringify(s.photos.slice(0, 2)));
check('crops tab fits viewport', s.overflow <= 1, `overflow ${s.overflow}px`);

// 6. Weather tab: map + three charts
await evaluate("location.hash = '#/dashboard/weather?loc=beni-mellal'");
await wait(2200);
s = await evaluate(`({
  map: !!document.querySelector('.leaflet-host .leaflet-map-pane'),
  charts: document.querySelectorAll('.recharts-wrapper').length,
  findings: document.querySelectorAll('.finding').length,
  overflow: document.documentElement.scrollWidth - window.innerWidth
})`);
check('weather map renders', s.map);
check('three weather charts render', s.charts === 3, `${s.charts} charts`);
check('weather findings render', s.findings >= 2, `${s.findings} findings`);
check('weather tab fits viewport', s.overflow <= 1, `overflow ${s.overflow}px`);

// 7. Rotations: run comparison
await evaluate("location.hash = '#/dashboard/rotations?loc=beni-mellal'");
await wait(500);
await evaluate("[...document.querySelectorAll('.state .btn')].find((b) => /Compare/.test(b.textContent)).click()");
await wait(1800);
s = await evaluate(`({
  columns: document.querySelectorAll('.compare thead th').length,
  rows: document.querySelectorAll('.compare tbody tr').length,
  rec: document.querySelector('.rec-tag')?.textContent,
  timeline: document.querySelectorAll('.timeline').length
})`);
check('rotation comparison renders', s.columns === 4 && s.rows >= 7, `${s.columns - 1} options / ${s.rows} rows`);
check('rotation recommendation marked', !!s.rec, s.rec);
check('rotation timelines render', s.timeline === 3, `${s.timeline} timelines`);

// 8. Chatbot interaction
await evaluate("document.querySelector('.chat-fab').click()");
await wait(250);
await evaluate("document.querySelector('.chat-suggest .chip').click()");
await wait(1100);
s = await evaluate(`({
  open: !!document.querySelector('.chat-panel'),
  messages: document.querySelectorAll('.chat-list .msg').length,
  last: document.querySelector('.chat-list .msg:last-child')?.textContent
})`);
check('chat opens and answers', s.open && s.messages >= 3 && s.last.length > 20, s.last?.slice(0, 60));

// 9. Mobile layout
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await evaluate("location.hash = '#/dashboard/farm?loc=beni-mellal'");
await wait(900);
await evaluate("if (!document.querySelector('.chat-panel')) document.querySelector('.chat-fab')?.click()");
await wait(250);
s = await evaluate(`({
  width: window.innerWidth,
  overflow: document.documentElement.scrollWidth - window.innerWidth,
  analyzeWidth: document.querySelector('.analyze')?.getBoundingClientRect().width,
  chatWidth: document.querySelector('.chat-panel')?.getBoundingClientRect().width,
  report: !!document.querySelector('.report iframe')
})`);
check('mobile layout fits', s.overflow <= 1, `overflow ${s.overflow}px at ${s.width}px`);
check('mobile analyze card fits', s.analyzeWidth <= s.width, `${s.analyzeWidth}px`);
check('mobile chat panel fits', !s.chatWidth || s.chatWidth <= s.width, `${s.chatWidth}px`);
check('mobile still shows soil PDF', s.report);
await send('Emulation.clearDeviceMetricsOverride');

// 10. No runtime exceptions
check('no page exceptions', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));
check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));

ws.close();
console.log(process.exitCode ? 'some browser checks failed' : 'all browser checks passed');
