/** Why doesn't the page hydrate in headless Chrome? Inspect script/resource loading. */
import { spawn } from 'node:child_process';
const URL_TO_TEST = process.argv[2] || 'http://127.0.0.1:3000/';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9225;
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
const failures = [];
const responses = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { resolve, reject } = pending.get(m.id);
    pending.delete(m.id);
    m.error ? reject(new Error(m.error.message)) : resolve(m.result);
  } else if (m.method === 'Network.loadingFailed') {
    failures.push(m.params.errorText + ' :: ' + (m.params.canceled ? 'canceled' : ''));
  } else if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    responses.push(`${r.status} ${r.url.slice(0, 110)}`);
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
await send('Network.enable');
await send('Page.navigate', { url: URL_TO_TEST });
await sleep(8000);

console.log('scripts executed (__next_f):', await evalJs(`typeof self.__next_f !== 'undefined' ? self.__next_f.length : 'NOT DEFINED'`));
console.log('script tags:', await evalJs(`document.querySelectorAll('script').length`));
console.log('react root markers:', await evalJs(`!!document.querySelector('[data-reactroot], #__next') || 'app-router'`));
console.log('\n--- failed loads ---');
failures.slice(0, 20).forEach((f) => console.log(f));
console.log('\n--- responses ---');
responses.slice(0, 40).forEach((r) => console.log(r));

ws.close();
chrome.kill();
process.exit(0);
