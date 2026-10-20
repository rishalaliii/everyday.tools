/* Subtitle tools UI (classic script). Files are read locally with FileReader – nothing is uploaded. Needs tool-ui.js + srt-core.js. */
(function () {
  'use strict';
  const U = ET_UI, S = ET_SRT, $ = U.$, op = document.body.dataset.op;
  const inp = $('#in'), out = $('#out'), issuesEl = $('#issues'), prev = $('#preview');
  const num = (id, d) => { const e = $('#' + id); const v = e ? parseFloat(e.value) : NaN; return Number.isFinite(v) ? v : d; };
  const chk = (id) => !!($('#' + id) && $('#' + id).checked);
  const get = () => (op === 'edit' ? inp.value : (out ? out.value : ''));
  const ext = op === 'srt2txt' ? 'txt' : 'srt';

  function showIssues(list, max = 200) {
    if (!issuesEl) return;
    issuesEl.replaceChildren(...list.slice(0, max).map((x) => { const li = document.createElement('li'); li.className = x.level; li.textContent = `${x.level === 'error' ? '✗ Error' : '! Warning'}${x.line ? ' (line ' + x.line + ')' : ''}: ${x.msg}`; return li; }));
    if (list.length > max) { const li = document.createElement('li'); li.textContent = `…and ${list.length - max} more.`; issuesEl.append(li); }
  }
  function drawPreview(cues) {
    if (!prev) return;
    const tb = prev.querySelector('tbody'); tb.replaceChildren(...cues.slice(0, 500).map((c, n) => {
      const tr = document.createElement('tr');
      [n + 1, S.fmtTime(c.start), S.fmtTime(c.end), c.text].forEach((v, i) => { const td = document.createElement('td'); td.textContent = v; if (i === 3) td.style.whiteSpace = 'pre-wrap'; tr.append(td); });
      return tr; }));
    prev.hidden = !cues.length;
  }
  const summary = (v) => (v.errors || v.warnings ? `${v.errors} error(s), ${v.warnings} warning(s) in ${v.cues.length} cue(s).` : `No problems found in ${v.cues.length} cue(s).`);

  function run() {
    const src = inp.value;
    if (!src.trim()) { if (out) out.value = ''; showIssues([]); drawPreview([]); return U.say(op === 'txt2srt' ? 'Enter some text first, or load a .txt file.' : 'Paste subtitles or load an .srt file first.', 'error'); }
    try {
      if (op === 'edit' || op === 'validate') {
        const v = S.validate(src, { maxLine: num('maxline', 42) });
        showIssues(v.issues); drawPreview(v.cues);
        if (op === 'validate' && out) out.value = v.errors ? '' : S.toSrt(v.cues);
        return U.say(summary(v), v.errors ? 'error' : v.warnings ? 'warn' : 'ok');
      }
      if (op === 'shift') {
        const sign = $('#dir').value === 'earlier' ? -1 : 1, ms = Math.round(num('secs', 0) * 1000 * sign);
        const p = S.parse(src); if (!p.cues.length) return U.say('No valid subtitle cues found. ' + (p.issues[0] ? p.issues[0].msg : ''), 'error');
        const r = S.shift(p.cues, ms); out.value = S.toSrt(r.cues); showIssues(p.issues);
        return U.say(`Shifted ${r.cues.length} cue(s) by ${ms >= 0 ? '+' : ''}${ms} ms.` + (r.clamped ? ` ${r.clamped} cue(s) would start before 0 and were clamped to 00:00:00,000.` : '') + (p.issues.length ? ` ${p.issues.length} issue(s) in the input.` : ''), r.clamped || p.issues.length ? 'warn' : 'ok');
      }
      if (op === 'format') {
        const r = S.format(src, { wrap: chk('wrap') ? num('maxline', 42) : 0, stripTags: chk('strip'), sort: chk('sort'), dropEmpty: chk('drop') });
        if (!r.count) { showIssues(r.issues); return U.say('No valid cues found. ' + (r.issues[0] ? r.issues[0].msg : ''), 'error'); }
        out.value = r.srt; showIssues(r.issues); return U.say(`Formatted ${r.count} cue(s) and renumbered from 1.` + (r.issues.length ? ` ${r.issues.length} issue(s) found in the input.` : ''), r.issues.length ? 'warn' : 'ok');
      }
      if (op === 'srt2txt') {
        const p = S.parse(src); if (!p.cues.length) { showIssues(p.issues); return U.say('No valid subtitle cues found. ' + (p.issues[0] ? p.issues[0].msg : ''), 'error'); }
        out.value = S.toTxt(p.cues, { stripTags: !chk('keeptags'), oneLine: chk('oneline'), blank: chk('blank') }); showIssues(p.issues);
        return U.say(`Converted ${p.cues.length} cue(s) to plain text.` + (p.issues.length ? ` ${p.issues.length} issue(s) in the input.` : ''), p.issues.length ? 'warn' : 'ok');
      }
      if (op === 'txt2srt') {
        const fixed = chk('fixed') ? num('fixedsecs', 3) * 1000 : 0;
        const cues = S.fromTxt(src, { mode: $('#mode').value, startMs: num('start', 0) * 1000, gapMs: Math.round(num('gap', 0.1) * 1000), cps: num('cps', 15), fixedMs: fixed });
        out.value = S.toSrt(cues); const last = cues[cues.length - 1];
        return U.say(`Generated ${cues.length} cue(s), ending at ${S.fmtTime(last.end)}. Timing is estimated, so review it before use.`, 'ok');
      }
    } catch (e) { U.say(e.message, 'error'); }
  }
  U.on('#go', 'click', run);
  if (op === 'edit') { let t; inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { if (inp.value.trim()) run(); }, 400); }); }
  U.on('#fix', 'click', () => { // editor: renumber + clean into the editor itself
    if (!inp.value.trim()) return U.say('Nothing to clean yet.', 'error');
    const r = S.format(inp.value, {}); if (!r.count) return U.say('No valid cues found to clean.', 'error');
    inp.value = r.srt; run(); U.say(`Cleaned and renumbered ${r.count} cue(s).`, 'ok');
  });
  U.on('#file', 'change', (e) => {
    const f = e.target.files[0]; U.readFile(f, (t, name) => { inp.value = t; U.say(`Loaded ${name} locally (${t.length.toLocaleString('en-US')} characters).`, 'ok'); if (op !== 'txt2srt' || t.trim()) run(); }); e.target.value = '';
  });
  U.on('#copy', 'click', () => U.copy(get()));
  U.on('#dl', 'click', () => U.download(get(), (op === 'edit' ? 'edited' : op) + '.' + ext, 'text/plain;charset=utf-8'));
  U.on('#reset', 'click', () => { inp.value = ''; if (out) out.value = ''; showIssues([]); drawPreview([]); U.say(''); });
})();
