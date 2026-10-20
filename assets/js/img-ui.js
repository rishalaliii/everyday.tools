// Browser-side image tools. body[data-op] = compress | resize | crop | convert | favicon. Nothing is uploaded.
import { FORMATS, formatBytes, outName, checkFile, checkDims, resizeDims, clampRect, dragRect, coverSquare, buildIco } from './img.js';
const op = document.body.dataset.op, $ = (id) => document.getElementById(id), st = $('status');
const ctl = Object.fromEntries([...document.querySelectorAll('[data-f]')].map((e) => [e.dataset.f, e]));
const qv = $('qv');
const defs = Object.fromEntries(Object.entries(ctl).map(([k, e]) => [k, e.type === 'checkbox' ? e.checked : e.value]));
const v = (k) => (ctl[k].type === 'checkbox' ? ctl[k].checked : ctl[k].value);
const say = (m, k = 'error') => { st.textContent = m; st.className = 'status ' + k; st.hidden = !m; };
let file = null, src = null, sw = 0, sh = 0, srcUrl = '', outUrl = '', outBlob = null, outMime = '', seq = 0, timer = 0, sel = null, base = null, favs = [];
const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });
const reUrl = (old, blob) => { if (old) URL.revokeObjectURL(old); return blob ? URL.createObjectURL(blob) : ''; };
function scaleTo(img, w, h, sx = 0, sy = 0, cw = img.width ?? sw, ch = img.height ?? sh, bg) {
  let cur = img, x = sx, y = sy, cwid = cw, chei = ch;
  while (w < cwid / 2 || h < chei / 2) { const nw = Math.max(w, Math.ceil(cwid / 2)), nh = Math.max(h, Math.ceil(chei / 2)), t = canvas(nw, nh), g = t.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(cur, x, y, cwid, chei, 0, 0, nw, nh); cur = t; x = y = 0; cwid = nw; chei = nh; }
  const c = canvas(w, h), g = c.getContext('2d'); if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); } g.imageSmoothingQuality = 'high'; g.drawImage(cur, x, y, cwid, chei, 0, 0, w, h); return c;
}
const encode = (c, mime, q) => new Promise((res, rej) => c.toBlob((b) => (!b ? rej(new Error('Your browser could not create that image (it may be too large).')) : b.type !== mime ? rej(new Error(`Your browser cannot export ${FORMATS[mime].name}. Choose another format.`)) : res(b)), mime, q));
const mimeOf = (k) => { const m = v(k); return m === 'same' ? (FORMATS[file.type] && file.type !== 'image/png' ? file.type : file.type === 'image/png' ? 'image/png' : 'image/jpeg') : m; };
const quality = () => Math.min(100, Math.max(1, +v('q') || 75)) / 100;
function stat(k, val) { const d = document.createElement('div'); d.className = 'stat'; const b = document.createElement('b'); b.textContent = val; d.append(b, k); return d; }
function cleanOut() { outUrl = reUrl(outUrl); outBlob = null; $('dl').disabled = true; const a = $('after'); if (a) a.replaceChildren(); $('info').replaceChildren(); }
async function decode(f) {
  try { return await createImageBitmap(f); } catch {
    return new Promise((res, rej) => { const i = new Image(), u = URL.createObjectURL(f); i.onload = () => { URL.revokeObjectURL(u); res(i); }; i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('x')); }; i.src = u; });
  }
}
async function load(f) {
  cleanOut(); say('');
  try {
    checkFile(f); const img = await decode(f).catch(() => { throw new Error('This image could not be read. It may be corrupted or in a format your browser cannot open (for example HEIC).'); });
    const w = img.width, h = img.height; if (!w || !h) throw new Error('This image has no pixels.'); if (w * h > 100e6) throw new Error(`This image is ${w}×${h}px, which is too large to process in a browser. Resize it with another tool first.`);
    file = f; src = img; sw = w; sh = h; srcUrl = reUrl(srcUrl, f);
    $('opts').hidden = false; $('before').replaceChildren(Object.assign(new Image(), { src: srcUrl, alt: 'Original image' })); $('before-box').hidden = false;
    if (op === 'resize') { ctl.w.value = w; ctl.h.value = h; }
    if (op === 'crop') { sel = { x: 0, y: 0, w, h }; initCrop(); syncCrop(); }
    schedule(0);
  } catch (e) { file = src = null; $('opts').hidden = true; $('before-box').hidden = true; say(e.message); }
}
function schedule(ms = 150) { clearTimeout(timer); timer = setTimeout(render, ms); }
async function render() {
  if (!file) return; const my = ++seq;
  try {
    let c, mime, suffix; const bgFor = (m) => (m === 'image/jpeg' ? (op === 'convert' ? v('bg') : '#ffffff') : null);
    if (op === 'favicon') return await renderFavicon(my);
    if (op === 'compress') { mime = mimeOf('fmt'); const mw = +v('maxw') || 0; if (mw && mw < sw) { const h = Math.max(1, Math.round(sh * mw / sw)); c = scaleTo(src, mw, h, 0, 0, sw, sh, bgFor(mime)); } else c = scaleTo(src, sw, sh, 0, 0, sw, sh, bgFor(mime)); suffix = '-compressed'; }
    else if (op === 'resize') { const { w, h } = { w: Math.round(+v('w')), h: Math.round(+v('h')) }; checkDims(w, h); mime = mimeOf('fmt'); c = scaleTo(src, w, h, 0, 0, sw, sh, bgFor(mime)); suffix = `-${w}x${h}`; }
    else if (op === 'crop') { const r = clampRect({ x: +v('x') || 0, y: +v('y') || 0, w: +v('cw') || 1, h: +v('ch') || 1 }, sw, sh); mime = mimeOf('fmt'); c = scaleTo(src, r.w, r.h, r.x, r.y, r.w, r.h, bgFor(mime)); suffix = '-cropped'; }
    else { mime = v('fmt'); c = scaleTo(src, sw, sh, 0, 0, sw, sh, bgFor(mime)); suffix = '-converted'; }
    const b = await encode(c, mime, mime === 'image/png' ? undefined : quality()); if (my !== seq) return;
    outBlob = b; outMime = mime; outUrl = reUrl(outUrl, b); if (qv && ctl.q) qv.textContent = Math.round(quality() * 100);
    $('after').replaceChildren(Object.assign(new Image(), { src: outUrl, alt: 'Result image' })); $('dl').disabled = false; $('dl').dataset.name = outName(file.name, suffix, mime);
    const pct = Math.round((1 - b.size / file.size) * 100), note = $('info');
    note.replaceChildren(stat('Original', `${sw}×${sh} · ${formatBytes(file.size)}`), stat('Result', `${c.width}×${c.height} · ${formatBytes(b.size)}`), stat(pct >= 0 ? 'Smaller by' : 'Larger by', `${Math.abs(pct)}%`));
    if (op === 'compress' && b.size >= file.size) say('The result is not smaller than the original. Lower the quality, set a maximum width, or choose WebP/JPG.', 'warn'); else if (op === 'compress' && mime === 'image/png') say('PNG is lossless, so the quality slider has no effect. Choose JPG or WebP for smaller files, or set a maximum width.', 'warn'); else say('');
  } catch (e) { if (my === seq) { cleanOut(); say(e.message); } }
}
async function renderFavicon(my) {
  const sizes = [16, 32, 48, 180, 192, 512], contain = v('mode') === 'contain', { sx, sy, s } = coverSquare(sw, sh), out = [];
  for (const n of sizes) { const c = contain ? (() => { const k = Math.min(n / sw, n / sh), w = Math.max(1, Math.round(sw * k)), h = Math.max(1, Math.round(sh * k)), t = canvas(n, n), g = t.getContext('2d'), p = scaleTo(src, w, h, 0, 0, sw, sh); g.drawImage(p, Math.round((n - w) / 2), Math.round((n - h) / 2)); return t; })() : scaleTo(src, n, n, sx, sy, s, s); out.push({ n, blob: await encode(c, 'image/png') }); }
  if (my !== seq) return; favs.forEach((f) => URL.revokeObjectURL(f.url)); favs = out.map((o) => ({ ...o, url: URL.createObjectURL(o.blob) }));
  const box = $('fav'); box.replaceChildren(...favs.map((f) => { const fg = document.createElement('figure'), i = Object.assign(new Image(), { src: f.url, alt: `${f.n}px favicon`, width: Math.min(f.n, 96), height: Math.min(f.n, 96) }), a = document.createElement('a'); a.href = f.url; a.download = `favicon-${f.n}x${f.n}.png`; a.textContent = `${f.n}×${f.n} PNG (${formatBytes(f.blob.size)})`; fg.append(i, a); return fg; }));
  const ico = buildIco(await Promise.all(favs.filter((f) => f.n <= 48).map(async (f) => ({ size: f.n, bytes: new Uint8Array(await f.blob.arrayBuffer()) })))); if (my !== seq) return;
  outBlob = new Blob([ico], { type: 'image/x-icon' }); outUrl = reUrl(outUrl, outBlob); $('dl').disabled = false; $('dl').dataset.name = 'favicon.ico';
  $('info').replaceChildren(stat('Source', `${sw}×${sh}`), stat('favicon.ico', `16, 32, 48 px · ${formatBytes(outBlob.size)}`));
  say(Math.min(sw, sh) < 512 ? `Your image is ${sw}×${sh}px; the 512px icon is enlarged and may look soft. Use at least 512×512 for best results.` : '', 'warn');
}
// ---- crop selection on a preview canvas ----
function initCrop() {
  const cv = $('cropcv'), k = Math.min(1, 900 / sw); cv.width = Math.round(sw * k); cv.height = Math.round(sh * k);
  base = canvas(cv.width, cv.height); base.getContext('2d').drawImage(src, 0, 0, cv.width, cv.height); cv.hidden = false;
}
function paintCrop() {
  const cv = $('cropcv'), g = cv.getContext('2d'), k = cv.width / sw; g.clearRect(0, 0, cv.width, cv.height); g.drawImage(base, 0, 0);
  g.fillStyle = 'rgba(0,0,0,.5)'; const r = { x: sel.x * k, y: sel.y * k, w: sel.w * k, h: sel.h * k };
  g.fillRect(0, 0, cv.width, r.y); g.fillRect(0, r.y + r.h, cv.width, cv.height - r.y - r.h); g.fillRect(0, r.y, r.x, r.h); g.fillRect(r.x + r.w, r.y, cv.width - r.x - r.w, r.h);
  g.strokeStyle = '#8fb4ff'; g.lineWidth = 2; g.strokeRect(r.x + 1, r.y + 1, Math.max(1, r.w - 2), Math.max(1, r.h - 2));
}
function syncCrop() { ctl.x.value = sel.x; ctl.y.value = sel.y; ctl.cw.value = sel.w; ctl.ch.value = sel.h; paintCrop(); }
const ratio = () => { const r = v('ratio'); if (r === 'free') return 0; const [a, b] = r.split(':'); return a / b; };
function cropEvents() {
  const cv = $('cropcv'); let mode = null, o = null;
  const pt = (e) => { const b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * sw / b.width, y: (e.clientY - b.top) * sh / b.height }; };
  cv.addEventListener('pointerdown', (e) => { if (!src) return; cv.setPointerCapture(e.pointerId); const p = pt(e); mode = sel && p.x >= sel.x && p.x <= sel.x + sel.w && p.y >= sel.y && p.y <= sel.y + sel.h && (sel.w < sw || sel.h < sh) ? 'move' : 'new'; o = { p, s: { ...sel } }; });
  cv.addEventListener('pointermove', (e) => { if (!mode) return; const p = pt(e);
    if (mode === 'move') sel = clampRect({ x: Math.min(Math.max(0, o.s.x + p.x - o.p.x), sw - o.s.w), y: Math.min(Math.max(0, o.s.y + p.y - o.p.y), sh - o.s.h), w: o.s.w, h: o.s.h }, sw, sh);
    else sel = dragRect(o.p.x, o.p.y, p.x, p.y, sw, sh, ratio()); syncCrop(); schedule(); });
  const end = () => { mode = null; }; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  const num = () => { if (!src) return; sel = clampRect({ x: +v('x') || 0, y: +v('y') || 0, w: +v('cw') || 1, h: +v('ch') || 1 }, sw, sh); paintCrop(); schedule(); };
  ['x', 'y', 'cw', 'ch'].forEach((k) => ctl[k].addEventListener('change', () => { num(); syncCrop(); }));
  ctl.ratio.addEventListener('change', () => { const r = ratio(); if (r && src) { sel = clampRect({ ...sel, h: sel.w / r }, sw, sh); if (sel.w / sel.h > r + 0.01) sel = clampRect({ ...sel, w: sel.h * r }, sw, sh); syncCrop(); schedule(); } });
}
// ---- wiring ----
$('file').addEventListener('change', (e) => { if (e.target.files[0]) load(e.target.files[0]); });
const drop = $('drop'); ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => { const f = e.dataTransfer.files[0]; if (f) load(f); });
document.querySelectorAll('[data-f]').forEach((e) => e.addEventListener('input', () => {
  if (op === 'resize' && src && v('lock') && (e === ctl.w || e === ctl.h)) { const d = resizeDims(sw, sh, { width: v('w'), height: v('h'), lock: true }, e === ctl.h ? 'height' : 'width'); if (d.w > 0 && d.h > 0) { if (e === ctl.h) ctl.w.value = d.w; else ctl.h.value = d.h; } }
  if (qv && ctl.q) qv.textContent = Math.round(quality() * 100); if (e.id !== 'file') schedule(); }));
$('dl').onclick = () => { if (!outBlob) return; const a = document.createElement('a'); a.href = outUrl; a.download = $('dl').dataset.name || 'image'; a.click(); };
$('reset').onclick = () => { seq++; file = src = null; sel = null; $('file').value = ''; Object.entries(ctl).forEach(([k, e]) => { if (e.type === 'checkbox') e.checked = defs[k]; else e.value = defs[k]; }); if (qv) qv.textContent = defs.q; cleanOut(); say(''); $('opts').hidden = true; $('before-box').hidden = true; $('before').replaceChildren(); if ($('cropcv')) $('cropcv').hidden = true; if ($('fav')) { favs.forEach((f) => URL.revokeObjectURL(f.url)); favs = []; $('fav').replaceChildren(); } srcUrl = reUrl(srcUrl); };
if (op === 'crop') cropEvents();
if (op === 'favicon') $('copysnip').onclick = async () => { try { await navigator.clipboard.writeText($('snip').textContent); say('Copied the HTML snippet.', 'ok'); } catch { say('Copy failed; select the snippet manually.'); } };
