import { BUILD, draw } from './qr.js';
const $ = (id) => document.getElementById(id), form = $('qr'), st = $('status'), cv = $('qr-canvas'), info = $('qr-info');
const typeSel = form.querySelector('[data-f=type]'), fields = [...form.querySelectorAll('[data-f]')];
const val = (f) => (f.type === 'checkbox' ? String(f.checked) : f.value);
const say = (m, k = 'error') => { st.textContent = m; st.className = 'status ' + k; st.hidden = !m; };
let payload = '';
function showGroup() { form.querySelectorAll('[data-t]').forEach((g) => { g.hidden = g.dataset.t !== typeSel.value; }); }
function run(quiet) {
  const x = Object.fromEntries(fields.filter((f) => { const g = f.closest('[data-t]'); return !g || g.dataset.t === typeSel.value; }).map((f) => [f.dataset.f, val(f)]));
  try {
    payload = BUILD[x.type](x);
    const r = draw(cv, payload, { level: x.level, size: +x.size, fg: x.fg, bg: x.bg, margin: x.quiet === 'false' ? 0 : 4 });
    cv.hidden = false; say(''); info.textContent = `${r.modules}×${r.modules} modules, PNG ${r.pixels}×${r.pixels}px. Test-scan the code with your phone before printing.`;
    ['dl', 'copy', 'copyimg'].forEach((i) => { $(i).disabled = false; });
  } catch (e) { payload = ''; cv.hidden = true; info.textContent = ''; ['dl', 'copy', 'copyimg'].forEach((i) => { $(i).disabled = true; }); if (quiet !== true) say(e.message); else say(''); }
}
form.addEventListener('input', () => run()); form.addEventListener('change', () => { showGroup(); run(); });
form.addEventListener('submit', (e) => e.preventDefault());
$('dl').onclick = () => cv.toBlob((b) => { if (!b) return say('Could not create the PNG.'); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `qr-${typeSel.value}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }, 'image/png');
$('copy').onclick = async () => { try { await navigator.clipboard.writeText(payload); say('Copied the QR content as text.', 'ok'); } catch { say('Copy failed; select the text manually.'); } };
$('copyimg').onclick = () => { if (!navigator.clipboard || !window.ClipboardItem) return say('Your browser cannot copy images; use Download PNG.', 'warn'); cv.toBlob(async (b) => { try { await navigator.clipboard.write([new ClipboardItem({ 'image/png': b })]); say('Copied the QR image.', 'ok'); } catch { say('Copy failed; use Download PNG.'); } }, 'image/png'); };
$('reset').onclick = () => { form.reset(); showGroup(); run(true); };
showGroup(); run(true);
