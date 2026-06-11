/**
 * Headless-Chrome verification for the landing page via the DevTools protocol.
 * Captures console errors + screenshots at desktop and mobile viewports.
 *
 * Usage: node scripts/verify-landing.mjs [url]
 */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const URL_TO_TEST = process.argv[2] || 'http://127.0.0.1:3000/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9223;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '_shots');
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-first-run',
  '--disable-extensions',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());

// wait for the debugger endpoint
let version = null;
for (let i = 0; i < 60; i++) {
  try {
    version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
    break;
  } catch {
    await sleep(250);
  }
}
if (!version) throw new Error('Chrome debugger endpoint never came up');
console.log('Chrome:', version.Browser);

const target = await (
  await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })
).json();

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => {
  ws.onopen = res;
  ws.onerror = rej;
});

let msgId = 0;
const pending = new Map();
const consoleMessages = [];

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method === 'Runtime.consoleAPICalled') {
    const { type, args } = msg.params;
    const text = args.map((a) => a.value ?? a.description ?? '').join(' ');
    consoleMessages.push({ type, text });
  } else if (msg.method === 'Runtime.exceptionThrown') {
    consoleMessages.push({
      type: 'exception',
      text: msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text,
    });
  } else if (msg.method === 'Log.entryAdded') {
    const { level, text, source } = msg.params.entry;
    consoleMessages.push({ type: `${source}:${level}`, text });
  }
};

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });

const shot = async (name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 72 });
  writeFileSync(join(OUT, `${name}.jpg`), Buffer.from(data, 'base64'));
  console.log('saved', `${name}.jpg`);
};

const scrollTo = async (yExpr) => {
  await send('Runtime.evaluate', {
    expression: `window.scrollTo({ top: ${yExpr}, behavior: 'instant' })`,
  });
  await sleep(1400); // let scroll-triggered reveals play
};

await send('Page.enable');
await send('Runtime.enable');
await send('Log.enable');

const run = async (label, metrics) => {
  await send('Emulation.setDeviceMetricsOverride', metrics);
  await send('Page.navigate', { url: URL_TO_TEST });
  await sleep(6500); // preloader (~2.5s) + hero reveal + fonts

  await shot(`${label}-1-hero`);
  const docH = (await send('Runtime.evaluate', {
    expression: 'document.documentElement.scrollHeight',
    returnByValue: true,
  })).result.value;
  console.log(`${label} scrollHeight:`, docH);

  await scrollTo('document.documentElement.scrollHeight * 0.18');
  await shot(`${label}-2-stats`);
  await scrollTo('document.documentElement.scrollHeight * 0.38');
  await shot(`${label}-3-features`);
  await scrollTo('document.documentElement.scrollHeight * 0.55');
  await shot(`${label}-4-how`);
  await scrollTo('document.documentElement.scrollHeight * 0.72');
  await shot(`${label}-5-pricing`);
  await scrollTo('document.documentElement.scrollHeight * 0.92');
  await shot(`${label}-6-cta`);
  await scrollTo('document.documentElement.scrollHeight');
  await shot(`${label}-7-footer`);

  // horizontal overflow check
  const overflow = (await send('Runtime.evaluate', {
    expression: `(() => {
      const w = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > w + 2 && getComputedStyle(el).position !== 'fixed') {
          bad.push(el.className && String(el.className).slice(0, 60));
        }
      });
      return { clientW: w, scrollW: document.documentElement.scrollWidth, wide: bad.slice(0, 8) };
    })()`,
    returnByValue: true,
  })).result.value;
  console.log(`${label} overflow check:`, JSON.stringify(overflow));
};

await run('desktop', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await run('mobile', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

const problems = consoleMessages.filter(
  (m) => m.type === 'error' || m.type === 'exception' || m.type.endsWith(':error') || m.type === 'warning'
);
console.log('\n=== console problems ===');
problems.length
  ? problems.forEach((m) => console.log(`[${m.type}]`, m.text.slice(0, 300)))
  : console.log('none');

ws.close();
chrome.kill();
process.exit(0);
