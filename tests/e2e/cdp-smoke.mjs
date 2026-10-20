// Minimal Chrome DevTools Protocol smoke test (no Playwright needed). Node >= 22 (global WebSocket).
// Usage: CHROMIUM_PATH=/path/to/chrome node tests/e2e/cdp-smoke.mjs
import { spawn } from 'node:child_process';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CH = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.xml': 'text/xml' };
const srv = http.createServer((q, r) => { let p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'text/plain' }); r.end(d); } }); }).listen(0);
const port = srv.address().port, base = `http://127.0.0.1:${port}`;
const chrome = spawn(CH, ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=9333', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, id = 0; const pend = new Map(), errors = [];
async function connect() {
  for (let i = 0; i < 50; i++) { try { const l = await (await fetch('http://127.0.0.1:9333/json')).json(); const t = l.find((x) => x.type === 'page'); if (t) { ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; }); break; } } catch {} await sleep(200); }
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); }
    else if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('console.error: ' + d.params.args.map((a) => a.value).join(' '));
    else if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push('log: ' + d.params.entry.text + ' ' + (d.params.entry.url || '')); };
}
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description); return r.result.result.value; };
const goto = async (u, w = 1280, h = 800) => { await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 }); await send('Page.navigate', { url: base + u }); await sleep(700); };
let pass = 0, fail = 0; const ok = (c, name, extra = '') => { c ? pass++ : fail++; console.log((c ? 'PASS ' : 'FAIL ') + name + (c ? '' : ' ' + extra)); };
const type = (sel, v) => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.value=${JSON.stringify(v)};e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const click = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).click()`);
const txt = (sel) => ev(`document.querySelector(${JSON.stringify(sel)}).textContent`);
const stat = (label) => ev(`[...document.querySelectorAll('.stat')].find(d=>d.firstChild.textContent.startsWith(${JSON.stringify(label)})).querySelector('b').textContent`);
try {
  await connect(); await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  // ---- word counter, desktop + mobile ----
  for (const [w, nm] of [[1280, 'desktop'], [375, 'mobile 375px']]) {
    await goto('/tools/word-counter/', w, 800);
    ok(await ev(`document.querySelectorAll('.stat').length`) === 6, `[${nm}] result panel visible with 6 stats on empty input`);
    ok(await stat('Words') === '0', `[${nm}] empty input shows 0 words`);
    await type('#in', 'Hello world');
    ok(await stat('Words') === '2' && await stat('Characters (with') === '11' && await stat('Characters (no') === '10', `[${nm}] typing updates instantly`);
    await type('#in', 'Hi,   there!  How are you?\n\nNew paragraph here.');
    ok(await stat('Words') === '8' && await stat('Sentences') === '3' && await stat('Paragraphs') === '2' && await stat('Lines') === '3', `[${nm}] punctuation, multiple spaces, multiline`, [await stat('Words'), await stat('Sentences'), await stat('Paragraphs'), await stat('Lines')].join());
    await ev(`document.querySelector('#in').value='one two three';`); await click('#apply');
    ok(await stat('Words') === '3', `[${nm}] Count Words button works`);
    await ev(`document.querySelector('#in').focus(); document.execCommand('insertText', false, ' four')`);
    ok(await stat('Words') === '4', `[${nm}] real typing/paste event updates`);
    await click('#reset'); ok(await stat('Words') === '0' && await ev(`document.querySelector('#in').value`) === '', `[${nm}] Clear resets and keeps panel`);
    const vis = await ev(`(()=>{const r=document.querySelector('#stats').getBoundingClientRect();return r.height>0&&r.right<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth})()`);
    ok(vis, `[${nm}] stats visible, no horizontal overflow`);
  }
  await ev(`window.__dl=null; URL.createObjectURL=(b)=>{window.__dl=b;return 'blob:x'}; HTMLAnchorElement.prototype.click=function(){window.__dlName=this.download}`);
  await type('#in', 'a b c'); await click('#dl');
  ok(await ev(`window.__dlName`) === 'word-count-results.txt', 'Download Results creates word-count-results.txt');
  ok(await ev(`window.__dl.text().then(t=>/Words: 3/.test(t))`), 'Download content contains counts');
  // ---- network tools ----
  await goto('/tools/ipv4-subnet-calculator/'); await type('#ip', '192.168.1.130/26');
  ok(/192\.168\.1\.191/.test(await txt('#out')) && /62/.test(await txt('#out')), 'subnet calculator live result');
  await type('#ip', '999.1.1.1'); ok(/Invalid IPv4/.test(await txt('#status')), 'subnet calculator shows validation error');
  await click('#reset'); ok(await ev(`document.querySelector('#ip').value`) === '', 'subnet reset');
  await goto('/tools/ipv4-cidr-converter/'); await type('#v', '/22'); ok(/255\.255\.252\.0/.test(await txt('#out')), 'cidr converter');
  await goto('/tools/mac-address-formatter/'); await type('#in', '001A.2B3C.4D5E\nzz'); ok(/00:1A:2B:3C:4D:5E/.test(await txt('#out')) && /✗ zz/.test(await txt('#out')), 'mac formatter valid + invalid');
  await goto('/tools/ipv4-address-validator/'); await type('#in', '10.0.0.1\n1.2.3'); ok(/1 of 2 valid/.test(await txt('#status')), 'ipv4 validator');
  await goto('/tools/ipv6-address-validator/'); await type('#in', '2001:0db8:0:0:0:0:0:1'); ok(/2001:db8::1/.test(await txt('#out')), 'ipv6 validator');
  await goto('/tools/public-ip-checker/'); await click('#go'); await sleep(2500);
  ok(/Your public IP|timed out|Network error|HTTP/.test(await txt('#out') + await txt('#status')), 'public ip: result or graceful error', await txt('#status'));
  await goto('/tools/dns-lookup/'); await type('#dom', 'bad domain!'); await click('#go'); await sleep(300);
  ok(/not a valid domain/.test(await txt('#status')), 'dns lookup rejects invalid domain');
  await type('#dom', 'example.com'); await click('#go'); await sleep(3500);
  ok(/Status: NOERROR|Both DNS|timed out|Network error/.test(await txt('#out') + await txt('#status')), 'dns lookup: result or graceful error', await txt('#status'));
  // ---- subtitle tools ----
  const SRT = '1\\n00:00:01,000 --> 00:00:03,000\\nHello <i>there</i>\\n\\n2\\n00:00:02,500 --> 00:00:05,000\\nOverlap';
  await goto('/tools/srt-validator/'); await type('#in', SRT.replace(/\\n/g, '\n')); await click('#go');
  ok(/Overlaps/.test(await txt('#issues')) && /warning/.test(await txt('#status')), 'srt validator warns on overlap');
  await type('#in', '1\n00:00:09,000 --> 00:00:03,000\nx'); await click('#go'); ok(/1 error/.test(await txt('#status')), 'srt validator flags end<start');
  await goto('/tools/srt-timestamp-shifter/'); await type('#in', SRT.replace(/\\n/g, '\n')); await ev(`document.querySelector('#secs').value='2'`); await click('#go');
  ok(/00:00:03,000 --> 00:00:05,000/.test(await ev(`document.querySelector('#out').value`)), 'shifter +2s');
  await goto('/tools/srt-to-txt-converter/'); await type('#in', SRT.replace(/\\n/g, '\n')); await click('#go'); ok(await ev(`document.querySelector('#out').value`) === 'Hello there\nOverlap\n', 'srt to txt');
  await goto('/tools/txt-to-srt-generator/'); await type('#in', 'Hello there\nGeneral Kenobi'); await click('#go'); ok(/^1\n00:00:00,000 --> 00:00:0\d,\d{3}\nHello there\n\n2\n/.test(await ev(`document.querySelector('#out').value`)), 'txt to srt');
  await goto('/tools/srt-formatter/'); await type('#in', '7\n00:00:02.000 --> 00:00:03.000\n  b  \n\n8\n00:00:01,000 --> 00:00:01,500\na'); await click('#go');
  ok(/^1\n00:00:01,000 --> 00:00:01,500\na\n\n2\n00:00:02,000 --> 00:00:03,000\nb\n$/.test(await ev(`document.querySelector('#out').value`)), 'srt formatter sorts/renumbers');
  await goto('/tools/srt-subtitle-editor/'); await type('#in', SRT.replace(/\\n/g, '\n')); await click('#go');
  ok(await ev(`document.querySelectorAll('#preview tbody tr').length`) === 2, 'editor preview 2 rows'); await click('#fix'); ok(/^1\n/.test(await ev(`document.querySelector('#in').value`)), 'editor clean & renumber');
  await click('#reset'); ok(await ev(`document.querySelector('#in').value`) === '', 'editor reset');
  // ---- homepage / navigation ----
  await goto('/'); ok(await ev(`document.querySelectorAll('.tile').length`) === 44, 'homepage shows 44 tiles');
  await type('#search', 'subnet calculator'); ok(await ev(`document.querySelectorAll('.tile').length`) === 1, 'search finds subnet tool');
  await goto('/about/'); await goto('/#network'); ok(await ev(`document.querySelectorAll('.tile').length`) === 7, 'network category has 7 tools');
  await goto('/about/'); await goto('/#subtitle'); ok(await ev(`document.querySelectorAll('.tile').length`) === 6, 'subtitle category has 6 tools');
  await goto('/', 375, 800); ok(await ev(`document.documentElement.scrollWidth<=innerWidth`), 'homepage no horizontal overflow at 375px');
  const real = errors.filter((e) => !/ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(e)); // offline sandbox: external service calls are expected to fail
  ok(real.length === 0, 'no console/runtime errors during run (offline network errors ignored)', real.join(' || '));
} finally { console.log(`\n${pass} passed, ${fail} failed`); chrome.kill(); srv.close(); process.exit(fail ? 1 : 0); }
