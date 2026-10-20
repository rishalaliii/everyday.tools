// Internal link + registry checker.  Run: node scripts/check-links.mjs   (also run by `npm test` via tests/links.test.mjs)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name === 'node_modules' || e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
export async function check() {
  const problems = [], all = walk(ROOT), html = all.filter((f) => f.endsWith('.html')), ids = new Map();
  const idsOf = (f) => { if (!ids.has(f)) ids.set(f, new Set([...fs.readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); return ids.get(f); };
  const resolve = (from, ref) => { let p = path.resolve(path.dirname(from), ref); if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html'); return p; };
  let links = 0;
  for (const f of html) {
    const s = fs.readFileSync(f, 'utf8').replace(/<code[\s\S]*?<\/code>/g, ''), rel = path.relative(ROOT, f); // <code> blocks hold example snippets, not real links
    for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const u = m[1]; if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(u)) continue; links++;
      const [file, frag] = u.split('#'); const target = file ? resolve(f, file) : f;
      if (file && (!fs.existsSync(target) || !target.startsWith(ROOT))) { problems.push(`${rel}: broken link ${u}`); continue; }
      if (frag && target.endsWith('.html') && !idsOf(target).has(frag)) problems.push(`${rel}: missing anchor #${frag} in ${path.relative(ROOT, target)}`);
    }
    for (const m of s.matchAll(/<link rel="canonical" href="([^"]+)"/g)) { const u = new URL(m[1]), want = '/' + path.relative(ROOT, path.dirname(f)).replace(/\\/g, '/'); const got = u.pathname.replace(/\/$/, ''); if (got !== (want === '/' ? '' : want)) problems.push(`${rel}: canonical ${u.pathname} does not match its folder`); }
  }
  // registry: every tool in common.js has a page, a sitemap entry, a homepage-visible category and the page loads common.js
  const common = await import(new URL('../assets/js/common.js', import.meta.url).href).catch(() => null);
  const src = fs.readFileSync(path.join(ROOT, 'assets/js/common.js'), 'utf8');
  const tools = [...src.matchAll(/\{ id: '([a-z0-9-]+)', cat: '([a-z]+)'[^}]*?url: '([^']+)'/g)].map((m) => ({ id: m[1], cat: m[2], url: m[3] }));
  const cats = [...src.matchAll(/\{ id: '([a-z]+)', name: '[^']+' \}/g)].map((m) => m[1]);
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  for (const t of tools) {
    const page = path.join(ROOT, t.url, 'index.html');
    if (!fs.existsSync(page)) { problems.push(`registry: ${t.id} has no page at ${t.url}`); continue; }
    if (!cats.includes(t.cat)) problems.push(`registry: ${t.id} uses unknown category ${t.cat}`);
    if (!sitemap.includes(`<loc>https://everydaytools.pages.dev${t.url}</loc>`)) problems.push(`sitemap: ${t.url} missing`);
    if (!fs.readFileSync(page, 'utf8').includes(`data-tool="${t.id}"`)) problems.push(`registry: ${t.url} page lacks data-tool="${t.id}"`);
  }
  for (const d of fs.readdirSync(path.join(ROOT, 'tools'))) if (!tools.some((t) => t.id === d)) problems.push(`registry: tools/${d} is not listed in assets/js/common.js`);
  for (const m of sitemap.matchAll(/<loc>https:\/\/everydaytools\.pages\.dev(\/[^<]*)<\/loc>/g)) if (!fs.existsSync(path.join(ROOT, m[1], 'index.html'))) problems.push(`sitemap: ${m[1]} has no page`);
  // related links: every tool page links to at least 3 other tools; every PDF tool links to all other PDF tools
  const pdf = tools.filter((t) => t.cat === 'pdf');
  for (const t of tools) { const s = fs.readFileSync(path.join(ROOT, t.url, 'index.html'), 'utf8'); const rel = (s.split('<h2>Related tools</h2>')[1] || '').match(/href="\.\.\/[a-z0-9-]+\//g) || []; if (rel.length < 3) problems.push(`related: ${t.id} has only ${rel.length} related links`); if (t.cat === 'pdf') for (const o of pdf) if (o.id !== t.id && !s.includes(`href="../${o.id}/"`)) problems.push(`related: ${t.id} does not link to ${o.id}`); }
  return { problems, pages: html.length, links, tools: tools.length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { const r = await check(); r.problems.forEach((p) => console.log('PROBLEM', p)); console.log(`${r.pages} pages, ${r.links} internal links, ${r.tools} registered tools, ${r.problems.length} problems`); process.exit(r.problems.length ? 1 : 0); }
