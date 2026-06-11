/** Definitive hydration check + error capture from the first instruction. */
import { spawn } from 'node:child_process';
const URL_TO_TEST = process.argv[2] || 'http://127.0.0.1:3000/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9226;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
process.on('exit', () => chrome.kill());
let up = false;
for (let i = 0; i < 60 && !up; i++) { try { await fetch(`http://127.0.0.1:${PORT}/json/version`); up = true; } catch { await sleep(250); } }
const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let msgId = 0;
const pending = new Map();
const events = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  } else if (m.method === 'Runtime.consoleAPICalled') {
    events.push(`[console.${m.params.type}] ` + m.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a.preview?.properties?.slice(0,4)) ?? '').join(' ').slice(0, 400));
  } else if (m.method === 'Runtime.exceptionThrown') {
    events.push('[exception] ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text).slice(0, 600));
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

await send('Page.enable');
await send('Runtime.enable');
// catch absolutely everything, including errors before Runtime events attach
await send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__errs = []; window.addEventListener('error', e => __errs.push('onerror: ' + e.message + ' @ ' + (e.filename||'').slice(-60) + ':' + e.lineno)); window.addEventListener('unhandledrejection', e => __errs.push('rejection: ' + (e.reason && (e.reason.stack || e.reason.message || String(e.reason))).slice(0, 400)));`,
});

await send('Page.navigate', { url: URL_TO_TEST });
await sleep(10000);

console.log('menuOpen dataset (hydration proof):', await evalJs(`document.querySelector('nav')?.dataset.menuOpen ?? 'UNDEFINED'`));
console.log('captured page errors:', JSON.stringify(await evalJs('window.__errs'), null, 1));
console.log('preloader display:', await evalJs(`(() => { const el = document.querySelector('[class*="preloader"]'); return el ? getComputedStyle(el).display : 'missing'; })()`));
console.log('\n--- console/exception events ---');
events.slice(0, 30).forEach((x) => console.log(x));

ws.close();
chrome.kill();
process.exit(0);
