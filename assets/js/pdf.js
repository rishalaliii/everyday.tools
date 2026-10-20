// PDF logic (no DOM). The pdf-lib API object is passed in (`lib`) so everything is unit-testable in Node: tests/pdf.test.mjs.
// Library: @cantoo/pdf-lib 2.11.1 (MIT, maintained fork of pdf-lib), vendored in assets/js/vendor/pdf-lib.min.js.
export const MAX_FILE = 100 * 1024 * 1024; // per file
export const MAX_FILES = 50;
export class PdfError extends Error {}

export const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792] }; // points
export const baseName = (n) => String(n || 'document').replace(/\.[^.]+$/, '').replace(/[^\w\-. ()]+/g, '_').trim() || 'document';
export const fmtBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(1)} MB`);

/** Parse "1-3, 5, 8-" into groups of 0-based page indexes (one group per comma-separated item).
 *  "all" = every page. Throws PdfError with a specific, user-readable message. */
export function parseRanges(input, total) {
  const s = String(input ?? '').replace(/[–—−]/g, '-').trim();
  if (!s) throw new PdfError('Enter the pages, for example 1-3, 5, 8-.');
  if (!(total >= 1)) throw new PdfError('Open a PDF first.');
  const groups = [];
  for (const raw of s.split(/[,;]+/)) {
    const tok = raw.trim().toLowerCase(); if (!tok) continue;
    if (tok === 'all') { groups.push(Array.from({ length: total }, (_, i) => i)); continue; }
    const m = tok.match(/^(\d+)\s*(?:(-)\s*(\d*))?$/);
    if (!m) throw new PdfError(`"${raw.trim()}" is not a valid page or range. Use numbers like 3, 2-5 or 8-.`);
    const a = +m[1], b = m[2] ? (m[3] === '' ? total : +m[3]) : a;
    for (const n of [a, b]) if (n < 1 || n > total) throw new PdfError(`Page ${n} does not exist. This PDF has pages 1 to ${total}.`);
    if (a > b) throw new PdfError(`The range ${a}-${b} runs backwards. Write it as ${b}-${a}.`);
    groups.push(Array.from({ length: b - a + 1 }, (_, i) => a - 1 + i));
  }
  if (!groups.length) throw new PdfError('Enter the pages, for example 1-3, 5, 8-.');
  return groups;
}
/** Group page indexes back into a compact label: [0,1,2,4] -> "1-3,5" */
export function rangeLabel(idx) {
  const out = []; let i = 0;
  while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j++; out.push(j > i ? `${idx[i] + 1}-${idx[j] + 1}` : `${idx[i] + 1}`); i = j + 1; }
  return out.join(',');
}
/** Split points: chunks of n pages (n >= 1). */
export function chunkGroups(total, n) {
  n = Math.floor(+n);
  if (!(n >= 1)) throw new PdfError('Enter a number of pages per file (1 or more).');
  const g = []; for (let i = 0; i < total; i += n) g.push(Array.from({ length: Math.min(n, total - i) }, (_, k) => i + k)); return g;
}

// The "%PDF-" marker must appear in the first 1 KB (some files have a few junk bytes before it).
const looksPdf = (u8) => { let s = ''; for (let i = 0; i < Math.min(u8.length, 1024); i++) s += String.fromCharCode(u8[i]); return s.includes('%PDF-'); };
/** Load a PDF with friendly errors. `name` is used in messages. */
export async function loadPdf(lib, bytes, name = 'This file') {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (!looksPdf(u8)) throw new PdfError(`"${name}" is not a PDF file.`);
  let doc;
  try { doc = await lib.PDFDocument.load(u8, { updateMetadata: false }); }
  catch (e) {
    if (/encrypt/i.test(e.message)) throw new PdfError(`"${name}" is password-protected or encrypted. Remove the protection first, then try again.`);
    throw new PdfError(`"${name}" could not be read. It may be damaged or not a real PDF.`);
  }
  let n; try { n = doc.getPageCount(); } catch { throw new PdfError(`"${name}" could not be read. It may be damaged or not a real PDF.`); }
  if (n < 1) throw new PdfError(`"${name}" has no pages.`);
  return doc;
}
const finish = async (doc, title) => { doc.setProducer('EverydayTools'); doc.setCreator('EverydayTools'); if (title) doc.setTitle(title); return doc.save(); };

export async function mergePdfs(lib, files /* [{name, bytes}] */, onProgress = () => {}) {
  if (files.length < 2) throw new PdfError('Add at least two PDF files to merge.');
  const out = await lib.PDFDocument.create();
  for (let i = 0; i < files.length; i++) {
    const src = await loadPdf(lib, files[i].bytes, files[i].name);
    const pages = await out.copyPages(src, src.getPageIndices()); pages.forEach((p) => out.addPage(p)); onProgress(i + 1, files.length);
  }
  return { bytes: await finish(out, 'Merged PDF'), pages: out.getPageCount() };
}
/** New PDF made of the given 0-based page indexes, in the given order (duplicates allowed). Used by extract, reorder and split. */
export async function buildFrom(lib, srcDoc, indexes) {
  const n = srcDoc.getPageCount();
  for (const i of indexes) if (!Number.isInteger(i) || i < 0 || i >= n) throw new PdfError(`Page ${i + 1} does not exist.`);
  if (!indexes.length) throw new PdfError('Keep at least one page.');
  const out = await lib.PDFDocument.create(); const pages = await out.copyPages(srcDoc, indexes); pages.forEach((p) => out.addPage(p));
  return finish(out);
}
export async function splitPdf(lib, srcDoc, groups) { const outs = []; for (const g of groups) outs.push({ bytes: await buildFrom(lib, srcDoc, g), pages: g.length, label: rangeLabel(g) }); return outs; }
export async function rotatePdf(lib, srcDoc, indexes, angle) {
  if (![90, 180, 270, -90].includes(+angle)) throw new PdfError('Choose 90°, 180° or 270°.');
  const set = new Set(indexes);
  srcDoc.getPages().forEach((p, i) => { if (set.has(i)) p.setRotation(lib.degrees((((p.getRotation().angle + angle) % 360) + 360) % 360)); });
  return finish(srcDoc);
}
/** Scale (w,h) to fit inside the page minus margin, centred. */
export function fitImage(iw, ih, pw, ph, margin = 0) {
  const aw = pw - 2 * margin, ah = ph - 2 * margin, k = Math.min(aw / iw, ah / ih);
  const w = iw * k, h = ih * k; return { x: (pw - w) / 2, y: (ph - h) / 2, w, h };
}
/** images: [{bytes, kind:'jpg'|'png', width, height}] */
export async function imagesToPdf(lib, images, { size = 'a4', orientation = 'auto', margin = 0 } = {}) {
  if (!images.length) throw new PdfError('Add at least one image.');
  const out = await lib.PDFDocument.create();
  for (const im of images) {
    const emb = im.kind === 'jpg' ? await out.embedJpg(im.bytes) : await out.embedPng(im.bytes);
    let pw, ph;
    if (size === 'fit') { pw = emb.width; ph = emb.height; }
    else { [pw, ph] = PAGE_SIZES[size] || PAGE_SIZES.a4; const land = orientation === 'landscape' || (orientation === 'auto' && emb.width > emb.height); if (land) [pw, ph] = [ph, pw]; }
    const page = out.addPage([pw, ph]); const r = fitImage(emb.width, emb.height, pw, ph, size === 'fit' ? 0 : margin);
    page.drawImage(emb, { x: r.x, y: r.y, width: r.w, height: r.h });
  }
  return { bytes: await finish(out, 'Images'), pages: out.getPageCount() };
}
/** Sniff JPG / PNG from magic bytes, else null. */
export function imageKind(b) { if (b[0] === 0xff && b[1] === 0xd8) return 'jpg'; if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png'; return null; }

// ---- minimal store-only ZIP writer (for "download all" after Split) ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function makeZip(files /* [{name, bytes}] */) {
  const enc = new TextEncoder(), parts = [], central = []; let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.bytes), size = f.bytes.length;
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint32(14, crc, true); h.setUint32(18, size, true); h.setUint32(22, size, true); h.setUint16(26, name.length, true);
    parts.push(new Uint8Array(h.buffer), name, f.bytes);
    const c = new DataView(new ArrayBuffer(46)); c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint32(16, crc, true); c.setUint32(20, size, true); c.setUint32(24, size, true); c.setUint16(28, name.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), name); offset += 30 + name.length + size;
  }
  const csize = central.reduce((a, b) => a + b.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0; for (const a of all) { out.set(a, p); p += a.length; } return out;
}

/** EXIF orientation (1-8) of a JPEG, or 1. pdf-lib embeds JPEG bytes as-is and ignores it, so rotated photos are re-encoded via canvas when this is not 1. */
export function jpegOrientation(b) {
  if (b[0] !== 0xff || b[1] !== 0xd8) return 1;
  let p = 2;
  while (p + 4 < b.length && b[p] === 0xff) {
    const m = b[p + 1], len = (b[p + 2] << 8) | b[p + 3];
    if (m === 0xe1 && b[p + 4] === 0x45 && b[p + 5] === 0x78 && b[p + 6] === 0x69 && b[p + 7] === 0x66) { // "Exif"
      const t = p + 10, le = b[t] === 0x49, u16 = (o) => (le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]), u32 = (o) => (le ? (u16(o) | (u16(o + 2) << 16)) >>> 0 : ((u16(o) << 16) | u16(o + 2)) >>> 0);
      let ifd = t + u32(t + 4); const n = u16(ifd); ifd += 2;
      for (let i = 0; i < n; i++) { const e = ifd + i * 12; if (e + 12 > b.length) break; if (u16(e) === 0x0112) { const v = u16(e + 8); return v >= 1 && v <= 8 ? v : 1; } }
      return 1;
    }
    if (m === 0xda) break; p += 2 + len;
  }
  return 1;
}
