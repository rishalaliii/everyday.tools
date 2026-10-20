// Homepage only: twinkling star field + fanned card deck (click a side card to bring it forward; click the front card to browse that category).
(() => {
  // seeded PRNG so the sky is the same on every visit
  let s = 20260; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sky = document.querySelector('.stars');
  if (sky) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 80; i++) {
      const d = document.createElement('i'), z = rnd() < .85 ? 1 + rnd() : 2 + rnd() * 1.2;
      d.style.cssText = `left:${(rnd() * 100).toFixed(2)}%;top:${(rnd() * 100).toFixed(2)}%;width:${z.toFixed(1)}px;height:${z.toFixed(1)}px;--o1:${(.1 + rnd() * .3).toFixed(2)};--o2:${(.5 + rnd() * .5).toFixed(2)};--d:${(3 + rnd() * 6).toFixed(1)}s;animation-delay:-${(rnd() * 8).toFixed(1)}s`;
      frag.append(d);
    }
    sky.append(frag);
  }
  // Cassette carousel: 5 cards visible, slides right-to-left one card at a time, 2s hold, loops forever.
  const deck = document.querySelector('.deck'), cards = [...document.querySelectorAll('.deck-card')]; if (!cards.length) return;
  const n = cards.length, HOLD = 2000, SLIDE = 700;
  const track = document.createElement('div'); track.className = 'deck-track';
  deck.prepend(track); cards.forEach((c) => track.append(c));
  cards.slice(0, Math.min(5, n)).forEach((c) => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); k.tabIndex = -1; track.append(k); });
  let idx = 0, timer = null, paused = false;
  const step = () => { const a = track.children[0], b = track.children[1]; return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth; };
  const put = (anim) => { track.style.transition = anim ? '' : 'none'; track.style.transform = `translate3d(${-idx * step()}px,0,0)`; if (!anim) void track.offsetWidth; };
  const next = () => {
    idx++; put(true);
    setTimeout(() => { if (idx >= n) { idx = 0; put(false); } }, SLIDE + 30);
  };
  const prev = () => { if (idx === 0) { idx = n; put(false); } idx--; requestAnimationFrame(() => put(true)); };
  const schedule = () => { clearTimeout(timer); if (!paused) timer = setTimeout(() => { next(); schedule(); }, HOLD + SLIDE); };
  const pause = (v) => { paused = v; schedule(); };
  deck.querySelector('.next').onclick = () => { next(); schedule(); };
  deck.querySelector('.prev').onclick = () => { prev(); schedule(); };
  deck.addEventListener('mouseenter', () => pause(true)); deck.addEventListener('mouseleave', () => pause(false));
  deck.addEventListener('focusin', () => pause(true)); deck.addEventListener('focusout', () => pause(false));
  document.addEventListener('visibilitychange', () => pause(document.hidden));
  addEventListener('resize', () => put(false));
  track.addEventListener('click', (e) => {
    const card = e.target.closest('.deck-card'); if (!card) return; e.preventDefault();
    location.hash = card.dataset.cat; // common.js listens for hashchange and filters the grid
    document.getElementById('tools').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  let x0 = null; // swipe
  deck.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  deck.addEventListener('pointerup', (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) { e.clientX < x0 ? next() : prev(); schedule(); } x0 = null; });
  put(false); schedule();
})();
