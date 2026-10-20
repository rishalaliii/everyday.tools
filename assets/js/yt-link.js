/* YouTube Playlist Calculator – paste a link only. No API key, no account.
   Reads the public playlist through free community Piped / Invidious API servers (third parties), so availability varies.
   Classic script; logic exposed as globalThis.ET_YT for tests. */
(function (g) {
  'use strict';
  const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
  function extractId(input) {
    const s = String(input || '').trim();
    if (/^(PL|UU|LL|FL|OL)[A-Za-z0-9_-]{10,}$/.test(s)) return s;
    try {
      const u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
      if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)youtube-nocookie\.com$/.test(u.hostname)) return null;
      const l = u.searchParams.get('list');
      return l && /^[A-Za-z0-9_-]{10,}$/.test(l) ? l : null;
    } catch { return null; }
  }
  const fmt = (sec) => { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return (h ? h + 'h ' : '') + (h || m ? m + 'm ' : '') + s + 's'; };
  const norm = (arr) => arr.map((v) => ({ title: v.title || 'Untitled', sec: v.sec > 0 ? v.sec : 0 }));
  // Each source returns { title, videos:[{title,sec}] } or throws.
  async function fromInvidious(base, id, getJson, progress) {
    const vids = []; let title = '', total = 0;
    for (let page = 1; page <= 60; page++) {
      const j = await getJson(`${base}/api/v1/playlists/${id}?page=${page}`);
      if (!j || !Array.isArray(j.videos)) throw new Error('unexpected response');
      title = j.title || title; total = j.videoCount || total;
      if (!j.videos.length) break;
      vids.push(...j.videos.map((v) => ({ title: v.title, sec: v.lengthSeconds })));
      progress(vids.length, total);
      if (total && vids.length >= total) break;
    }
    if (!vids.length) throw new Error('no videos returned');
    return { title, videos: norm(vids), total };
  }
  async function fromPiped(base, id, getJson, progress) {
    let j = await getJson(`${base}/playlists/${id}`);
    if (!j || !Array.isArray(j.relatedStreams)) throw new Error('unexpected response');
    const title = j.name || '', total = j.videos || 0, vids = j.relatedStreams.map((v) => ({ title: v.title, sec: v.duration }));
    progress(vids.length, total);
    for (let n = 0; j.nextpage && n < 60; n++) {
      j = await getJson(`${base}/nextpage/playlists/${id}?nextpage=${encodeURIComponent(j.nextpage)}`);
      if (!j || !Array.isArray(j.relatedStreams)) throw new Error('unexpected response');
      vids.push(...j.relatedStreams.map((v) => ({ title: v.title, sec: v.duration })));
      progress(vids.length, total);
    }
    if (!vids.length) throw new Error('no videos returned');
    return { title, videos: norm(vids), total };
  }
  // sources: [{kind:'piped'|'invidious', base}] – tries each until one returns the whole playlist.
  async function load(id, sources, getJson, progress, status) {
    const errs = [];
    for (const s of sources) {
      let host = s.base; try { host = new URL(s.base).host; } catch {}
      status(`Trying ${host}…`);
      try { const r = await (s.kind === 'piped' ? fromPiped : fromInvidious)(s.base.replace(/\/$/, ''), id, getJson, progress); r.via = host; return r; }
      catch (e) { errs.push(`${host}: ${e.message}`); }
    }
    const e = new Error('No free public server could read this playlist.'); e.details = errs; throw e;
  }
  function summarize(videos) {
    const known = videos.filter((v) => v.sec > 0), total = known.reduce((a, v) => a + v.sec, 0);
    return { count: videos.length, unknown: videos.length - known.length, total, average: known.length ? total / known.length : 0 };
  }
  g.ET_YT = { extractId, fmt, load, summarize, SPEEDS };
  if (typeof document === 'undefined') return;

  const U = g.ET_UI, $ = U.$;
  const FALLBACK = [{ kind: 'piped', base: 'https://pipedapi.kavin.rocks' }, { kind: 'invidious', base: 'https://yewtu.be' }, { kind: 'invidious', base: 'https://inv.nadeko.net' }, { kind: 'invidious', base: 'https://invidious.nerdvpn.de' }];
  async function getJson(url) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 12000);
    try {
      const r = await fetch(url, { signal: ac.signal, headers: { accept: 'application/json' } });
      if (r.status === 429) throw new Error('rate limited');
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { throw new Error(e.name === 'AbortError' ? 'timed out' : e instanceof TypeError ? 'blocked or unreachable' : e.message); }
    finally { clearTimeout(t); }
  }
  async function discover() {
    const list = [];
    try { const p = await getJson('https://piped-instances.kavin.rocks/'); for (const i of (p || []).slice(0, 4)) if (i.api_url) list.push({ kind: 'piped', base: i.api_url }); } catch {}
    try { const v = await getJson('https://api.invidious.io/instances.json?sort_by=health'); for (const [, i] of (v || []).filter(([, i]) => i.api && i.type === 'https').slice(0, 4)) list.push({ kind: 'invidious', base: i.uri }); } catch {}
    const seen = new Set(); return [...list, ...FALLBACK].filter((s) => !seen.has(s.base) && seen.add(s.base));
  }
  let data = null, summaryText = '';
  function render() {
    if (!data) return;
    const s = summarize(data.videos), sp = parseFloat($('#speed').value) || 1;
    const stats = [['Videos', s.count], ['Total length (1x)', fmt(s.total)], [`At ${sp}x`, fmt(s.total / sp)], ['Average video', fmt(s.average)]];
    $('#stats').replaceChildren(...stats.map(([k, v]) => { const d = document.createElement('div'); d.className = 'stat'; d.append(k); const b = document.createElement('b'); b.textContent = v; d.append(b); return d; }));
    $('#speed-rows').replaceChildren(...SPEEDS.map((x) => { const tr = document.createElement('tr'); [x + 'x', fmt(s.total / x)].forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.append(td); }); return tr; }));
    const w = $('#warn'); w.hidden = !s.unknown; w.textContent = s.unknown ? `${s.unknown} video(s) have no length (deleted, private, restricted or live) and are not included in the total.` : '';
    summaryText = [`YouTube playlist: ${data.title || '(untitled)'}`, `Videos: ${s.count}${s.unknown ? ` (${s.unknown} without length)` : ''}`, `Total length at 1x: ${fmt(s.total)}`, ...SPEEDS.slice(1).map((x) => `At ${x}x: ${fmt(s.total / x)}`), `Average video: ${fmt(s.average)}`].join('\n');
    $('#result').hidden = false;
  }
  async function go() {
    const id = extractId($('#link').value);
    if (!$('#link').value.trim()) return U.say('Paste a YouTube playlist link first.', 'error');
    if (!id) return U.say('That does not look like a YouTube playlist link. It should contain "list=…", e.g. https://www.youtube.com/playlist?list=PL…', 'error');
    const b = $('#go'), bar = $('#bar'); b.disabled = true; $('#result').hidden = true; bar.hidden = false; bar.removeAttribute('value'); data = null;
    try {
      U.say('Finding a free public server…', 'info');
      const sources = await discover();
      data = await load(id, sources, getJson, (n, t) => { if (t) { bar.max = t; bar.value = n; } U.say(`Reading playlist… ${n}${t ? ' of ' + t : ''} videos`, 'info'); }, (m) => U.say(m, 'info'));
      $('#title').textContent = data.title || 'Playlist'; render(); U.say(`Done – read ${data.videos.length} videos via ${data.via}.`, 'ok');
    } catch (e) {
      U.say((e.message || 'Failed.') + ' These free servers are run by volunteers and are often busy or blocked. Wait a minute and try again, try another network, or check the playlist is public or unlisted. Private playlists cannot be read.' + (e.details ? ' Details: ' + e.details.slice(0, 4).join(' | ') : ''), 'error');
    } finally { b.disabled = false; bar.hidden = true; }
  }
  U.on('#go', 'click', go);
  U.on('#link', 'keydown', (e) => { if (e.key === 'Enter') go(); });
  U.on('#speed', 'change', render);
  U.on('#copy', 'click', () => U.copy(summaryText));
  U.on('#dl', 'click', () => U.download(summaryText + '\n', 'playlist-summary.txt'));
  U.on('#reset', 'click', () => { $('#link').value = ''; data = null; summaryText = ''; $('#result').hidden = true; U.say(''); });
})(typeof globalThis !== 'undefined' ? globalThis : window);
