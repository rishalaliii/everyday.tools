import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import * as P from '../assets/js/pdf.js';
import { loadPdfLib } from './pdflib-loader.mjs';
const lib = loadPdfLib();
// Fixture: page i (1-based) is (100 + 10*i) points wide so every page is identifiable after any operation.
async function make(n, start = 1) { const d = await lib.PDFDocument.create(); for (let i = 0; i < n; i++) d.addPage([100 + 10 * (start + i), 200]); return new Uint8Array(await d.save()); }
const widths = async (bytes) => (await lib.PDFDocument.load(bytes)).getPages().map((p) => Math.round(p.getWidth()));
const fx = (n) => new Uint8Array(fs.readFileSync(new URL('./e2e/fixtures/' + n, import.meta.url)));

test('parseRanges: valid forms', () => {
  assert.deepEqual(P.parseRanges('1-3, 5', 10), [[0, 1, 2], [4]]);
  assert.deepEqual(P.parseRanges('8-', 10), [[7, 8, 9]]);
  assert.deepEqual(P.parseRanges('all', 3), [[0, 1, 2]]);
  assert.deepEqual(P.parseRanges(' 2 – 3 ;5 ', 5), [[1, 2], [4]]); // en dash, semicolon, spaces
  assert.deepEqual(P.parseRanges('3,1,3', 3), [[2], [0], [2]]); // order and duplicates preserved
});
test('parseRanges: invalid input gives specific errors', () => {
  const bad = (s, n, re) => assert.throws(() => P.parseRanges(s, n), (e) => e instanceof P.PdfError && re.test(e.message), s);
  bad('', 5, /Enter the pages/); bad('  ', 5, /Enter the pages/); bad(',', 5, /Enter the pages/);
  bad('0', 5, /Page 0 does not exist/); bad('6', 5, /Page 6 does not exist.*1 to 5/); bad('1-9', 5, /Page 9/);
  bad('5-3', 5, /backwards/); bad('a-b', 5, /not a valid/); bad('1-2-3', 5, /not a valid/); bad('-3', 5, /not a valid/); bad('1.5', 5, /not a valid/);
  bad('1', 0, /Open a PDF/);
});
test('rangeLabel and chunkGroups', () => {
  assert.equal(P.rangeLabel([0, 1, 2, 4, 6, 7]), '1-3,5,7-8');
  assert.deepEqual(P.chunkGroups(5, 2), [[0, 1], [2, 3], [4]]);
  assert.deepEqual(P.chunkGroups(3, 10), [[0, 1, 2]]);
  assert.throws(() => P.chunkGroups(5, 0), P.PdfError); assert.throws(() => P.chunkGroups(5, 'x'), P.PdfError);
});
test('merge keeps order and page count', async () => {
  const r = await P.mergePdfs(lib, [{ name: 'a.pdf', bytes: await make(3, 1) }, { name: 'b.pdf', bytes: await make(2, 4) }]);
  assert.equal(r.pages, 5); assert.deepEqual(await widths(r.bytes), [110, 120, 130, 140, 150]);
  const rev = await P.mergePdfs(lib, [{ name: 'b.pdf', bytes: await make(2, 4) }, { name: 'a.pdf', bytes: await make(3, 1) }]);
  assert.deepEqual(await widths(rev.bytes), [140, 150, 110, 120, 130]);
});
test('merge errors: one file, non-PDF, damaged, encrypted (names the culprit)', async () => {
  const ok = await make(1);
  await assert.rejects(P.mergePdfs(lib, [{ name: 'a.pdf', bytes: ok }]), /at least two/);
  await assert.rejects(P.mergePdfs(lib, [{ name: 'a.pdf', bytes: ok }, { name: 'notes.txt', bytes: new TextEncoder().encode('hello world') }]), /"notes.txt" is not a PDF/);
  await assert.rejects(P.mergePdfs(lib, [{ name: 'a.pdf', bytes: ok }, { name: 'bad.pdf', bytes: new TextEncoder().encode('%PDF-1.4\nnonsense') }]), /"bad.pdf"/);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-')); const a = path.join(tmp, 'a.pdf'), e = path.join(tmp, 'e.pdf');
  fs.writeFileSync(a, ok);
  if (spawnSync('qpdf', ['--version']).status === 0) {
    execFileSync('qpdf', ['--encrypt', 'u', 'o', '256', '--', a, e]);
    await assert.rejects(P.mergePdfs(lib, [{ name: 'a.pdf', bytes: ok }, { name: 'locked.pdf', bytes: new Uint8Array(fs.readFileSync(e)) }]), /"locked.pdf" is password-protected/);
  }
});
test('extract pages in typed order, duplicates allowed', async () => {
  const src = await lib.PDFDocument.load(await make(6));
  assert.deepEqual(await widths(await P.buildFrom(lib, src, [4, 0, 0])), [150, 110, 110]);
  await assert.rejects(P.buildFrom(lib, src, [6]), /does not exist/); await assert.rejects(P.buildFrom(lib, src, []), /at least one/);
});
test('split by ranges / every N pages', async () => {
  const src = await lib.PDFDocument.load(await make(5));
  const parts = await P.splitPdf(lib, src, P.parseRanges('1-2, 3, 4-5', 5));
  assert.equal(parts.length, 3); assert.deepEqual(parts.map((p) => p.pages), [2, 1, 2]); assert.deepEqual(parts.map((p) => p.label), ['1-2', '3', '4-5']);
  assert.deepEqual(await widths(parts[2].bytes), [140, 150]);
  assert.equal((await P.splitPdf(lib, src, P.chunkGroups(5, 2))).length, 3);
  assert.equal((await P.splitPdf(lib, src, P.chunkGroups(5, 1))).length, 5);
});
test('rotate selected pages only; rotation accumulates and wraps', async () => {
  const rot = async (b) => (await lib.PDFDocument.load(b)).getPages().map((p) => p.getRotation().angle);
  let b = await P.rotatePdf(lib, await lib.PDFDocument.load(await make(3)), [0, 2], 90); assert.deepEqual(await rot(b), [90, 0, 90]);
  b = await P.rotatePdf(lib, await lib.PDFDocument.load(b), [0], 270); assert.deepEqual(await rot(b), [0, 0, 90]);
  b = await P.rotatePdf(lib, await lib.PDFDocument.load(b), [1, 2], 180); assert.deepEqual(await rot(b), [0, 180, 270]);
  await assert.rejects(P.rotatePdf(lib, await lib.PDFDocument.load(await make(1)), [0], 45), /90°/);
});
test('reorder / delete pages via buildFrom', async () => {
  const src = await lib.PDFDocument.load(await make(4));
  assert.deepEqual(await widths(await P.buildFrom(lib, src, [3, 2, 1, 0])), [140, 130, 120, 110]);
  assert.deepEqual(await widths(await P.buildFrom(lib, src, [1, 3])), [120, 140]);
});
test('images to PDF: JPG + PNG, page sizes, orientation, fit', async () => {
  const imgs = [{ bytes: fx('sample.jpg'), kind: P.imageKind(fx('sample.jpg')) }, { bytes: fx('sample.png'), kind: P.imageKind(fx('sample.png')) }, { bytes: fx('portrait.jpg'), kind: 'jpg' }];
  assert.deepEqual(imgs.map((i) => i.kind), ['jpg', 'png', 'jpg']);
  const a4 = await P.imagesToPdf(lib, imgs, { size: 'a4', orientation: 'auto', margin: 20 });
  assert.equal(a4.pages, 3); const d = await lib.PDFDocument.load(a4.bytes), s = d.getPages().map((p) => [Math.round(p.getWidth()), Math.round(p.getHeight())]);
  assert.deepEqual(s, [[842, 595], [842, 595], [595, 842]]); // landscape images -> landscape page, portrait -> portrait
  const fit = await lib.PDFDocument.load((await P.imagesToPdf(lib, imgs, { size: 'fit' })).bytes);
  assert.deepEqual(fit.getPages().map((p) => [p.getWidth(), p.getHeight()]), [[640, 400], [640, 400], [300, 500]]);
  const forced = await lib.PDFDocument.load((await P.imagesToPdf(lib, imgs, { size: 'letter', orientation: 'portrait' })).bytes);
  assert.deepEqual(forced.getPages().map((p) => [p.getWidth(), p.getHeight()]), [[612, 792], [612, 792], [612, 792]]);
  await assert.rejects(P.imagesToPdf(lib, []), /at least one image/);
  assert.equal(P.imageKind(new Uint8Array([1, 2, 3, 4])), null);
});
test('fitImage keeps aspect ratio inside margins and centres', () => {
  const r = P.fitImage(200, 100, 100, 100, 10); assert.deepEqual(r, { x: 10, y: 30, w: 80, h: 40 });
});
test('zip writer produces a valid archive (unzip -t, content round-trip)', () => {
  const files = [{ name: 'a.pdf', bytes: new Uint8Array([1, 2, 3, 4, 5]) }, { name: 'ünï.pdf', bytes: new Uint8Array(70000).fill(7) }];
  assert.equal(P.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  const z = P.makeZip(files); const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-')), f = path.join(tmp, 'x.zip'); fs.writeFileSync(f, z);
  const py = spawnSync('python3', ['-I', '-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(",".join(sorted(z.namelist())),len(z.read("a.pdf")),len(z.read(z.namelist()[1])))', f], { encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr); assert.match(py.stdout, /a\.pdf.* 5 70000/);
});
test('baseName / fmtBytes', () => { assert.equal(P.baseName('My Report.final.PDF'), 'My Report.final'); assert.equal(P.baseName('a/b?.pdf'), 'a_b_'); assert.equal(P.fmtBytes(1536), '1.5 KB'); });
test('jpegOrientation reads EXIF orientation (both byte orders) and defaults to 1', () => {
  const mk = (le, o) => { const w16 = (v) => (le ? [v & 255, v >> 8] : [v >> 8, v & 255]), w32 = (v) => (le ? [v & 255, (v >> 8) & 255, 0, 0] : [0, 0, (v >> 8) & 255, v & 255]);
    const tiff = [...(le ? [0x49, 0x49] : [0x4d, 0x4d]), ...w16(42), ...w32(8), ...w16(1), ...w16(0x0112), ...w16(3), 1, 0, 0, 0, ...w16(o), 0, 0, 0, 0, 0, 0];
    const seg = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]; const len = seg.length + 2;
    return new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...seg, 0xff, 0xda, 0, 2]); };
  assert.equal(P.jpegOrientation(mk(true, 6)), 6); assert.equal(P.jpegOrientation(mk(false, 3)), 3); assert.equal(P.jpegOrientation(mk(true, 9)), 1);
  assert.equal(P.jpegOrientation(fx('sample.jpg')), 1); assert.equal(P.jpegOrientation(new Uint8Array([1, 2, 3])), 1);
});
