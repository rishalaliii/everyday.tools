// Shared helpers for the browser (Playwright) tests. Playwright is NOT a project dependency:
// install it with `npm i -D playwright-core` (or set PW_PATH) and a Chromium (set CHROMIUM_PATH).
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SITE = path.resolve(HERE, '../..');
const req = createRequire(import.meta.url);
export function loadPlaywright() {
  const tries = [process.env.PW_PATH, 'playwright-core', '/opt/npm-tools/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core'].filter(Boolean);
  for (const t of tries) { try { return req(t); } catch {} }
  throw new Error('playwright-core not found. Run: npm i -D playwright-core  (or set PW_PATH).');
}
export function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  for (const p of ['/opt/pw-browsers/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome']) if (fs.existsSync(p)) return p;
  return undefined;
}
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json' };
// mount: '' serves the site at "/", '/everydaytools' serves it in a subfolder.
export function serve(mount = '') {
  const srv = http.createServer((q, r) => {
    let u = decodeURIComponent(q.url.split('?')[0]);
    if (mount && !u.startsWith(mount + '/') && u !== mount) { r.writeHead(404); return r.end('nf'); }
    u = u.slice(mount.length) || '/';
    let f = path.join(SITE, u); if (!f.startsWith(SITE)) { r.writeHead(403); return r.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { r.writeHead(404); return r.end('not found'); }
    r.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  return new Promise((res) => srv.listen(0, '127.0.0.1', () => res({ srv, origin: `http://127.0.0.1:${srv.address().port}${mount}` })));
}
export async function launch() {
  const pw = loadPlaywright();
  return pw.chromium.launch({ executablePath: chromiumPath(), args: ['--no-sandbox'] });
}
