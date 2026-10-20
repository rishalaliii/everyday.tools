import test from 'node:test';
import assert from 'node:assert/strict';
import { formatBytes, outName, checkFile, checkDims, resizeDims, clampRect, dragRect, coverSquare, buildIco } from '../assets/js/img.js';
test('names & sizes', () => {
  assert.equal(formatBytes(512), '512 B'); assert.equal(formatBytes(2048), '2.0 KB'); assert.equal(formatBytes(3 * 1048576), '3.00 MB');
  assert.equal(outName('My Photo.final.PNG', '-small', 'image/webp'), 'My_Photo.final-small.webp');
});
test('validation', () => {
  assert.throws(() => checkFile(null)); assert.throws(() => checkFile({ name: 'a.pdf', type: 'application/pdf', size: 5 }));
  assert.throws(() => checkFile({ name: 'a.svg', type: 'image/svg+xml', size: 5 })); assert.throws(() => checkFile({ name: 'a.png', type: 'image/png', size: 0 }));
  assert.throws(() => checkFile({ name: 'a.png', type: 'image/png', size: 60e6 })); checkFile({ name: 'a.png', type: 'image/png', size: 5 });
  assert.throws(() => checkDims(0, 10)); assert.throws(() => checkDims(20000, 10)); assert.throws(() => checkDims(15000, 15000)); checkDims(1000, 1000);
});
test('resizeDims', () => {
  assert.deepEqual(resizeDims(2000, 1000, { width: 500, height: 999, lock: true }, 'width'), { w: 500, h: 250 });
  assert.deepEqual(resizeDims(2000, 1000, { width: 999, height: 300, lock: true }, 'height'), { w: 600, h: 300 });
  assert.deepEqual(resizeDims(2000, 1000, { width: 500, height: 500, lock: false }, 'width'), { w: 500, h: 500 });
});
test('crop', () => {
  assert.deepEqual(clampRect({ x: -5, y: 90, w: 500, h: 50 }, 100, 100), { x: 0, y: 90, w: 100, h: 10 });
  assert.deepEqual(dragRect(10, 10, 60, 40, 100, 100), { x: 10, y: 10, w: 50, h: 30 });
  assert.deepEqual(dragRect(60, 40, 10, 10, 100, 100), { x: 10, y: 10, w: 50, h: 30 });
  assert.deepEqual(dragRect(0, 0, 80, 80, 100, 100, 2), { x: 0, y: 0, w: 80, h: 40 });
  const r = dragRect(90, 90, 200, 200, 100, 100, 1); assert.ok(r.x + r.w <= 100 && r.y + r.h <= 100);
  assert.deepEqual(coverSquare(300, 100), { sx: 100, sy: 0, s: 100 });
});
test('ico', () => {
  const a = new Uint8Array([1, 2, 3]), b = new Uint8Array([4, 5]); const o = buildIco([{ size: 16, bytes: a }, { size: 256, bytes: b }]); const v = new DataView(o.buffer);
  assert.equal(v.getUint16(2, true), 1); assert.equal(v.getUint16(4, true), 2); assert.equal(o[6], 16); assert.equal(o[22], 0);
  assert.equal(v.getUint32(6 + 12, true), 38); assert.equal(v.getUint32(22 + 12, true), 41); assert.equal(o.length, 43); assert.deepEqual([...o.slice(38, 41)], [1, 2, 3]);
});
