import * as T from './text.js';
const $ = (s) => document.querySelector(s), op = document.body.dataset.op;
const inp = $('#in'), out = $('#out'), st = $('#status');
const on = (sel, ev, fn) => { const e = $(sel); if (e) e.addEventListener(ev, fn); }; // never throw on a missing control
const say = (t, c = 'info') => { st.textContent = t; st.className = 'status ' + c; st.hidden = !t; };
const v = (id) => { const e = $('#' + id); return e.type === 'checkbox' ? e.checked : e.value; };
let result = '';
function statsText(s) { return `Words: ${s.words}\nCharacters: ${s.chars}\nCharacters (no spaces): ${s.charsNoSpaces}\nSentences: ${s.sentences}\nParagraphs: ${s.paragraphs}\nLines: ${s.lines}`; }
function apply() {
  const t = inp.value;
  try {
    if (op === 'count') {
      const s = T.stats(t); result = statsText(s);
      say(t.trim() ? '' : 'Type or paste text above to count it.', 'info');
      $('#stats').replaceChildren(...[['Words', s.words], ['Characters', s.chars], ['Characters (no spaces)', s.charsNoSpaces], ['Sentences', s.sentences], ['Paragraphs', s.paragraphs], ['Lines', s.lines]].map(([k, n]) => {
        const d = document.createElement('div'); d.className = 'stat'; d.append(k); const b = document.createElement('b'); b.textContent = n.toLocaleString(); d.append(b); return d; }));
      return;
    }
    if (op === 'compare') {
      const d = T.diffLines(t, $('#in2').value); result = d.map((x) => ({ same: '  ', add: '+ ', del: '- ' }[x.t] + x.s)).join('\n');
      $('#diff').replaceChildren(...d.map((x) => { const e = document.createElement('div'); e.className = 'dl ' + x.t; e.textContent = ({ same: '  ', add: '+ ', del: '- ' }[x.t]) + x.s; return e; }));
      const a = d.filter((x) => x.t === 'add').length, r = d.filter((x) => x.t === 'del').length;
      return say(a || r ? `${a} line(s) added, ${r} removed.` : 'The texts are identical.', a || r ? 'info' : 'ok');
    }
    if (!t) return say('Enter some text first.', 'error');
    let note = 'Done.';
    if (op === 'case') result = T.convertCase(t, v('mode'));
    else if (op === 'dedupe') { const x = T.dedupe(t, { caseSensitive: v('cs'), trim: v('tr') }); result = x.text; note = `Removed ${x.removed} duplicate line(s).`; }
    else if (op === 'sort') result = T.sortLines(t, { desc: v('ord') === 'desc', ignoreCase: v('ic'), natural: v('nat') });
    else if (op === 'clean') result = T.clean(t, { removeBlank: v('rb') });
    else if (op === 'replace') { const x = T.findReplace(t, v('find'), v('rep'), { regex: v('rx'), caseSensitive: v('cs') }); result = x.text; note = `${x.count} replacement(s) made.`; }
    out.value = result; say(note, 'ok');
  } catch (e) { say(e.message, 'error'); }
}
on('#apply', 'click', apply);
if (op === 'count') ['input', 'change', 'keyup'].forEach((ev) => inp.addEventListener(ev, apply));
if (op === 'count') inp.addEventListener('paste', () => setTimeout(apply, 0)); // 'input' also fires; this covers old browsers
on('#copy', 'click', async () => { if (!result || (op === 'count' && !inp.value)) return say('Nothing to copy yet.', 'error'); try { await navigator.clipboard.writeText(result); say('Copied.', 'ok'); } catch { say('Copy failed – clipboard access was blocked.', 'error'); } });
on('#dl', 'click', () => { if (!result) return say('Nothing to download yet.', 'error'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([result], { type: 'text/plain;charset=utf-8' })); a.download = op + '-result.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); say('Downloaded.', 'ok'); });
on('#reset', 'click', () => { document.querySelectorAll('textarea').forEach((e) => { if (!e.readOnly) e.value = ''; }); if (out) out.value = ''; ['#diff', '#stats'].forEach((s) => $(s) && $(s).replaceChildren()); result = ''; say(''); if (op === 'count') apply(); });
if (op === 'count') apply();
