/** Minimal hydration check for /__hydration-test in headless Chrome. */
import { spawn } from 'node:child_process';
const URL_TO_TEST = process.argv[2] || 'http://127.0.0.1:3000/__hydration-test';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9227;
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
const evalJs = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.value;

await send('Page.enable');
await send('Runtime.enable');
await send('Page.navigate', { url: URL_TO_TEST });

for (const t of [2000, 4000, 8000, 15000]) {
  await sleep(t === 2000 ? 2000 : t - [2000, 4000, 8000, 15000][[2000, 4000, 8000, 15000].indexOf(t) - 1]);
  console.log(`t=${t}ms:`, await evalJs(`JSON.stringify({ url: location.pathname, hydrated: document.documentElement.dataset.hydrated || 'no', body: document.body.innerText.slice(0, 60) })`));
}

ws.close();
chrome.kill();
process.exit(0);
