// Pure image helpers (no DOM).
export const MAX_BYTES = 50 * 1024 * 1024, MAX_PIXELS = 100e6, MAX_SIDE = 16384;
export const FORMATS = { 'image/jpeg': { ext: 'jpg', name: 'JPG' }, 'image/png': { ext: 'png', name: 'PNG' }, 'image/webp': { ext: 'webp', name: 'WebP' } };
export const formatBytes = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
export const outName = (name, suffix, mime) => `${(name || 'image').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '_') || 'image'}${suffix}.${FORMATS[mime]?.ext || 'png'}`;
export function checkFile(f) {
  if (!f) throw new Error('Choose an image file first.');
  if (!/^image\//.test(f.type) && !/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(f.name)) throw new Error('That is not an image file. Use JPG, PNG, WebP, GIF or BMP.');
  if (f.type === 'image/svg+xml') throw new Error('SVG is not supported here. Use a JPG, PNG or WebP image.');
  if (f.size === 0) throw new Error('That file is empty.');
  if (f.size > MAX_BYTES) throw new Error(`That file is ${formatBytes(f.size)}; the limit is ${formatBytes(MAX_BYTES)}.`);
}
export function checkDims(w, h) {
  if (!(w >= 1 && h >= 1)) throw new Error('Enter a width and height of at least 1 pixel.');
  if (w > MAX_SIDE || h > MAX_SIDE) throw new Error(`The largest side allowed is ${MAX_SIDE}px.`);
  if (w * h > MAX_PIXELS) throw new Error('That size is too large for your browser (over 100 megapixels).');
}
// New size when one side is edited; lock keeps the source aspect ratio.
export function resizeDims(sw, sh, { width, height, lock }, edited) {
  let w = Math.round(+width), h = Math.round(+height);
  if (lock) { if (edited === 'height') w = Math.round(h * sw / sh); else h = Math.round(w * sh / sw); }
  return { w, h };
}
export const clampRect = (r, W, H) => { const x = Math.min(Math.max(0, Math.round(r.x)), W - 1), y = Math.min(Math.max(0, Math.round(r.y)), H - 1); return { x, y, w: Math.max(1, Math.min(Math.round(r.w), W - x)), h: Math.max(1, Math.min(Math.round(r.h), H - y)) }; };
// Rectangle from a drag (x0,y0)→(x1,y1) in image pixels, optionally forced to ratio (w/h).
export function dragRect(x0, y0, x1, y1, W, H, ratio) {
  x1 = Math.min(Math.max(x1, 0), W); y1 = Math.min(Math.max(y1, 0), H);
  let dx = x1 - x0, dy = y1 - y0;
  if (ratio) { const sx = Math.sign(dx) || 1, sy = Math.sign(dy) || 1; let w = Math.abs(dx), h = Math.abs(dy); if (w / ratio > h) w = h * ratio; else h = w / ratio;
    const maxW = sx > 0 ? W - x0 : x0, maxH = sy > 0 ? H - y0 : y0; if (w > maxW) { w = maxW; h = w / ratio; } if (h > maxH) { h = maxH; w = h * ratio; } dx = sx * w; dy = sy * h; }
  return clampRect({ x: Math.min(x0, x0 + dx), y: Math.min(y0, y0 + dy), w: Math.abs(dx), h: Math.abs(dy) }, W, H);
}
export const coverSquare = (w, h) => { const s = Math.min(w, h); return { sx: Math.round((w - s) / 2), sy: Math.round((h - s) / 2), s }; };
// ICO file containing PNG images: [{size, bytes:Uint8Array}] (sizes ≤ 256).
export function buildIco(imgs) {
  const n = imgs.length, head = 6 + 16 * n, total = head + imgs.reduce((a, i) => a + i.bytes.length, 0), out = new Uint8Array(total), v = new DataView(out.buffer);
  v.setUint16(2, 1, true); v.setUint16(4, n, true); let off = head;
  imgs.forEach((im, i) => { const p = 6 + 16 * i; out[p] = im.size >= 256 ? 0 : im.size; out[p + 1] = out[p] ; v.setUint16(p + 4, 1, true); v.setUint16(p + 6, 32, true); v.setUint32(p + 8, im.bytes.length, true); v.setUint32(p + 12, off, true); out.set(im.bytes, off); off += im.bytes.length; });
  return out;
}
