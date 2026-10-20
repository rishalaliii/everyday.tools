/* Shared page helpers for Stage 6 tools (classic script, safe on file://). Exposes globalThis.ET_UI. */
(function (g) {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const on = (sel, ev, fn) => { const e = $(sel); if (e) e.addEventListener(ev, fn); };
  function say(t, c) { const st = $('#status'); if (!st) return; st.textContent = t; st.className = 'status ' + (c || 'info'); st.hidden = !t; }
  async function copy(text) {
    if (!text) return say('Nothing to copy yet.', 'error');
    try { await navigator.clipboard.writeText(text); say('Copied.', 'ok'); }
    catch {
      try { const t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0'; document.body.appendChild(t); t.select(); const ok = document.execCommand('copy'); t.remove(); say(ok ? 'Copied.' : 'Copy failed – select the text and copy manually.', ok ? 'ok' : 'error'); }
      catch { say('Copy failed – select the text and copy manually.', 'error'); }
    }
  }
  function download(text, name, type) {
    if (!text) return say('Nothing to download yet.', 'error');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); say('Downloaded ' + name + '.', 'ok');
  }
  function readFile(file, cb, max) {
    if (!file) return;
    if (file.size > (max || 5e6)) return say('That file is larger than ' + Math.round((max || 5e6) / 1e6) + ' MB.', 'error');
    const r = new FileReader(); r.onerror = () => say('Could not read that file.', 'error'); r.onload = () => cb(String(r.result), file.name); r.readAsText(file);
  }
  g.ET_UI = { $, on, say, copy, download, readFile };
})(window);
