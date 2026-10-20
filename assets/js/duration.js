// Pure helpers (no DOM) so they can be unit-tested with `npm test`.
export const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
const RE_CLOCK = /^(\d{1,3}):(\d{1,2})(?::(\d{1,2}))?$/;
const RE_HMS = /^(?:(\d+)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?\s*(?:(\d+)\s*s(?:ec(?:ond)?s?)?)?$/i;
const RE_ISO = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i;
const URLRE = /https?:\/\/\S+/i;

/** Accepts H:MM:SS, M:SS, "1h 2m 3s", "90m", ISO-8601 "PT1H2M3S". Returns seconds or null. */
export function parseDuration(input) {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s || !/\d/.test(s)) return null;
  let m;
  if ((m = s.match(RE_ISO))) return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
  if ((m = s.match(RE_CLOCK))) {
    if (m[3] === undefined) { const mi = +m[1], se = +m[2]; return se < 60 ? mi * 60 + se : null; }
    const h = +m[1], mi = +m[2], se = +m[3];
    return mi < 60 && se < 60 ? h * 3600 + mi * 60 + se : null;
  }
  if ((m = s.match(RE_HMS))) return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
  return null;
}
export const split = (t) => ({ h: Math.floor(t / 3600), m: Math.floor((t % 3600) / 60), s: Math.floor(t % 60) });
export const fmt = (t) => { const { h, m, s } = split(Math.round(t)); return `${h}h ${m}m ${s}s`; };
export const clock = (t) => { const { h, m, s } = split(Math.round(t)); const p = (n) => String(n).padStart(2, '0'); return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`; };
export const atSpeed = (t, sp) => Math.round(t / sp);
export const daysNeeded = (t, sp, hoursPerDay) => (!(hoursPerDay > 0) || !(sp > 0)) ? null : t <= 0 ? 0 : Math.ceil(t / sp / (hoursPerDay * 3600) - 1e-9);

export function extractPlaylistId(input) {
  const s = String(input || '').trim();
  if (!s) return null;
  if (/^(PL|UU|LL|FL|OL|RD)[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(u.hostname)) return null;
    const l = u.searchParams.get('list');
    return l && /^[A-Za-z0-9_-]{10,}$/.test(l) ? l : null;
  } catch { return null; }
}
export function extractVideoId(input) {
  const s = String(input || '').trim();
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
    const h = u.hostname.replace(/^(www|m)\./, '');
    let id = null;
    if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (h === 'youtube.com' || h === 'music.youtube.com') {
      if (u.pathname === '/watch') id = u.searchParams.get('v');
      else { const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/); id = m && m[1]; }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}
export function splitFields(line) {
  const d = line.includes('\t') ? '\t' : ',';
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"' && !cur) q = true;
    else if (c === d) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((f) => f.trim());
}
/** One line: "Title, 12:34", "Title 12:34", "https://youtu.be/ID 12:34", or CSV fields in any order. */
export function parseLine(line) {
  const f = splitFields(line);
  let title = '', url = null, sec = null;
  if (f.length === 1) {
    let rest = f[0]; const um = rest.match(URLRE);
    if (um) { url = um[0]; rest = rest.replace(um[0], ' '); }
    const tk = rest.trim().split(/\s+/).filter(Boolean);
    for (let i = tk.length - 1; i >= 0; i--) {
      if (/^\d+:\d{1,2}(:\d{1,2})?$|^PT/i.test(tk[i]) && parseDuration(tk[i]) > 0) { sec = parseDuration(tk[i]); tk.splice(i, 1); break; }
    }
    if (sec === null) { // trailing "1h 2m 3s" / "90m" style length (longest valid suffix wins)
      for (let i = 0; i < tk.length; i++) { const sfx = tk.slice(i).join(' '); if (/\d\s*[hms]/i.test(sfx) && parseDuration(sfx) > 0) { sec = parseDuration(sfx); tk.splice(i); break; } }
    }
    title = tk.join(' ').replace(/^[-–|]+\s*|\s*[-–|]+$/g, '');
  } else {
    let di = -1;
    for (let i = f.length - 1; i >= 0; i--) if (!URLRE.test(f[i]) && parseDuration(f[i]) > 0) { di = i; break; }
    if (di >= 0) sec = parseDuration(f[di]);
    const ui = f.findIndex((x) => URLRE.test(x));
    if (ui >= 0) url = f[ui].match(URLRE)[0];
    title = f.filter((_, i) => i !== di && i !== ui).filter(Boolean).join(', ');
  }
  const id = url ? extractVideoId(url) : null;
  return { title: title || (id ? `Video ${id}` : 'Untitled video'), sec, url, id, watched: false };
}
export function parseLines(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items = [];
  lines.forEach((l, i) => {
    if (i === 0 && /title/i.test(l) && /duration/i.test(l) && !splitFields(l).some((x) => parseDuration(x) > 0)) return;
    items.push(parseLine(l));
  });
  return items;
}
export function totals(videos) {
  let total = 0, watched = 0, unknown = 0, wc = 0;
  for (const v of videos) {
    if (v.sec > 0) { total += v.sec; if (v.watched) watched += v.sec; } else unknown++;
    if (v.watched) wc++;
  }
  return { count: videos.length, total, watched, remaining: total - watched, unknown, watchedCount: wc };
}
const esc = (s) => { s = String(s ?? ''); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const toCSV = (v) => ['#,title,duration,seconds,watched,url', ...v.map((x, i) => [i + 1, x.title, x.sec > 0 ? clock(x.sec) : '', x.sec > 0 ? x.sec : '', x.watched ? 'yes' : 'no', x.url || ''].map(esc).join(','))].join('\r\n');
