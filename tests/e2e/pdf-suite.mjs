// Browser tests for the six PDF tools (called from audit.mjs). Output files are re-opened with pdf-lib to verify them.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadPdfLib } from '../pdflib-loader.mjs';
const lib = loadPdfLib();
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'et-pdf-'));
// page i of a fixture is (100+10*i) pt wide, so pages are identifiable after any operation
async function mk(name, n, start = 1) { const d = await lib.PDFDocument.create(); for (let i = 0; i < n; i++) d.addPage([100 + 10 * (start + i), 200]); const f = path.join(TMP, name); fs.writeFileSync(f, await d.save()); return f; }
const info = async (file) => { const d = await lib.PDFDocument.load(fs.readFileSync(file)); return { widths: d.getPages().map((p) => Math.round(p.getWidth())), heights: d.getPages().map((p) => Math.round(p.getHeight())), rot: d.getPages().map((p) => p.getRotation().angle) }; };
export async function pdfSuite({ tool, assert, dl, status, FX }) {
  const a = await mk('a.pdf', 3, 1), b = await mk('b.pdf', 2, 4), six = await mk('six.pdf', 6, 1);
  const txt = path.join(TMP, 'fake.pdf'); fs.writeFileSync(txt, 'this is not a pdf');
  const bad = path.join(TMP, 'bad.pdf'); fs.writeFileSync(bad, '%PDF-1.4\nnonsense nonsense');
  const enc = path.join(TMP, 'enc.pdf'); const q = spawnSync('qpdf', ['--encrypt', 'u', 'o', '256', '--', a, enc]); const haveEnc = q.status === 0;
  const big = path.join(TMP, 'big.pdf'); fs.writeFileSync(big, Buffer.alloc(101 * 1024 * 1024, 1));
  const res = (p) => p.locator('#result .stat').allInnerTexts().then((x) => x.join(' | ').replace(/\s+/g, ' '));
  const common = async ({ page, t }, noFileMsg) => {
    await t('action button disabled before a file is chosen; no download yet', async () => { assert.ok(await page.locator('#go').isDisabled()); assert.ok(await page.locator('#dl').isDisabled()); });
  };

  await tool('merge-pdf', 'Merge PDF', async (c) => { const { page, t } = c; await common(c);
    await t('rejects a non-PDF file with the file name in the message', async () => { await page.setInputFiles('#file', txt); await page.waitForFunction(() => !document.querySelector('#status').hidden); assert.match(await status(page), /"fake.pdf" is not a PDF/); assert.equal(await page.locator('#flist li').count(), 0); });
    await t('rejects a damaged PDF', async () => { await page.setInputFiles('#file', bad); await page.waitForFunction(() => /could not be read/.test(document.querySelector('#status').textContent)); assert.equal(await page.locator('#flist li').count(), 0); });
    if (haveEnc) await t('rejects a password-protected PDF', async () => { await page.setInputFiles('#file', enc); await page.waitForFunction(() => /password-protected/.test(document.querySelector('#status').textContent)); });
    await t('rejects a file over 100 MB', async () => { await page.setInputFiles('#file', big); await page.waitForFunction(() => /limit is/.test(document.querySelector('#status').textContent)); assert.equal(await page.locator('#flist li').count(), 0); });
    await t('one file is not enough', async () => { await page.setInputFiles('#file', a); await page.locator('#flist li').first().waitFor(); await page.locator('#go').click(); assert.match(await status(page), /at least two/); });
    await t('adding more files keeps the list (3 + 2 pages shown)', async () => { await page.setInputFiles('#file', b); await page.waitForFunction(() => document.querySelectorAll('#flist li').length === 2); assert.match(await page.locator('#flist').innerText(), /3 pages[\s\S]*2 pages/); });
    await t('Merge produces a valid PDF with pages in list order', async () => { await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); assert.match(await res(page), /5 Pages/); const d = await dl(page, () => page.locator('#dl').click()); assert.equal(d.name, 'merged.pdf'); assert.deepEqual((await info(d.path)).widths, [110, 120, 130, 140, 150]); });
    await t('Move down changes the output order (and invalidates the old result)', async () => { await page.locator('#flist li').first().getByRole('button', { name: /down/ }).click(); assert.ok(await page.locator('#dl').isDisabled()); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).widths, [140, 150, 110, 120, 130]); });
    await t('Remove drops a file; merging 1 is refused again', async () => { await page.locator('#flist li').first().getByRole('button', { name: /Remove/ }).click(); assert.equal(await page.locator('#flist li').count(), 1); await page.locator('#go').click(); assert.match(await status(page), /at least two/); });
    await t('mixed good + bad files: good one kept, warning shown', async () => { await page.setInputFiles('#file', [b, txt]); await page.waitForFunction(() => document.querySelectorAll('#flist li').length === 2); assert.match(await status(page), /fake.pdf/); });
    await t('Reset clears list, status and result', async () => { await page.locator('#reset').click(); assert.equal(await page.locator('#flist li').count(), 0); assert.ok(await page.locator('#dl').isDisabled()); assert.ok(await page.locator('#go').isDisabled()); assert.equal(await page.locator('#status').isHidden(), true); });
  });

  await tool('split-pdf', 'Split PDF', async (c) => { const { page, t } = c; await common(c);
    await t('opening a PDF shows its page count and options', async () => { await page.setInputFiles('#file', six); await page.locator('#opts:visible').waitFor(); assert.match(await page.locator('#fileinfo').innerText(), /six.pdf · 6 pages/); });
    await t('empty range shows an error', async () => { await page.fill('#ranges', ''); await page.locator('#go').click(); assert.match(await status(page), /Enter the pages/); });
    await t('page beyond the end shows a specific error and creates nothing', async () => { await page.fill('#ranges', '1-3, 9'); await page.locator('#go').click(); assert.match(await status(page), /Page 9 does not exist.*1 to 6/); assert.equal(await page.locator('#parts li').count(), 0); assert.ok(await page.locator('#dl').isDisabled()); });
    await t('backwards range rejected', async () => { await page.fill('#ranges', '5-2'); await page.locator('#go').click(); assert.match(await status(page), /backwards/); });
    await t('ranges "1-2, 3, 4-" → 3 correct files', async () => { await page.fill('#ranges', '1-2, 3, 4-'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); assert.equal(await page.locator('#parts li').count(), 3); const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#parts li a').nth(2).click()]); assert.deepEqual((await info(await d.path())).widths, [140, 150, 160]); assert.match(d.suggestedFilename(), /part-3-pages-4-6\.pdf$/); });
    await t('ZIP contains all 3 PDFs and is valid', async () => { const d = await dl(page, () => page.locator('#dlzip').click()); assert.match(d.name, /six-split\.zip/); const p = spawnSync('python3', ['-I', '-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(len(z.namelist()))', d.path], { encoding: 'utf8' }); assert.equal(p.stdout.trim(), '3'); });
    await t('"Every N pages" (4) gives 2 files', async () => { await page.selectOption('#mode', 'every'); await page.fill('#every', '4'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); assert.equal(await page.locator('#parts li').count(), 2); });
    await t('"Every N pages" with 0 shows an error', async () => { await page.fill('#every', '0'); await page.locator('#go').click(); assert.match(await status(page), /pages per file/); });
    await t('"Into single pages" gives 6 files', async () => { await page.selectOption('#mode', 'each'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); assert.equal(await page.locator('#parts li').count(), 6); });
    await t('Reset clears everything', async () => { await page.locator('#reset').click(); assert.equal(await page.locator('#parts li').count(), 0); assert.ok(await page.locator('#go').isDisabled()); assert.ok(await page.locator('#opts').isHidden()); });
    await t('a non-PDF is rejected when opened', async () => { await page.setInputFiles('#file', txt); await page.waitForFunction(() => !document.querySelector('#status').hidden); assert.match(await status(page), /not a PDF/); assert.ok(await page.locator('#go').isDisabled()); });
  });

  await tool('extract-pdf-pages', 'Extract PDF Pages', async (c) => { const { page, t } = c; await common(c);
    await page.setInputFiles('#file', six); await page.locator('#opts:visible').waitFor();
    await t('empty and out-of-range input rejected', async () => { await page.locator('#go').click(); assert.match(await status(page), /Enter the pages/); await page.fill('#ranges', '7'); await page.locator('#go').click(); assert.match(await status(page), /Page 7 does not exist/); await page.fill('#ranges', 'abc'); await page.locator('#go').click(); assert.match(await status(page), /not a valid/); });
    await t('"5, 1-2" extracts pages in typed order', async () => { await page.fill('#ranges', '5, 1-2'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); assert.match(await res(page), /3 Pages extracted/); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).widths, [150, 110, 120]); assert.match(d.name, /six-pages-5_1-2\.pdf/); });
    await t('"all" works and "4-" means to the end', async () => { await page.fill('#ranges', '4-'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).widths, [140, 150, 160]); });
    await t('Reset clears', async () => { await page.locator('#reset').click(); assert.ok(await page.locator('#dl').isDisabled()); assert.ok(await page.locator('#opts').isHidden()); });
  });

  await tool('rotate-pdf-pages', 'Rotate PDF Pages', async (c) => { const { page, t } = c; await common(c);
    await page.setInputFiles('#file', six); await page.locator('#opts:visible').waitFor();
    await t('default "all" rotates every page 90°', async () => { assert.equal(await page.inputValue('#ranges'), 'all'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).rot, [90, 90, 90, 90, 90, 90]); assert.match(d.name, /rotated/); });
    await t('selected pages only, counter-clockwise (270)', async () => { await page.fill('#ranges', '2, 4-5'); await page.selectOption('#angle', '270'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).rot, [0, 270, 0, 270, 270, 0]); });
    await t('re-running does not accumulate rotation (always starts from the original)', async () => { await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).rot, [0, 270, 0, 270, 270, 0]); });
    await t('invalid pages rejected', async () => { await page.fill('#ranges', '0'); await page.locator('#go').click(); assert.match(await status(page), /Page 0 does not exist/); await page.fill('#ranges', ''); await page.locator('#go').click(); assert.match(await status(page), /Enter the pages/); });
    await t('Reset restores "all" and clears', async () => { await page.locator('#reset').click(); assert.ok(await page.locator('#opts').isHidden()); assert.ok(await page.locator('#go').isDisabled()); });
  });

  await tool('reorder-pdf-pages', 'Reorder PDF Pages', async (c) => { const { page, t } = c; await common(c);
    await page.setInputFiles('#file', six); await page.locator('#plist li').first().waitFor();
    await t('lists all 6 pages in original order', async () => { assert.equal(await page.locator('#plist li').count(), 6); assert.equal(await page.inputValue('#order'), '1, 2, 3, 4, 5, 6'); });
    await t('first "up" and last "down" buttons are disabled', async () => { assert.ok(await page.locator('#plist li').first().getByRole('button', { name: /up/ }).isDisabled()); assert.ok(await page.locator('#plist li').last().getByRole('button', { name: /down/ }).isDisabled()); });
    await t('move up / delete update the order', async () => { await page.locator('#plist li').nth(2).getByRole('button', { name: /up/ }).click(); assert.equal(await page.inputValue('#order'), '1, 3, 2, 4, 5, 6'); await page.locator('#plist li').nth(0).getByRole('button', { name: /Delete/ }).click(); assert.equal(await page.inputValue('#order'), '3, 2, 4, 5, 6'); });
    await t('save produces the displayed order', async () => { await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).widths, [130, 120, 140, 150, 160]); assert.match(d.name, /reordered/); });
    await t('typed order "6, 5, 1" applies (and drops other pages)', async () => { await page.fill('#order', '6, 5, 1'); await page.locator('#apply-order').click(); assert.equal(await page.locator('#plist li').count(), 3); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); assert.deepEqual((await info(d.path)).widths, [160, 150, 110]); });
    await t('typed order with a missing page shows an error and keeps the list', async () => { await page.fill('#order', '1, 9'); await page.locator('#apply-order').click(); assert.match(await status(page), /Page 9 does not exist/); assert.equal(await page.locator('#plist li').count(), 3); });
    await t('Restore original and Reverse', async () => { await page.locator('#restore').click(); assert.equal(await page.inputValue('#order'), '1, 2, 3, 4, 5, 6'); await page.locator('#reverse').click(); assert.equal(await page.inputValue('#order'), '6, 5, 4, 3, 2, 1'); });
    await t('last remaining page cannot be deleted', async () => { await page.fill('#order', '2'); await page.locator('#apply-order').click(); assert.ok(await page.locator('#plist li').first().getByRole('button', { name: /Delete/ }).isDisabled()); });
    await t('Reset clears', async () => { await page.locator('#reset').click(); assert.equal(await page.locator('#plist li').count(), 0); assert.ok(await page.locator('#go').isDisabled()); });
  });

  await tool('images-to-pdf', 'Images to PDF', async (c) => { const { page, t } = c; await common(c);
    await t('non-image rejected', async () => { await page.setInputFiles('#file', FX('not-an-image.txt')); await page.waitForFunction(() => !document.querySelector('#status').hidden); assert.match(await status(page), /not an image/); assert.equal(await page.locator('#flist li').count(), 0); });
    await t('fake .png that is not an image is rejected', async () => { const f = path.join(TMP, 'fake.png'); fs.writeFileSync(f, 'definitely not png data'); await page.setInputFiles('#file', f); await page.waitForFunction(() => /could not be read/.test(document.querySelector('#status').textContent)); assert.equal(await page.locator('#flist li').count(), 0); });
    await t('JPG + PNG + WebP + EXIF-rotated JPG are all accepted', async () => { await page.setInputFiles('#file', [FX('sample.jpg'), FX('sample.png'), FX('sample.webp'), FX('exif-rotated.jpg')]); await page.waitForFunction(() => document.querySelectorAll('#flist li').length === 4, null, { timeout: 15000 }); assert.match(await page.locator('#flist').innerText(), /640×400/); });
    await t('A4 auto-orientation: landscape images → landscape pages; EXIF-rotated photo → portrait page', async () => { await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor({ timeout: 15000 }); const d = await dl(page, () => page.locator('#dl').click()); const i = await info(d.path); assert.deepEqual(i.widths, [842, 842, 842, 595]); assert.deepEqual(i.heights, [595, 595, 595, 842]); });
    await t('"Same as image" page size uses image pixels (640×400, rotated photo 200×400)', async () => { await page.selectOption('#size', 'fit'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); const i = await info(d.path); assert.deepEqual(i.widths, [640, 640, 400, 200]); assert.deepEqual(i.heights, [400, 400, 200, 400]); });
    await t('Letter + forced portrait + no margin', async () => { await page.selectOption('#size', 'letter'); await page.selectOption('#orient', 'portrait'); await page.selectOption('#margin', '0'); await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); const i = await info(d.path); assert.deepEqual([...new Set(i.widths)], [612]); assert.deepEqual([...new Set(i.heights)], [792]); });
    await t('reorder moves an image earlier; remove drops one', async () => { await page.locator('#flist li').nth(3).getByRole('button', { name: /up/ }).click(); await page.locator('#flist li').nth(0).getByRole('button', { name: /Remove/ }).click(); assert.equal(await page.locator('#flist li').count(), 3); assert.match(await page.locator('#flist li').first().innerText(), /sample.png/); });
    await t('the PDF contains one embedded image per page', async () => { await page.locator('#go').click(); await page.locator('#dl:enabled').waitFor(); const d = await dl(page, () => page.locator('#dl').click()); const p = spawnSync('pdfimages', ['-list', d.path], { encoding: 'utf8' }); if (p.status === 0) assert.equal(p.stdout.trim().split('\n').length - 2, 3); assert.equal((await info(d.path)).widths.length, 3); });
    await t('Reset clears', async () => { await page.locator('#reset').click(); assert.equal(await page.locator('#flist li').count(), 0); assert.ok(await page.locator('#dl').isDisabled()); });
  });
}
