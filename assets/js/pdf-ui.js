// Browser UI for the PDF tools. body[data-op] = merge | split | extract | rotate | reorder | img2pdf. Files never leave the browser.
import * as P from './pdf.js';
const op = document.body.dataset.op, $ = (id) => document.getElementById(id), st = $('status');
const say = (m, k = 'error') => { st.textContent = m; st.className = 'status ' + k; st.hidden = !m; };
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
let libPromise = null;
function getLib() { // load the vendored pdf-lib only when first needed
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  return (libPromise ||= new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = new URL('./vendor/pdf-lib.min.js', import.meta.url).href;
    s.onload = () => (window.PDFLib ? res(window.PDFLib) : rej(new Error('x'))); s.onerror = () => { libPromise = null; rej(new Error('x')); }; document.head.append(s);
  })).catch(() => { throw new P.PdfError('Could not load the PDF engine. Check your connection and reload the page.'); });
}
let outputs = [], urls = [], busy = false, seq = 0;
const clearOut = () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; outputs = []; $('dl').disabled = true; const z = $('dlzip'); if (z) z.hidden = true; $('result').replaceChildren(); const pl = $('parts'); if (pl) pl.replaceChildren(); };
const blobUrl = (bytes, type = 'application/pdf') => { const u = URL.createObjectURL(new Blob([bytes], { type })); urls.push(u); return u; };
function save(url, name) { const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); }
function summary(...pairs) { $('result').replaceChildren(...pairs.map(([k, v]) => el('div', { className: 'stat' }, el('b', { textContent: v }), k))); }
async function readFile(f) {
  if (f.size > P.MAX_FILE) throw new P.PdfError(`"${f.name}" is ${P.fmtBytes(f.size)}. The limit is ${P.fmtBytes(P.MAX_FILE)} per file.`);
  if (!f.size) throw new P.PdfError(`"${f.name}" is empty.`);
  return new Uint8Array(await f.arrayBuffer());
}
const guard = (fn) => async (...a) => { if (busy) return; busy = true; $('go').disabled = true; try { await fn(...a); } catch (e) { clearOut(); say(e instanceof P.PdfError ? e.message : 'Something went wrong while processing this file. It may be damaged or too large for your browser.'); if (!(e instanceof P.PdfError)) console.error(e); } finally { busy = false; $('go').disabled = false; } };
const dropZone = (add) => { const d = $('drop'); ['dragenter', 'dragover'].forEach((t) => d.addEventListener(t, (e) => { e.preventDefault(); d.classList.add('over'); })); ['dragleave', 'drop'].forEach((t) => d.addEventListener(t, (e) => { e.preventDefault(); d.classList.remove('over'); })); d.addEventListener('drop', (e) => add([...e.dataTransfer.files])); };
const iconBtn = (label, text, fn, disabled) => el('button', { type: 'button', textContent: text, title: label, disabled, onclick: fn, ariaLabel: label });

// ---------- ordered file list (merge, images-to-pdf) ----------
let files = []; // {id, name, size, bytes, pages?, kind?, w?, h?}
let uid = 0;
function renderFiles() {
  const ul = $('flist'); ul.replaceChildren(...files.map((f, i) => el('li', {}, el('span', { className: 'fn', textContent: `${i + 1}. ${f.name}` }), el('span', { className: 'mut', textContent: ` ${P.fmtBytes(f.size)}${f.pages ? ` · ${f.pages} page${f.pages > 1 ? 's' : ''}` : f.w ? ` · ${f.w}×${f.h}px` : ''}` }),
    iconBtn(`Move ${f.name} up`, '↑', () => move(i, -1), i === 0), iconBtn(`Move ${f.name} down`, '↓', () => move(i, 1), i === files.length - 1), iconBtn(`Remove ${f.name}`, '✕', () => { files.splice(i, 1); clearOut(); renderFiles(); }))));
  $('opts').hidden = !files.length; $('go').disabled = !files.length;
  $('count').textContent = files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : '';
}
function move(i, d) { const j = i + d; if (j < 0 || j >= files.length) return; [files[i], files[j]] = [files[j], files[i]]; clearOut(); renderFiles(); }
async function prepImage(f, bytes) {
  let kind = P.imageKind(bytes), w = 0, h = 0;
  const needsCanvas = !kind || (kind === 'jpg' && P.jpegOrientation(bytes) > 1);
  let bmp; try { bmp = await createImageBitmap(f); } catch { if (needsCanvas || !kind) throw new P.PdfError(`"${f.name}" could not be read as an image. Use JPG, PNG, WebP, GIF or BMP.`); }
  if (bmp) { w = bmp.width; h = bmp.height; if (w * h > 100e6) throw new P.PdfError(`"${f.name}" is ${w}×${h}px, which is too large to process in a browser.`); }
  if (needsCanvas) { // re-encode: rotated JPEGs (EXIF) and formats pdf-lib cannot embed (WebP, GIF, BMP...)
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d');
    const asJpg = kind === 'jpg'; if (asJpg) { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); } g.drawImage(bmp, 0, 0);
    const blob = await new Promise((r) => c.toBlob(r, asJpg ? 'image/jpeg' : 'image/png', 0.92)); if (!blob) throw new P.PdfError(`"${f.name}" is too large to convert in your browser.`);
    bytes = new Uint8Array(await blob.arrayBuffer()); kind = asJpg ? 'jpg' : 'png';
  }
  if (bmp && bmp.close) bmp.close(); return { bytes, kind, w, h };
}
async function addFiles(list) {
  clearOut(); say('');
  const lib = await getLib().catch((e) => { say(e.message); return null; }); if (!lib) return;
  const problems = [];
  for (const f of list) {
    if (files.length >= P.MAX_FILES) { problems.push(`Only ${P.MAX_FILES} files are allowed at once.`); break; }
    try {
      const bytes = await readFile(f);
      if (op === 'merge') { const d = await P.loadPdf(lib, bytes, f.name); files.push({ id: ++uid, name: f.name, size: f.size, bytes, pages: d.getPageCount() }); }
      else { if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name)) throw new P.PdfError(`"${f.name}" is not an image.`); const im = await prepImage(f, bytes); files.push({ id: ++uid, name: f.name, size: f.size, ...im }); }
    } catch (e) { problems.push(e instanceof P.PdfError ? e.message : `"${f.name}" could not be read.`); }
  }
  renderFiles(); $('file').value = '';
  if (problems.length) say(problems.join(' '), files.length ? 'warn' : 'error');
}

// ---------- single PDF (split, extract, rotate, reorder) ----------
let cur = null; // {name, bytes, pages}
let order = []; // reorder: 0-based original page indexes in the new order
async function openPdf(f) {
  clearOut(); say(''); cur = null; $('opts').hidden = true; $('go').disabled = true; $('fileinfo').textContent = '';
  try {
    const lib = await getLib(), bytes = await readFile(f), doc = await P.loadPdf(lib, bytes, f.name);
    cur = { name: f.name, bytes, pages: doc.getPageCount() }; $('fileinfo').textContent = `${f.name} · ${cur.pages} page${cur.pages > 1 ? 's' : ''} · ${P.fmtBytes(f.size)}`;
    $('opts').hidden = false; $('go').disabled = false;
    if (op === 'reorder') { order = doc.getPageIndices(); renderOrder(); }
    if (op === 'split' || op === 'extract' || op === 'rotate') { const r = $('ranges'); if (r && !r.value && op === 'rotate') r.value = 'all'; }
  } catch (e) { say(e instanceof P.PdfError ? e.message : 'This file could not be opened.'); $('file').value = ''; }
}
function renderOrder() {
  const ul = $('plist'); ul.replaceChildren(...order.map((p, i) => el('li', {}, el('span', { className: 'fn', textContent: `Position ${i + 1}: original page ${p + 1}` }),
    iconBtn(`Move page ${p + 1} up`, '↑', () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; clearOut(); renderOrder(); }, i === 0), iconBtn(`Move page ${p + 1} down`, '↓', () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; clearOut(); renderOrder(); }, i === order.length - 1),
    iconBtn(`Delete page ${p + 1}`, '✕', () => { order.splice(i, 1); clearOut(); renderOrder(); }, order.length === 1))));
  $('order').value = order.map((p) => p + 1).join(', '); $('count').textContent = `${order.length} of ${cur.pages} pages kept`;
}

// ---------- actions ----------
const act = guard(async () => {
  const my = ++seq; clearOut(); say(''); const lib = await getLib();
  if (op === 'merge') {
    if (files.length < 2) throw new P.PdfError('Add at least two PDF files to merge.');
    say('Merging…', 'info'); const r = await P.mergePdfs(lib, files); if (my !== seq) return;
    outputs = [{ name: 'merged.pdf', url: blobUrl(r.bytes) }]; summary(['Files merged', files.length], ['Pages', r.pages], ['Size', P.fmtBytes(r.bytes.length)]);
  } else if (op === 'img2pdf') {
    say('Creating PDF…', 'info'); const r = await P.imagesToPdf(lib, files, { size: $('size').value, orientation: $('orient').value, margin: +$('margin').value });
    outputs = [{ name: 'images.pdf', url: blobUrl(r.bytes) }]; summary(['Images', files.length], ['Pages', r.pages], ['Size', P.fmtBytes(r.bytes.length)]);
  } else {
    if (!cur) throw new P.PdfError('Choose a PDF file first.');
    const doc = await P.loadPdf(lib, cur.bytes, cur.name), base = P.baseName(cur.name);
    if (op === 'extract') {
      const idx = P.parseRanges($('ranges').value, cur.pages).flat(), bytes = await P.buildFrom(lib, doc, idx);
      outputs = [{ name: `${base}-pages-${P.rangeLabel(idx).replace(/,/g, '_')}.pdf`.slice(0, 120), url: blobUrl(bytes) }]; summary(['Pages extracted', idx.length], ['Size', P.fmtBytes(bytes.length)]);
    } else if (op === 'rotate') {
      const idx = [...new Set(P.parseRanges($('ranges').value, cur.pages).flat())], bytes = await P.rotatePdf(lib, doc, idx, +$('angle').value);
      outputs = [{ name: `${base}-rotated.pdf`, url: blobUrl(bytes) }]; summary(['Pages rotated', idx.length], ['Angle', $('angle').selectedOptions[0].textContent]);
    } else if (op === 'reorder') {
      if (!order.length) throw new P.PdfError('Keep at least one page.');
      const bytes = await P.buildFrom(lib, doc, order); outputs = [{ name: `${base}-reordered.pdf`, url: blobUrl(bytes) }]; summary(['Pages', order.length], ['Size', P.fmtBytes(bytes.length)]);
    } else if (op === 'split') {
      const mode = $('mode').value; let groups;
      if (mode === 'ranges') groups = P.parseRanges($('ranges').value, cur.pages); else if (mode === 'every') groups = P.chunkGroups(cur.pages, $('every').value); else groups = P.chunkGroups(cur.pages, 1);
      if (groups.length > 300) throw new P.PdfError('That would create more than 300 files. Use bigger ranges.');
      const parts = await P.splitPdf(lib, doc, groups); if (my !== seq) return; const pad = String(parts.length).length;
      outputs = parts.map((p, i) => ({ name: `${base}-part-${String(i + 1).padStart(pad, '0')}-pages-${p.label.replace(/,/g, '_')}.pdf`.slice(0, 120), bytes: p.bytes, url: blobUrl(p.bytes), pages: p.pages }));
      $('parts').replaceChildren(...outputs.map((o) => el('li', {}, el('a', { href: o.url, download: o.name, textContent: o.name }), el('span', { className: 'mut', textContent: ` ${o.pages} page${o.pages > 1 ? 's' : ''} · ${P.fmtBytes(o.bytes.length)}` }))));
      summary(['Files created', parts.length], ['Source pages', cur.pages]); $('dlzip').hidden = parts.length < 2;
    }
  }
  say('Done. Your file is ready to download.', 'ok'); $('dl').disabled = false;
});
$('go').addEventListener('click', act);
$('dl').addEventListener('click', () => { if (!outputs.length) return say('Nothing to download yet.'); if (outputs.length === 1) save(outputs[0].url, outputs[0].name); else outputs.forEach((o, i) => setTimeout(() => save(o.url, o.name), i * 250)); });
const z = $('dlzip'); if (z) z.addEventListener('click', () => { const bytes = P.makeZip(outputs.map((o) => ({ name: o.name, bytes: o.bytes }))); const u = blobUrl(bytes, 'application/zip'); save(u, `${P.baseName(cur.name)}-split.zip`); });
$('reset').addEventListener('click', () => { seq++; clearOut(); say(''); files = []; cur = null; order = []; $('file').value = ''; if ($('flist')) renderFiles(); if ($('fileinfo')) $('fileinfo').textContent = ''; if ($('plist')) $('plist').replaceChildren(); $('count').textContent = ''; document.querySelectorAll('[data-d]').forEach((e) => { e.value = e.dataset.d; }); if (op !== 'merge' && op !== 'img2pdf') { $('opts').hidden = true; $('go').disabled = true; } syncMode(); });
$('file').addEventListener('change', (e) => { const l = [...e.target.files]; if (!l.length) return; if (op === 'merge' || op === 'img2pdf') addFiles(l); else openPdf(l[0]); });
dropZone((l) => { if (!l.length) return; if (op === 'merge' || op === 'img2pdf') addFiles(l); else openPdf(l[0]); });
function syncMode() { const m = $('mode'); if (!m) return; $('ranges-wrap').hidden = m.value !== 'ranges'; $('every-wrap').hidden = m.value !== 'every'; }
if ($('mode')) $('mode').addEventListener('change', () => { syncMode(); clearOut(); });
document.querySelectorAll('#opts input, #opts select').forEach((e) => e.addEventListener('input', () => { if (!busy) { clearOut(); } }));
if (op === 'reorder') {
  $('reverse').addEventListener('click', () => { order.reverse(); clearOut(); renderOrder(); });
  $('restore').addEventListener('click', () => { order = Array.from({ length: cur.pages }, (_, i) => i); clearOut(); renderOrder(); });
  $('apply-order').addEventListener('click', () => { try { const idx = P.parseRanges($('order').value, cur.pages).flat(); order = idx; clearOut(); renderOrder(); say(''); } catch (e) { say(e.message); } });
}
if (op === 'merge' || op === 'img2pdf') renderFiles(); else { $('go').disabled = true; syncMode(); }
