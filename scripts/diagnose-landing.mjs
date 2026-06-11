/**
 * Diagnostic pass: force prefers-reduced-motion emulation and inspect
 * GSAP/ScrollTrigger side effects (preloader, counters, nav glass, pinning).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_TO_TEST = process.argv[2] || 'http://127.0.0.1:3000/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9224;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '_shots');
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

let up = false;
for (let i = 0; i < 60 && !up; i++) {
  try { await fetch(`http://127.0.0.1:${PORT}/json/version`); up = true; } catch { await sleep(250); }
}
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evalJs = async (expression) =>
  (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;
const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
  writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log('saved', `${name}.jpg`);
};

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

// 1. what does the default environment report?
await send('Page.navigate', { url: URL_TO_TEST });
await sleep(3000);
console.log('default reduced-motion:', await evalJs(`matchMedia('(prefers-reduced-motion: reduce)').matches`));

// 2. force no-preference and reload
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
await send('Page.navigate', { url: URL_TO_TEST });
await sleep(800);
await shot('diag-preloader');

await sleep(4500);
await shot('diag-hero-revealed');
console.log('after force:', await evalJs(`matchMedia('(prefers-reduced-motion: reduce)').matches ? 'reduce' : 'no-preference'`));
console.log('preloader display:', await evalJs(`(() => { const el = document.querySelector('[class*="preloader"]'); return el ? getComputedStyle(el).display : 'missing'; })()`));
console.log('split lines in h2:', await evalJs(`document.querySelectorAll('h2 div').length`));
console.log('pin-spacer:', await evalJs(`document.querySelectorAll('.pin-spacer').length`));

// 3. scroll to stats, dwell, check counters + nav glass
await evalJs(`window.scrollTo({ top: 900, behavior: 'instant' })`);
await sleep(2500);
console.log('stat values:', await evalJs(`[...document.querySelectorAll('[data-count]')].map(el => el.textContent)`));
console.log('nav classes:', await evalJs(`document.querySelector('nav').className`));
await shot('diag-stats');

// 4. mid-pin of features
await evalJs(`window.scrollTo({ top: document.documentElement.scrollHeight * 0.40, behavior: 'instant' })`);
await sleep(1500);
await shot('diag-features-pinned');
console.log('features track x:', await evalJs(`(() => { const t = document.querySelector('[class*="featuresTrack"]'); return t ? getComputedStyle(t).transform : 'missing'; })()`));

// 5. measure the pricing → testimonials gap
console.log('section gap:', await evalJs(`(() => {
  const pricing = document.getElementById('pricing');
  const testi = document.getElementById('testimonials');
  const grid = pricing.querySelector('[class*="pricingGrid"]');
  return {
    pricingBottom: Math.round(pricing.getBoundingClientRect().bottom + scrollY),
    gridBottom: Math.round(grid.getBoundingClientRect().bottom + scrollY),
    testiTop: Math.round(testi.getBoundingClientRect().top + scrollY),
    gridChildrenVisibility: [...grid.children].map(c => getComputedStyle(c).visibility + '/' + getComputedStyle(c).opacity),
  };
})()`));

ws.close();
chrome.kill();
process.exit(0);
