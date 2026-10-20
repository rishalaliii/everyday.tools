// Pure text helpers (no DOM) – unit-tested in tests/text.test.mjs
export const stats = (t) => ({
  words: (t.trim().match(/\S+/g) || []).length,
  chars: [...t].length,
  charsNoSpaces: [...t.replace(/\s/g, '')].length,
  sentences: t.split(/[.!?]+(?:\s+|$)/).filter((s) => s.trim()).length,
  paragraphs: t.split(/\n\s*\n/).filter((p) => p.trim()).length,
  lines: t ? t.split(/\r?\n/).length : 0,
});
export function convertCase(t, mode) {
  if (mode === 'upper') return t.toUpperCase();
  if (mode === 'lower') return t.toLowerCase();
  if (mode === 'title') return t.toLowerCase().replace(/(^|[\s\-(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
  throw new Error('Unknown case mode.');
}
export function dedupe(t, { caseSensitive = false, trim = true } = {}) {
  const seen = new Set(), out = [];
  for (const l of t.split(/\r?\n/)) {
    let k = trim ? l.trim() : l; if (!caseSensitive) k = k.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(l); }
  }
  return { text: out.join('\n'), removed: t.split(/\r?\n/).length - out.length };
}
export function sortLines(t, { desc = false, ignoreCase = true, natural = true } = {}) {
  const r = t.split(/\r?\n/).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: ignoreCase ? 'accent' : 'variant', numeric: natural }));
  return (desc ? r.reverse() : r).join('\n');
}
export function clean(t, { removeBlank = false } = {}) {
  let lines = t.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t\u00a0]+/g, ' ').trim());
  lines = removeBlank ? lines.filter(Boolean) : lines.filter((l, i) => l || lines[i - 1]);
  return lines.join('\n').trim();
}
export function findReplace(t, find, rep, { regex = false, caseSensitive = false } = {}) {
  if (!find) throw new Error('Enter the text to find.');
  let re;
  try { re = new RegExp(regex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), caseSensitive ? 'g' : 'gi'); }
  catch (e) { throw new Error('Invalid regular expression: ' + e.message); }
  const count = (t.match(re) || []).length;
  return { text: regex ? t.replace(re, rep) : t.replace(re, () => rep), count };
}
export function diffLines(a, b) {
  const A = a.split(/\r?\n/), B = b.split(/\r?\n/), n = A.length, m = B.length;
  if (n * m > 4e6) throw new Error('Texts are too long to compare in the browser (about 2,000 lines each at most).');
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const r = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { r.push({ t: 'same', s: A[i] }); i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) r.push({ t: 'del', s: A[i++] });
    else r.push({ t: 'add', s: B[j++] });
  }
  while (i < n) r.push({ t: 'del', s: A[i++] });
  while (j < m) r.push({ t: 'add', s: B[j++] });
  return r;
}
