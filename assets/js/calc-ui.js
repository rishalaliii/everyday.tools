// Generic UI: reads inputs marked [data-f] inside body[data-op], runs OPS[op], shows results.
import { OPS } from './calc.js';
const op = document.body.dataset.op, form = document.getElementById('calc'), out = document.getElementById('result'), st = document.getElementById('status');
const fields = [...form.querySelectorAll('[data-f]')];
const today = new Date().toISOString().slice(0, 10);
fields.forEach((f) => { if (f.dataset.today != null && !f.value) f.value = today; });
const vals = () => Object.fromEntries(fields.map((f) => [f.dataset.f, f.value.trim()]));
let last = [];
function run(quiet) {
  try {
    last = OPS[op](vals()); st.hidden = true;
    out.replaceChildren(...last.map(([k, v]) => { const d = document.createElement('div'); d.className = 'stat'; const b = document.createElement('b'); b.textContent = v; d.append(b, k); return d; }));
  } catch (e) { last = []; out.replaceChildren(); if (quiet === true) { st.hidden = true; return; } st.textContent = e.message; st.className = 'status error'; st.hidden = false; }
}
form.addEventListener('input', () => run()); form.addEventListener('change', () => run());
form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
document.getElementById('copy').onclick = async () => {
  if (!last.length) return; const t = last.map(([k, v]) => `${k}: ${v}`).join('\n');
  try { await navigator.clipboard.writeText(t); st.textContent = 'Copied.'; st.className = 'status ok'; st.hidden = false; } catch { st.textContent = 'Copy failed; select the result manually.'; st.className = 'status error'; st.hidden = false; }
};
document.getElementById('reset').onclick = () => { fields.forEach((f) => { f.value = f.dataset.def ?? (f.dataset.today != null ? today : ''); }); run(true); };
const sw = document.getElementById('swap'); if (sw) sw.onclick = () => { const a = form.querySelector('[data-f=from]'), b = form.querySelector('[data-f=to]'); [a.value, b.value] = [b.value, a.value]; run(); };
fields.forEach((f) => { if (f.dataset.def == null && f.tagName === 'SELECT') f.dataset.def = f.value; });
run(true);
