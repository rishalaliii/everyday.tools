/* SRT helpers – pure functions, no DOM. Classic script; exposes globalThis.ET_SRT. */
(function (g) {
  'use strict';
  const trunc = (s, n = 40) => (s.length > n ? s.slice(0, n) + '…' : s);
  const p2 = (n, w = 2) => String(n).padStart(w, '0');
  function parseTime(s) {
    const m = /^(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(String(s).trim());
    if (!m) return null;
    if (+m[2] > 59 || +m[3] > 59) return null;
    return ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 + +m[4].padEnd(3, '0');
  }
  function fmtTime(ms) {
    ms = Math.max(0, Math.round(ms));
    return `${p2(Math.floor(ms / 3600000))}:${p2(Math.floor(ms / 60000) % 60)}:${p2(Math.floor(ms / 1000) % 60)},${p2(ms % 1000, 3)}`;
  }
  // -> { cues:[{idx,start,end,text,line,dot}], issues:[{line,level,msg}] }
  function parse(text) {
    const lines = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
    const cues = [], issues = [];
    let i = 0;
    while (i < lines.length) {
      if (!lines[i].trim()) { i++; continue; }
      const startLine = i + 1, blk = [];
      while (i < lines.length && lines[i].trim()) blk.push(lines[i++]);
      let k = 0, idx = null;
      if (/^\d+$/.test(blk[0].trim())) { idx = +blk[0].trim(); k = 1; }
      else if (blk[0].includes('-->')) issues.push({ line: startLine, level: 'warning', msg: 'Cue has no number line.' });
      else { issues.push({ line: startLine, level: 'error', msg: `Expected a cue number or timing line but found "${trunc(blk[0])}". Block skipped.` }); continue; }
      const tl = blk[k], tLine = startLine + k;
      if (tl === undefined) { issues.push({ line: startLine, level: 'error', msg: `Cue ${idx} has no timing line. Block skipped.` }); continue; }
      const m = /^\s*(\S+)\s*-->\s*(\S+)(.*)$/.exec(tl);
      if (!m) { issues.push({ line: tLine, level: 'error', msg: `Invalid timing line "${trunc(tl)}". Expected 00:00:01,000 --> 00:00:03,000.` }); continue; }
      const a = parseTime(m[1]), b = parseTime(m[2]);
      if (a == null || b == null) { issues.push({ line: tLine, level: 'error', msg: `Invalid timestamp in "${trunc(tl)}" (use HH:MM:SS,mmm with minutes/seconds below 60). Cue skipped.` }); continue; }
      const dot = /\./.test(m[1] + m[2]);
      if (dot) issues.push({ line: tLine, level: 'warning', msg: 'Timestamp uses "." instead of "," before milliseconds (fixed on formatting).' });
      const body = blk.slice(k + 1);
      if (body.some((l) => /\d:\d\d:\d\d[,.]\d+\s*-->/.test(l))) issues.push({ line: tLine, level: 'warning', msg: 'Another timing line appears inside this cue – a blank line may be missing.' });
      cues.push({ idx, start: a, end: b, text: body.join('\n'), line: startLine, dot });
    }
    return { cues, issues };
  }
  function toSrt(cues) {
    return cues.map((c, n) => `${n + 1}\n${fmtTime(c.start)} --> ${fmtTime(c.end)}\n${c.text}`).join('\n\n') + (cues.length ? '\n' : '');
  }
  function validate(text, opt = {}) {
    const maxLine = opt.maxLine || 42, { cues, issues } = parse(text);
    if (!String(text).trim()) issues.push({ line: 0, level: 'error', msg: 'The subtitle text is empty.' });
    let prev = null;
    cues.forEach((c, n) => {
      if (c.idx != null && c.idx !== n + 1) issues.push({ line: c.line, level: 'warning', msg: `Cue is numbered ${c.idx} but is number ${n + 1} in order.` });
      if (c.end <= c.start) issues.push({ line: c.line, level: 'error', msg: `End time ${fmtTime(c.end)} is not after start time ${fmtTime(c.start)}.` });
      else if (c.end - c.start < 500) issues.push({ line: c.line, level: 'warning', msg: `Very short cue (${c.end - c.start} ms).` });
      else if (c.end - c.start > 10000) issues.push({ line: c.line, level: 'warning', msg: `Very long cue (${((c.end - c.start) / 1000).toFixed(1)} s).` });
      if (prev) {
        if (c.start < prev.start) issues.push({ line: c.line, level: 'error', msg: 'Cue starts before the previous cue (out of order).' });
        else if (c.start < prev.end) issues.push({ line: c.line, level: 'warning', msg: `Overlaps the previous cue by ${prev.end - c.start} ms.` });
      }
      if (!c.text.trim()) issues.push({ line: c.line, level: 'warning', msg: 'Cue has no text.' });
      const tl = c.text.split('\n');
      if (tl.length > 2) issues.push({ line: c.line, level: 'warning', msg: `Cue has ${tl.length} text lines (2 is the usual maximum).` });
      const long = tl.find((l) => [...l].length > maxLine);
      if (long) issues.push({ line: c.line, level: 'warning', msg: `A line is ${[...long].length} characters (over ${maxLine}).` });
      prev = c;
    });
    issues.sort((a, b) => a.line - b.line);
    return { cues, issues, errors: issues.filter((x) => x.level === 'error').length, warnings: issues.filter((x) => x.level === 'warning').length };
  }
  function shift(cues, ms) {
    let clamped = 0;
    const out = cues.map((c) => {
      let s = c.start + ms, e = c.end + ms;
      if (s < 0 || e < 0) { clamped++; s = Math.max(0, s); e = Math.max(0, e); }
      return { ...c, start: s, end: e };
    });
    return { cues: out, clamped };
  }
  const stripTags = (t) => t.replace(/<[^>]*>/g, '').replace(/\{\\[^}]*\}/g, '');
  function wrapText(t, max) {
    const words = t.replace(/\s+/g, ' ').trim().split(' '), lines = [];
    let cur = '';
    for (const w of words) { if (cur && [...cur + ' ' + w].length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w; }
    if (cur) lines.push(cur);
    return lines.join('\n');
  }
  function format(text, o = {}) {
    const { cues, issues } = parse(text);
    let list = cues.map((c) => {
      let t = c.text.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter(Boolean).join('\n');
      if (o.stripTags) t = stripTags(t);
      if (o.wrap) t = wrapText(t, o.wrap);
      return { ...c, text: t };
    });
    if (o.dropEmpty) list = list.filter((c) => c.text.trim());
    if (o.sort) list = list.slice().sort((a, b) => a.start - b.start);
    return { srt: toSrt(list), cues: list, issues, count: list.length };
  }
  function toTxt(cues, o = {}) {
    const parts = cues.map((c) => { let t = o.stripTags === false ? c.text : stripTags(c.text); return o.oneLine ? t.replace(/\s*\n\s*/g, ' ').trim() : t.trim(); }).filter(Boolean);
    return parts.join(o.blank ? '\n\n' : '\n') + (parts.length ? '\n' : '');
  }
  // o: { mode:'line'|'paragraph'|'sentence', startMs, gapMs, fixedMs (0 = use cps), cps, minMs, maxMs }
  function fromTxt(text, o = {}) {
    const mode = o.mode || 'line', cps = o.cps > 0 ? o.cps : 15, minMs = o.minMs || 1000, maxMs = o.maxMs || 7000, gap = o.gapMs ?? 100;
    let segs;
    const t = String(text).replace(/\r\n?/g, '\n').trim();
    if (!t) return [];
    if (mode === 'paragraph') segs = t.split(/\n\s*\n/);
    else if (mode === 'sentence') segs = t.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/);
    else segs = t.split('\n');
    segs = segs.map((s) => s.split('\n').map((l) => l.trim()).filter(Boolean).join('\n')).filter(Boolean);
    let at = Math.max(0, o.startMs || 0);
    return segs.map((s, n) => {
      const len = [...s.replace(/\s/g, '')].length, d = o.fixedMs > 0 ? o.fixedMs : Math.min(maxMs, Math.max(minMs, Math.round(len / cps * 1000)));
      const c = { idx: n + 1, start: at, end: at + d, text: s };
      at += d + gap; return c;
    });
  }
  g.ET_SRT = { parseTime, fmtTime, parse, toSrt, validate, shift, format, toTxt, fromTxt, stripTags };
})(typeof globalThis !== 'undefined' ? globalThis : window);
