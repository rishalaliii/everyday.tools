// Real-browser audit of every tool. Usage: node tests/e2e/audit.mjs [--root] [--md out.md]
// Exits non-zero if any check fails. Needs playwright-core + Chromium (see lib.mjs).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { HERE, serve, launch } from './lib.mjs';
import { pdfSuite } from './pdf-suite.mjs';
const FX = (n) => path.join(HERE, 'fixtures', n);
const rootMode = process.argv.includes('--root');
const mdOut = process.argv.includes('--md') ? process.argv[process.argv.indexOf('--md') + 1] : null;
const { srv, origin } = await serve(rootMode ? '' : '/everydaytools');
const browser = await launch();
const results = [];
const only = process.env.ONLY;
async function tool(id, label, fn) {
  if (only && !only.split(',').includes(id)) return;
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1100, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  const rec = { id, label, checks: [] }; results.push(rec);
  const t = async (name, f) => { try { await f(); rec.checks.push({ name, ok: true }); } catch (e) { rec.checks.push({ name, ok: false, err: String(e.message).slice(0, 400).replace(/\n/g, ' ') }); } };
  try {
    await page.goto(`${origin}/tools/${id}/`);
    await t('page loads, title and h1 present', async () => { assert.ok((await page.title()).length > 5); assert.ok(await page.locator('h1').count()); });
    await fn({ page, t, ctx, origin });
    await t('no JavaScript errors during session', async () => assert.equal(errs.join(' ; '), ''));
    await t('mobile layout (390px): no horizontal overflow', async () => {
      await page.setViewportSize({ width: 390, height: 800 }); await page.goto(`${origin}/tools/${id}/`);
      const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); assert.ok(o <= 1, `overflow ${o}px`);
    });
    await t('header/footer navigation links resolve', async () => {
      await page.setViewportSize({ width: 1100, height: 900 }); await page.goto(`${origin}/tools/${id}/`);
      const hrefs = await page.$$eval('header a, footer a', (as) => as.map((a) => a.href)); assert.ok(hrefs.length >= 6);
      for (const h of hrefs) { const r = await ctx.request.get(h); assert.ok(r.ok(), `${h} -> ${r.status()}`); }
    });
  } catch (e) { rec.checks.push({ name: 'suite crashed', ok: false, err: e.message.slice(0, 200) }); }
  await ctx.close();
}
const val = (p, s) => p.locator(s).inputValue();
const dl = async (page, click) => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 8000 }), click()]); const f = await d.path(); return { name: d.suggestedFilename(), size: fs.statSync(f).size, path: f }; };
const status = (p) => p.locator('#status').innerText();

// ---------- WORD COUNTER ----------
await tool('word-counter', 'Word & Character Counter', async ({ page, t }) => {
  const stat = async (k) => (await page.locator('.stat', { hasText: k }).first().locator('b').innerText()).replace(/,/g, '');
  await t('Count button is visible', async () => assert.ok(await page.locator('#apply:visible').count()));
  await t('empty input shows zeros and a hint (no error)', async () => { assert.equal(await stat('Words'), '0'); assert.match(await status(page), /Type or paste/); });
  await t('counts automatically while typing', async () => {
    await page.locator('#in').pressSequentially('Hello world. Hi!\n\nNew para');
    assert.equal(await stat('Words'), '5'); assert.equal(await stat('Sentences'), '3'); assert.equal(await stat('Paragraphs'), '2');
  });
  await t('characters with and without spaces', async () => { assert.equal(await stat('Characters (no'), '21'); assert.equal((await page.locator('.stat', { hasText: /^Characters\d/ }).locator('b').innerText()), '26'); });
  await t('counts on paste', async () => { await page.locator('#in').fill(''); await page.evaluate(() => { const e = document.querySelector('#in'); e.focus(); document.execCommand('insertText', false, 'one two three'); }); await page.waitForTimeout(50); assert.equal(await stat('Words'), '3'); });
  await t('Count button works', async () => { await page.locator('#in').fill('a b c d'); await page.locator('#apply').click(); assert.equal(await stat('Words'), '4'); });
  await t('whitespace-only input counts 0 words', async () => { await page.locator('#in').fill('   \n  '); assert.equal(await stat('Words'), '0'); });
  await t('unicode and emoji count as single characters', async () => { await page.locator('#in').fill('héllo 😀'); assert.equal(await stat('Words'), '2'); assert.equal((await page.locator('.stat', { hasText: /^Characters\d/ }).locator('b').innerText()), '7'); });
  await t('Copy copies the counts', async () => { await page.locator('#in').fill('x y'); await page.locator('#copy').click(); const c = await page.evaluate(() => navigator.clipboard.readText()); assert.match(c, /Words: 2/); });
  await t('Copy with empty input explains instead of copying', async () => { await page.locator('#in').fill(''); await page.locator('#copy').click(); assert.match(await status(page), /Nothing to copy/); });
  await t('Download .txt works', async () => { await page.locator('#in').fill('x y z'); const d = await dl(page, () => page.locator('#dl').click()); assert.ok(d.size > 10); });
  await t('Clear empties input and resets counts', async () => { await page.locator('#in').fill('some text here'); await page.locator('#reset').click(); assert.equal(await val(page, '#in'), ''); assert.equal(await stat('Words'), '0'); });
  await t('large text (200k words) stays responsive', async () => { const s = Date.now(); await page.locator('#in').fill('word '.repeat(200000)); assert.equal(await stat('Words'), '200000'); assert.ok(Date.now() - s < 5000); });
});

// ---------- OTHER TEXT TOOLS ----------
async function textTool(id, label, input, setup, expected, note) {
  await tool(id, label, async ({ page, t }) => {
    await t('empty input shows validation message', async () => { await page.locator('#apply').click(); assert.match(await status(page), /Enter some text/); });
    await t('main action produces expected output', async () => { await page.locator('#in').fill(input); if (setup) await setup(page); await page.locator('#apply').click(); assert.equal(await val(page, '#out'), expected); if (note) assert.match(await status(page), note); });
    await t('Copy result', async () => { await page.locator('#copy').click(); assert.equal(await page.evaluate(() => navigator.clipboard.readText()), expected); });
    await t('Download .txt', async () => { const d = await dl(page, () => page.locator('#dl').click()); assert.ok(d.size > 0); });
    await t('Reset clears input and output', async () => { await page.locator('#reset').click(); assert.equal(await val(page, '#in'), ''); assert.equal(await val(page, '#out'), ''); });
    await t('Copy/Download before any result give a message', async () => { await page.locator('#copy').click(); assert.match(await status(page), /Nothing to copy/); });
  });
}
await textTool('case-converter', 'Case Converter', 'hello world', (p) => p.selectOption('#mode', 'upper'), 'HELLO WORLD');
await textTool('remove-duplicate-lines', 'Remove Duplicate Lines', 'a\nb\na\nA', null, 'a\nb', /Removed 2/);
await textTool('sort-lines', 'Sort Lines', 'b\n10\n2\na', null, '2\n10\na\nb');
await textTool('remove-extra-spaces', 'Remove Extra Spaces', '  a   b \n\n\n\n c  ', null, 'a b\n\nc');
await textTool('find-and-replace', 'Find and Replace', 'cat cat dog', (p) => p.fill('#find', 'cat').then(() => p.fill('#rep', 'bird')), 'bird bird dog', /2 replacement/);
await tool('find-and-replace', 'Find and Replace (validation)', async ({ page, t }) => {
  await t('invalid regex shows error and leaves text', async () => { await page.fill('#in', 'abc'); await page.fill('#find', '('); await page.check('#rx'); await page.fill('#rep', 'x'); await page.locator('#apply').click(); assert.match(await status(page), /./); assert.equal(await val(page, '#out'), ''); });
  await t('empty Find field shows error', async () => { await page.fill('#find', ''); await page.locator('#apply').click(); assert.match(await status(page), /./); });
  await t('regex capture groups', async () => { await page.fill('#in', 'x1 x2'); await page.fill('#find', 'x(\\d)'); await page.fill('#rep', '$1'); await page.locator('#apply').click(); assert.equal(await val(page, '#out'), '1 2'); });
});
await tool('text-compare', 'Text Compare', async ({ page, t }) => {
  await t('identical texts reported', async () => { await page.fill('#in', 'a\nb'); await page.fill('#in2', 'a\nb'); await page.locator('#apply').click(); assert.match(await status(page), /identical/); });
  await t('differences highlighted', async () => { await page.fill('#in2', 'a\nc'); await page.locator('#apply').click(); assert.equal(await page.locator('.dl.add').count(), 1); assert.equal(await page.locator('.dl.del').count(), 1); });
  await t('Copy diff', async () => { await page.locator('#copy').click(); assert.match(await page.evaluate(() => navigator.clipboard.readText()), /\+ c/); });
  await t('Download diff', async () => assert.ok((await dl(page, () => page.locator('#dl').click())).size > 0));
  await t('Reset clears both boxes and the diff', async () => { await page.locator('#reset').click(); assert.equal(await val(page, '#in'), ''); assert.equal(await val(page, '#in2'), ''); assert.equal(await page.locator('.dl').count(), 0); });
});

// ---------- CALCULATORS & CONVERTERS ----------
const res = async (p) => (await p.locator('#result .stat').allInnerTexts()).map((s) => s.replace(/\s+/g, ' ').trim());
async function calcTool(id, label, { set, expect, bad, extra, noDefault }) {
  await tool(id, label, async ({ page, t }) => {
    if (noDefault) await t('no result and no error before required input is given', async () => { assert.equal((await res(page)).length, 0); assert.ok(await page.locator('#status').isHidden()); });
    else await t('shows a result on load (defaults)', async () => assert.ok((await res(page)).length > 0));
    await t('main calculation is correct', async () => { await set(page); const r = (await res(page)).join(' | '); for (const e of expect) assert.ok(r.includes(e), `missing "${e}" in: ${r}`); });
    if (bad) await t('invalid input shows an error and no result', async () => { await bad.set(page); assert.match(await status(page), bad.msg); assert.equal((await res(page)).length, 0); });
    await t('Copy result', async () => { await set(page); await page.locator('#copy').click(); assert.ok((await page.evaluate(() => navigator.clipboard.readText())).length > 3); });
    if (extra) await extra({ page, t });
    await t('Reset restores defaults', async () => { await page.locator('#reset').click(); const r = await res(page); const f = await page.locator('[data-f]').first().inputValue(); assert.ok(r.length > 0 || f === ''); });
  });
}
const fill = (p, f, v) => p.fill(`[data-f=${f}]`, String(v));
const sel2 = (p, f, v) => p.selectOption(`[data-f=${f}]`, String(v));
await calcTool('percentage-calculator', 'Percentage Calculator', { set: async (p) => { await sel2(p, 'mode', 'of'); await fill(p, 'a', 15); await fill(p, 'b', 200); }, expect: ['30'], bad: { set: async (p) => { await sel2(p, 'mode', 'chg'); await fill(p, 'a', 0); await fill(p, 'b', 5); }, msg: /zero|cannot|start/i },
  extra: async ({ page, t }) => { await t('percent change 50 -> 75 = 50%', async () => { await sel2(page, 'mode', 'chg'); await fill(page, 'a', 50); await fill(page, 'b', 75); assert.ok((await res(page)).join().includes('50')); }); } });
await calcTool('discount-calculator', 'Discount Calculator', { set: async (p) => { await fill(p, 'price', 1999); await fill(p, 'disc', 25); await fill(p, 'tax', ''); }, expect: ['1,499.25'], bad: { set: async (p) => { await fill(p, 'disc', 150); }, msg: /./ },
  extra: async ({ page, t }) => { await t('tax applied after discount', async () => { await fill(page, 'price', 100); await fill(page, 'disc', 10); await fill(page, 'tax', 10); assert.ok((await res(page)).join().includes('99')); }); } });
await calcTool('age-calculator', 'Age Calculator', { set: async (p) => { await fill(p, 'dob', '2000-01-15'); await fill(p, 'asof', '2026-03-20'); }, expect: ['26'], noDefault: true, bad: { set: async (p) => { await fill(p, 'dob', '2030-01-01'); await fill(p, 'asof', '2026-03-20'); }, msg: /./ },
  extra: async ({ page, t }) => { await t('29 Feb birthday handled', async () => { await fill(page, 'dob', '2000-02-29'); await fill(page, 'asof', '2025-03-01'); assert.ok((await res(page)).length > 0); }); } });
await calcTool('date-difference-calculator', 'Date Difference Calculator', { set: async (p) => { await fill(p, 'd1', '2026-01-01'); await fill(p, 'd2', '2026-03-01'); }, expect: ['59'], bad: null });
await calcTool('gst-calculator', 'GST Calculator', { set: async (p) => { await sel2(p, 'mode', 'add'); await fill(p, 'amount', 1000); await fill(p, 'rate', 18); }, expect: ['1,180'], bad: { set: async (p) => { await fill(p, 'amount', -5); }, msg: /./ },
  extra: async ({ page, t }) => { await t('remove GST: 1180 @18% -> 1,000 base', async () => { await sel2(page, 'mode', 'remove'); await fill(page, 'amount', 1180); await fill(page, 'rate', 18); assert.ok((await res(page)).join().includes('1,000')); }); } });
await calcTool('bmi-calculator', 'BMI Calculator', { set: async (p) => { await sel2(p, 'unit', 'metric'); await fill(p, 'height', 170); await fill(p, 'weight', 65); }, expect: ['22.5', 'Normal'], bad: { set: async (p) => { await fill(p, 'height', 0); }, msg: /./ },
  extra: async ({ page, t }) => { await t('imperial 70in/154lb ≈ 22.1', async () => { await sel2(page, 'unit', 'imperial'); await fill(page, 'height', 70); await fill(page, 'weight', 154); assert.ok((await res(page)).join().includes('22.1')); }); } });
await calcTool('loan-emi-calculator', 'Loan EMI Calculator', { set: async (p) => { await fill(p, 'principal', 500000); await fill(p, 'rate', 9); await fill(p, 'tenure', 5); await sel2(p, 'tunit', 'years'); }, expect: ['10,379'], bad: { set: async (p) => { await fill(p, 'principal', 0); }, msg: /./ },
  extra: async ({ page, t }) => { await t('0% interest = principal / months', async () => { await fill(page, 'principal', 1200); await fill(page, 'rate', 0); await fill(page, 'tenure', 12); await sel2(page, 'tunit', 'months'); assert.ok((await res(page)).join().includes('100')); }); } });
const convExtra = (a, b, v, out) => async ({ page, t }) => { await t('Swap exchanges units', async () => { const f1 = await val(page, '[data-f=from]'), t1 = await val(page, '[data-f=to]'); await page.locator('#swap').click(); assert.equal(await val(page, '[data-f=from]'), t1); assert.equal(await val(page, '[data-f=to]'), f1); await page.locator('#swap').click(); }); };
await calcTool('length-converter', 'Length Converter', { set: async (p) => { await fill(p, 'value', 1); await sel2(p, 'from', 'km'); await sel2(p, 'to', 'mi'); }, expect: ['0.6213'], bad: { set: async (p) => { await fill(p, 'value', ''); }, msg: /./ }, extra: convExtra() });
await calcTool('weight-converter', 'Weight Converter', { set: async (p) => { await fill(p, 'value', 1); await sel2(p, 'from', 'kg'); await sel2(p, 'to', 'lb'); }, expect: ['2.2046'], bad: { set: async (p) => { await fill(p, 'value', ''); }, msg: /./ }, extra: convExtra() });
await calcTool('temperature-converter', 'Temperature Converter', { set: async (p) => { await fill(p, 'value', 100); await sel2(p, 'from', 'C'); await sel2(p, 'to', 'F'); }, expect: ['212'], bad: { set: async (p) => { await fill(p, 'value', -300); await sel2(p, 'from', 'C'); }, msg: /absolute|zero|below|low/i }, extra: convExtra() });
await calcTool('data-storage-converter', 'Data Storage Converter', { set: async (p) => { await fill(p, 'value', 1); await sel2(p, 'from', 'GB'); await sel2(p, 'to', 'MB'); await sel2(p, 'base', '1024'); }, expect: ['1,024'], bad: { set: async (p) => { await fill(p, 'value', -1); }, msg: /./ },
  extra: async (a) => { await convExtra()(a); await a.t('decimal base 1000: 1 GB = 1,000 MB', async () => { await sel2(a.page, 'base', '1000'); await fill(a.page, 'value', 1); await sel2(a.page, 'from', 'GB'); await sel2(a.page, 'to', 'MB'); assert.ok((await res(a.page)).join().includes('1,000')); }); } });

// ---------- QR ----------
await tool('qr-code-generator', 'QR Code Generator', async ({ page, t }) => {
  await t('empty URL: no code, download disabled', async () => { assert.ok(await page.locator('#dl').isDisabled()); assert.ok(await page.locator('#qr-canvas').isHidden()); });
  await t('URL generates a QR code', async () => { await page.fill('[data-f=url]', 'example.com'); assert.ok(await page.locator('#qr-canvas').isVisible()); assert.ok(await page.locator('#dl').isEnabled()); });
  await t('Download PNG is a real PNG', async () => { const d = await dl(page, () => page.locator('#dl').click()); const b = fs.readFileSync(d.path); assert.equal(b.slice(1, 4).toString(), 'PNG'); });
  await t('Copy content as text', async () => { await page.locator('#copy').click(); assert.match(await page.evaluate(() => navigator.clipboard.readText()), /example\.com/); });
  await t('Copy image', async () => { await page.locator('#copyimg').click(); await page.waitForTimeout(200); assert.match(await status(page), /Copied the QR image/); });
  await t('plain text type', async () => { await page.selectOption('[data-f=type]', 'text'); await page.fill('[data-f=text]', 'hello'); assert.ok(await page.locator('#qr-canvas').isVisible()); });
  await t('invalid email shows error', async () => { await page.selectOption('[data-f=type]', 'email'); await page.fill('[data-t=email] [data-f=email]', 'not-an-email'); assert.match(await status(page), /./); assert.ok(await page.locator('#dl').isDisabled()); });
  await t('valid email works', async () => { await page.fill('[data-t=email] [data-f=email]', 'a@b.co'); assert.ok(await page.locator('#qr-canvas').isVisible()); });
  await t('Wi-Fi code', async () => { await page.selectOption('[data-f=type]', 'wifi'); await page.fill('[data-f=ssid]', 'Home'); await page.fill('[data-f=password]', 'secret123'); await page.locator('#copy').click(); assert.match(await page.evaluate(() => navigator.clipboard.readText()), /WIFI:T:WPA;S:Home;P:secret123/); });
  await t('phone code', async () => { await page.selectOption('[data-f=type]', 'phone'); await page.fill('[data-t=phone] [data-f=phone]', '+91 98765 43210'); assert.ok(await page.locator('#qr-canvas').isVisible()); });
  await t('contact card code', async () => { await page.selectOption('[data-f=type]', 'contact'); await page.fill('[data-t=contact] [data-f=first]', 'Asha'); await page.locator('#copy').click(); assert.match(await page.evaluate(() => navigator.clipboard.readText()), /BEGIN:VCARD/); });
  await t('Reset returns to the empty URL state', async () => { await page.locator('#reset').click(); assert.equal(await val(page, '[data-f=type]'), 'url'); assert.ok(await page.locator('#dl').isDisabled()); });
});

// ---------- IMAGE TOOLS ----------
async function imageTool(id, label, extra) {
  await tool(id, label, async ({ page, t }) => {
    await t('options hidden and download disabled before upload', async () => { assert.ok(await page.locator('#opts').isHidden()); assert.ok(await page.locator('#dl').isDisabled()); });
    await t('non-image file rejected with message', async () => { await page.setInputFiles('#file', FX('not-an-image.txt')); await page.waitForTimeout(300); assert.match(await status(page), /./); assert.ok(await page.locator('#dl').isDisabled()); });
    await t('PNG upload shows preview and result', async () => { await page.setInputFiles('#file', FX('sample.png')); await page.locator('#dl:enabled').waitFor({ timeout: 8000 }); assert.ok(await page.locator('#before img').count()); });
    await extra({ page, t });
    await t('Reset clears the image', async () => { await page.locator('#reset').click(); assert.ok(await page.locator('#dl').isDisabled()); assert.ok(await page.locator('#opts').isHidden()); });
  });
}
await imageTool('image-compressor', 'Image Compressor', async ({ page, t }) => {
  await t('JPG upload, lower quality → smaller download', async () => { await page.setInputFiles('#file', FX('sample.jpg')); await page.locator('#dl:enabled').waitFor(); await page.selectOption('[data-f=fmt]', 'image/jpeg'); await page.fill('[data-f=q]', '20'); await page.locator('[data-f=q]').dispatchEvent('input'); await page.waitForTimeout(500); const d = await dl(page, () => page.locator('#dl').click()); assert.ok(d.size < fs.statSync(FX('sample.jpg')).size); assert.match(d.name, /compressed/); });
  await t('max width option resizes output', async () => { await page.fill('[data-f=maxw]', '100'); await page.locator('[data-f=maxw]').dispatchEvent('input'); await page.waitForTimeout(500); assert.match(await page.locator('#info').innerText(), /100×63|100×62/); });
});
await imageTool('image-resizer', 'Image Resizer', async ({ page, t }) => {
  await t('width/height prefilled from image', async () => { assert.equal(await val(page, '[data-f=w]'), '640'); assert.equal(await val(page, '[data-f=h]'), '400'); });
  await t('resize to 320 wide keeps aspect ratio and downloads', async () => { await page.fill('[data-f=w]', '320'); await page.locator('[data-f=w]').dispatchEvent('input'); await page.waitForTimeout(500); assert.equal(await val(page, '[data-f=h]'), '200'); const d = await dl(page, () => page.locator('#dl').click()); assert.match(d.name, /320x200/); });
  await t('zero width shows error and disables download', async () => { await page.uncheck('[data-f=lock]'); await page.fill('[data-f=w]', '0'); await page.locator('[data-f=w]').dispatchEvent('input'); await page.waitForTimeout(500); assert.match(await status(page), /./); assert.ok(await page.locator('#dl').isDisabled()); });
});
await imageTool('image-cropper', 'Image Cropper', async ({ page, t }) => {
  await t('crop by numbers (100,50,200,100) downloads', async () => { await page.fill('[data-f=x]', '100'); await page.fill('[data-f=y]', '50'); await page.fill('[data-f=cw]', '200'); await page.fill('[data-f=ch]', '100'); await page.locator('[data-f=ch]').dispatchEvent('change'); await page.waitForTimeout(600); assert.match(await page.locator('#info').innerText(), /200×100/); assert.ok((await dl(page, () => page.locator('#dl').click())).size > 0); });
  await t('drag on canvas draws a new crop area', async () => { const b = await page.locator('#cropcv').boundingBox(); await page.mouse.move(b.x + 10, b.y + 10); await page.mouse.down(); await page.mouse.move(b.x + 110, b.y + 90, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(500); const w = +(await val(page, '[data-f=cw]')); assert.ok(w > 50 && w < 300, 'cw=' + w); });
  await t('ratio 1:1 gives a square', async () => { await page.selectOption('[data-f=ratio]', '1:1'); await page.waitForTimeout(500); assert.equal(await val(page, '[data-f=cw]'), await val(page, '[data-f=ch]')); });
  await t('out-of-range values are clamped, not crashed', async () => { await page.fill('[data-f=cw]', '99999'); await page.locator('[data-f=cw]').dispatchEvent('change'); await page.waitForTimeout(500); assert.ok(+(await val(page, '[data-f=cw]')) <= 640); });
});
await imageTool('image-converter', 'Image Converter', async ({ page, t }) => {
  await t('PNG → JPG downloads a .jpg with JPEG data', async () => { await page.selectOption('[data-f=fmt]', 'image/jpeg'); await page.waitForTimeout(500); const d = await dl(page, () => page.locator('#dl').click()); assert.match(d.name, /\.jpg$/); assert.equal(fs.readFileSync(d.path)[0], 0xff); });
  await t('PNG → WebP downloads RIFF/WEBP', async () => { await page.selectOption('[data-f=fmt]', 'image/webp'); await page.waitForTimeout(500); const d = await dl(page, () => page.locator('#dl').click()); assert.equal(fs.readFileSync(d.path).slice(8, 12).toString(), 'WEBP'); });
  await t('JPG → PNG', async () => { await page.setInputFiles('#file', FX('sample.jpg')); await page.selectOption('[data-f=fmt]', 'image/png'); await page.waitForTimeout(600); const d = await dl(page, () => page.locator('#dl').click()); assert.equal(fs.readFileSync(d.path).slice(1, 4).toString(), 'PNG'); });
});
await imageTool('favicon-generator', 'Favicon Generator', async ({ page, t }) => {
  await t('shows 6 icon sizes', async () => { await page.locator('#fav img').first().waitFor(); assert.equal(await page.locator('#fav img').count(), 6); });
  await t('favicon.ico is a valid ICO (3 images)', async () => { const d = await dl(page, () => page.locator('#dl').click()); const b = fs.readFileSync(d.path); assert.equal(d.name, 'favicon.ico'); assert.equal(b.readUInt16LE(2), 1); assert.equal(b.readUInt16LE(4), 3); });
  await t('warns about small source image', async () => { assert.match(await status(page), /512/); });
  await t('Copy HTML snippet', async () => { await page.locator('#copysnip').click(); assert.match(await page.evaluate(() => navigator.clipboard.readText()), /favicon/); });
});

// ---------- YOUTUBE PLAYLIST CALCULATOR ----------
await tool('youtube-playlist-calculator', 'YouTube Playlist Calculator', async ({ page, t }) => {
  await t('Add with empty box shows error', async () => { await page.locator('#add-btn').click(); assert.match(await status(page), /Nothing to import/); });
  await t('manual lines add videos and total length', async () => { await page.fill('#src', 'Intro, 10:05\nPart 2, 14:32\nPart 3 1h 2m 3s'); await page.locator('#add-btn').click(); assert.equal(await page.locator('#list tr').count(), 3); assert.equal((await page.locator('#r-total').innerText()).replace(/\s/g, ''), '1h26m40s'.replace(/\s/g, '') ); });
  await t('speed 2x halves remaining time', async () => { await page.selectOption('#speed', '2'); const r = await page.locator('#r-rem').innerText(); assert.match(r, /43m|43 m/); });
  await t('custom speed validation', async () => { await page.selectOption('#speed', 'custom'); await page.fill('#custom-speed', '50'); assert.match(await status(page), /between 0.25 and 16/); await page.fill('#custom-speed', '1.5'); });
  await t('mark watched updates progress', async () => { await page.locator('#list tr').first().locator('input[type=checkbox]').check(); assert.match(await page.locator('#r-prog').innerText(), /1 of 3/); });
  await t('"start from" marks earlier videos watched', async () => { await page.selectOption('#start-select', '2'); await page.locator('#start-btn').click(); assert.match(await page.locator('#r-prog').innerText(), /2 of 3/); });
  await t('mark all unwatched', async () => { await page.locator('#unwatch-btn').click(); assert.match(await page.locator('#r-prog').innerText(), /0 of 3/); });
  await t('progress persists after reload', async () => { await page.locator('#list tr').first().locator('input[type=checkbox]').check(); await page.reload(); assert.match(await page.locator('#r-prog').innerText(), /1 of 3/); });
  await t('video without length excluded; invalid length rejected', async () => { await page.fill('#src', 'No length video'); await page.locator('#add-btn').click(); const inp = page.locator('#list tr').last().locator('input[type=text], input:not([type])'); await inp.fill('zzz'); await inp.dispatchEvent('change'); assert.match(await status(page), /Invalid length/); await inp.fill('5:00'); await inp.dispatchEvent('change'); assert.equal(await page.locator('#list tr').count(), 4); });
  await t('Copy summary', async () => { await page.locator('#copy-btn').click(); assert.match(await page.evaluate(() => navigator.clipboard.readText()), /YouTube playlist summary/); });
  await t('CSV download', async () => { const d = await dl(page, () => page.locator('#csv-btn').click()); assert.match(fs.readFileSync(d.path, 'utf8'), /Intro/); });
  await t('CSV import', async () => { await page.setInputFiles('#csv-file', FX('videos.csv')); await page.waitForTimeout(300); assert.ok(await page.locator('#list tr').count() >= 7); });
  await t('playlist URL without API key explains the key requirement', async () => { await page.fill('#pl-input', 'https://www.youtube.com/playlist?list=PLabc123XYZ'); await page.locator('#fetch-btn').click(); assert.match(await status(page), /API key/); });
  await t('invalid URL rejected', async () => { await page.fill('#pl-input', 'not a url'); await page.locator('#fetch-btn').click(); assert.match(await status(page), /not a valid/); });
  await t('Reset (confirm) clears everything', async () => { page.once('dialog', (d) => d.accept()); await page.locator('#reset-btn').click(); assert.equal(await page.locator('#list tr').count(), 0); });
});

// ---------- PDF TOOLS ----------
await pdfSuite({ tool, origin, assert, dl, status, FX });

// ---------- HOMEPAGE ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } }); const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  const rec = { id: 'homepage', label: 'Homepage, search, categories', checks: [] }; results.push(rec);
  const t = async (name, f) => { try { await f(); rec.checks.push({ name, ok: true }); } catch (e) { rec.checks.push({ name, ok: false, err: String(e.message).slice(0, 400).replace(/\n/g, ' ') }); } };
  await page.goto(`${origin}/`);
  let total = 0;
  await t('mosaic lists tools', async () => { total = await page.locator('#tool-grid .tile').count(); assert.ok(total >= 25); });
  await t('every tile link resolves', async () => { for (const h of await page.$$eval('#tool-grid a', (a) => a.map((x) => x.href))) { const r = await ctx.request.get(h); assert.ok(r.ok(), h); } });
  await t('search filters and no-results message', async () => { await page.fill('#search', 'playlist'); assert.equal(await page.locator('#tool-grid .tile').count(), 1); await page.fill('#search', 'zzzzqq'); assert.ok(await page.locator('#no-results').isVisible()); await page.fill('#search', ''); });
  await t('category chips filter', async () => { await page.locator('#chips button', { hasText: 'Text tools' }).click(); assert.equal(await page.locator('#tool-grid .tile').count(), 7); await page.locator('#chips button', { hasText: 'All' }).click(); });
  await t('PDF category and tools appear', async () => { await page.locator('#chips button', { hasText: 'PDF tools' }).click(); assert.equal(await page.locator('#tool-grid .tile').count(), 6); await page.fill('#search', 'merge'); assert.equal(await page.locator('#tool-grid .tile').count(), 1); await page.fill('#search', ''); });
  await t('theme toggle', async () => { await page.locator('#theme-toggle').click(); assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'dark'); });
  await t('mobile (390px) no horizontal overflow', async () => { await page.setViewportSize({ width: 390, height: 800 }); await page.reload(); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1); });
  await t('no JavaScript errors', async () => assert.equal(errs.join(' ; '), ''));
  await ctx.close();
}

await browser.close(); srv.close();
let pass = 0, fail = 0, md = `# Test checklist (${rootMode ? 'site at domain root' : 'site in /everydaytools subfolder'})\n\nGenerated by \`node tests/e2e/audit.mjs\` in headless Chromium. ✅ = tested and passing, ❌ = failing.\n\n| Tool | Checks | Result |\n|---|---|---|\n`;
const detail = [];
for (const r of results) { const p = r.checks.filter((c) => c.ok).length, f = r.checks.length - p; pass += p; fail += f; md += `| ${r.label} | ${r.checks.length} | ${f ? '❌ ' + f + ' failing' : '✅ all pass'} |\n`; detail.push(`\n### ${r.label}\n` + r.checks.map((c) => `- ${c.ok ? '✅' : '❌'} ${c.name}${c.ok ? '' : ' — ' + c.err}`).join('\n')); }
md += `\n**Total: ${pass} passed, ${fail} failed.**\n` + detail.join('\n') + '\n';
if (mdOut) fs.writeFileSync(mdOut, md);
for (const r of results) for (const c of r.checks) if (!c.ok) console.log(`FAIL [${r.id}] ${c.name}: ${c.err}`);
console.log(`\n${pass} passed, ${fail} failed across ${results.length} suites`);
process.exit(fail ? 1 : 0);
