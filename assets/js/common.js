// Shared: theme toggle, tool registry, homepage mosaic with search + category filter, local "recent tools".
export const CATEGORIES = [
  { id: 'youtube', name: 'YouTube' },
  { id: 'text', name: 'Text tools' },
  { id: 'calc', name: 'Calculators' },
  { id: 'convert', name: 'Converters' },
  { id: 'qr', name: 'QR Codes' },
  { id: 'image', name: 'Image tools' },
  { id: 'pdf', name: 'PDF tools' },
  { id: 'network', name: 'Internet & Network' },
  { id: 'subtitle', name: 'Subtitle tools' },
];
// A tool is listed here ONLY when its page exists and works.
export const TOOLS = [
  { id: 'youtube-playlist-calculator', cat: 'youtube', name: 'YouTube Playlist Calculator', desc: 'Total length, watch time at any speed, progress and a study schedule.', url: '/tools/youtube-playlist-calculator/', color: '#e5322d', size: 'w t' },
  { id: 'word-counter', cat: 'text', name: 'Word & Character Counter', desc: 'Words, characters, sentences, paragraphs, lines.', url: '/tools/word-counter/', color: '#111', size: 'w' },
  { id: 'case-converter', cat: 'text', name: 'Case Converter', desc: 'UPPERCASE, lowercase or Title Case.', url: '/tools/case-converter/', color: '#2a6fdb' },
  { id: 'remove-duplicate-lines', cat: 'text', name: 'Remove Duplicate Lines', desc: 'Keep the first copy of every line.', url: '/tools/remove-duplicate-lines/', color: '#1b9e77', size: 't' },
  { id: 'sort-lines', cat: 'text', name: 'Sort Lines', desc: 'A–Z or Z–A with natural number order.', url: '/tools/sort-lines/', color: '#ff7a00' },
  { id: 'remove-extra-spaces', cat: 'text', name: 'Remove Extra Spaces', desc: 'Collapse spaces and blank lines.', url: '/tools/remove-extra-spaces/', color: '#7b3fe4' },
  { id: 'find-and-replace', cat: 'text', name: 'Find & Replace', desc: 'Plain text or regular expressions.', url: '/tools/find-and-replace/', color: '#00a6a6', size: 'w' },
  { id: 'text-compare', cat: 'text', name: 'Text Compare', desc: 'Line-by-line diff of two texts.', url: '/tools/text-compare/', color: '#d6336c' },
  { id: 'percentage-calculator', cat: 'calc', name: 'Percentage Calculator', desc: 'Percent of a number, what percent, and percent change.', url: '/tools/percentage-calculator/', color: '#2a6fdb', size: 'w' },
  { id: 'discount-calculator', cat: 'calc', name: 'Discount Calculator', desc: 'Sale price, savings and optional tax after a discount.', url: '/tools/discount-calculator/', color: '#ff7a00' },
  { id: 'age-calculator', cat: 'calc', name: 'Age Calculator', desc: 'Exact age in years, months and days, plus next birthday.', url: '/tools/age-calculator/', color: '#d6336c' },
  { id: 'date-difference-calculator', cat: 'calc', name: 'Date Difference Calculator', desc: 'Days, weeks, months and years between two dates.', url: '/tools/date-difference-calculator/', color: '#7b3fe4' },
  { id: 'gst-calculator', cat: 'calc', name: 'GST Calculator', desc: 'Add or remove GST and see the CGST/SGST split.', url: '/tools/gst-calculator/', color: '#1b9e77', size: 'w' },
  { id: 'bmi-calculator', cat: 'calc', name: 'BMI Calculator', desc: 'Body mass index with WHO adult category.', url: '/tools/bmi-calculator/', color: '#00a6a6' },
  { id: 'loan-emi-calculator', cat: 'calc', name: 'Loan EMI Calculator', desc: 'Monthly EMI, total interest and total payment.', url: '/tools/loan-emi-calculator/', color: '#111', size: 'w' },
  { id: 'length-converter', cat: 'convert', name: 'Length Converter', desc: 'Metres, kilometres, miles, feet, inches and more.', url: '/tools/length-converter/', color: '#e5322d' },
  { id: 'weight-converter', cat: 'convert', name: 'Weight Converter', desc: 'Kilograms, grams, pounds, ounces, stone and tonnes.', url: '/tools/weight-converter/', color: '#2a6fdb' },
  { id: 'temperature-converter', cat: 'convert', name: 'Temperature Converter', desc: 'Celsius, Fahrenheit and Kelvin.', url: '/tools/temperature-converter/', color: '#ff7a00' },
  { id: 'data-storage-converter', cat: 'convert', name: 'Data Storage Converter', desc: 'Bits, bytes, KB, MB, GB, TB and PB.', url: '/tools/data-storage-converter/', color: '#7b3fe4' },
  { id: 'qr-code-generator', cat: 'qr', name: 'QR Code Generator', desc: 'QR codes for links, text, email, phone, Wi-Fi and contacts. Download as PNG.', url: '/tools/qr-code-generator/', color: '#111', size: 'w t' },
  { id: 'image-compressor', cat: 'image', name: 'Image Compressor', desc: 'Make JPG, WebP and PNG files smaller. See before and after sizes.', url: '/tools/image-compressor/', color: '#e5322d', size: 'w' },
  { id: 'image-resizer', cat: 'image', name: 'Image Resizer', desc: 'Resize an image to an exact width and height in pixels.', url: '/tools/image-resizer/', color: '#2a6fdb' },
  { id: 'image-cropper', cat: 'image', name: 'Image Cropper', desc: 'Crop by dragging on the picture or by typing exact pixel values.', url: '/tools/image-cropper/', color: '#ff7a00' },
  { id: 'image-converter', cat: 'image', name: 'Image Converter (JPG, PNG, WebP)', desc: 'Convert between JPG, PNG and WebP.', url: '/tools/image-converter/', color: '#7b3fe4' },
  { id: 'favicon-generator', cat: 'image', name: 'Favicon Generator', desc: 'Make favicon.ico and PNG icons (16 to 512 px) from one image.', url: '/tools/favicon-generator/', color: '#1b9e77' },
  { id: 'merge-pdf', cat: 'pdf', name: 'Merge PDF', desc: 'Combine several PDFs into one, in the order you choose.', url: '/tools/merge-pdf/', color: '#e5322d', size: 'w' },
  { id: 'split-pdf', cat: 'pdf', name: 'Split PDF', desc: 'Split by page ranges, every N pages or into single pages.', url: '/tools/split-pdf/', color: '#2a6fdb' },
  { id: 'extract-pdf-pages', cat: 'pdf', name: 'Extract PDF Pages', desc: 'Pull selected pages out into a new PDF.', url: '/tools/extract-pdf-pages/', color: '#1b9e77' },
  { id: 'rotate-pdf-pages', cat: 'pdf', name: 'Rotate PDF Pages', desc: 'Rotate all or selected pages by 90°, 180° or 270°.', url: '/tools/rotate-pdf-pages/', color: '#7b3fe4' },
  { id: 'reorder-pdf-pages', cat: 'pdf', name: 'Reorder PDF Pages', desc: 'Move, delete or reverse pages and save a new PDF.', url: '/tools/reorder-pdf-pages/', color: '#ff7a00' },
  { id: 'images-to-pdf', cat: 'pdf', name: 'Images to PDF', desc: 'Turn JPG, PNG, WebP, GIF or BMP images into one PDF.', url: '/tools/images-to-pdf/', color: '#d6336c', size: 'w' },
  { id: 'file-to-pdf', cat: 'pdf', name: 'File to PDF Converter', desc: 'Convert common images and text files into one PDF.', url: '/tools/file-to-pdf/', color: '#e8461e', size: 'w' },
  { id: 'pdf-to-other-formats', cat: 'pdf', name: 'PDF to JPG, PNG or TXT', desc: 'Export PDF pages as images or extract selectable text.', url: '/tools/pdf-to-other-formats/', color: '#2a6fdb', size: 'w' },
  { id: 'pdf-editor', cat: 'pdf', name: 'Live PDF Editor', desc: 'Preview pages and add text, highlights, whiteouts and freehand marks.', url: '/tools/pdf-editor/', color: '#7b3fe4', size: 'w t' },
  { id: 'pdf-to-word', cat: 'pdf', name: 'PDF to Word (DOCX)', desc: 'Extract selectable PDF text into an editable Word document.', url: '/tools/pdf-to-word/', color: '#2875d7', size: 'w' },
  /*stage6*/
  { id: 'ipv4-subnet-calculator', cat: 'network', name: 'IPv4 Subnet Calculator', desc: 'Network, broadcast, usable range, hosts and mask.', url: '/tools/ipv4-subnet-calculator/', color: '#e8461e' },
  { id: 'ipv4-cidr-converter', cat: 'network', name: 'IPv4 / CIDR Converter', desc: 'Convert between /prefix, subnet mask and wildcard mask.', url: '/tools/ipv4-cidr-converter/', color: '#2a6fdb' },
  { id: 'public-ip-checker', cat: 'network', name: 'Public IP Checker', desc: 'See the public IP address websites see for you.', url: '/tools/public-ip-checker/', color: '#1b9e77' },
  { id: 'dns-lookup', cat: 'network', name: 'DNS Lookup', desc: 'Look up A, AAAA, MX, TXT, NS, CNAME, SOA and CAA records.', url: '/tools/dns-lookup/', color: '#7b3fe4' },
  { id: 'mac-address-formatter', cat: 'network', name: 'MAC Address Formatter & Validator', desc: 'Validate MACs and convert to colon, hyphen, Cisco or plain format.', url: '/tools/mac-address-formatter/', color: '#ff7a00' },
  { id: 'ipv4-address-validator', cat: 'network', name: 'IPv4 Address Validator', desc: 'Check IPv4 addresses and see type, class and binary form.', url: '/tools/ipv4-address-validator/', color: '#d6336c' },
  { id: 'ipv6-address-validator', cat: 'network', name: 'IPv6 Address Validator & Formatter', desc: 'Validate IPv6, then expand or compress it.', url: '/tools/ipv6-address-validator/', color: '#00a6a6' },
  { id: 'srt-subtitle-editor', cat: 'subtitle', name: 'SRT Subtitle Viewer & Editor', desc: 'Open, edit and preview .srt subtitles with live checks.', url: '/tools/srt-subtitle-editor/', color: '#e5322d' },
  { id: 'srt-validator', cat: 'subtitle', name: 'SRT Validator & Error Checker', desc: 'Find numbering, timing, overlap and formatting errors.', url: '/tools/srt-validator/', color: '#2a6fdb' },
  { id: 'srt-timestamp-shifter', cat: 'subtitle', name: 'SRT Timestamp Shifter', desc: 'Move every subtitle earlier or later by seconds.', url: '/tools/srt-timestamp-shifter/', color: '#1b9e77' },
  { id: 'srt-formatter', cat: 'subtitle', name: 'SRT Subtitle Formatter', desc: 'Renumber, tidy spacing, wrap lines and sort by time.', url: '/tools/srt-formatter/', color: '#7b3fe4' },
  { id: 'srt-to-txt-converter', cat: 'subtitle', name: 'SRT to TXT Converter', desc: 'Extract plain text from subtitles, without timings.', url: '/tools/srt-to-txt-converter/', color: '#ff7a00' },
  { id: 'txt-to-srt-generator', cat: 'subtitle', name: 'TXT to SRT Generator', desc: 'Turn text into SRT with automatic or fixed timing.', url: '/tools/txt-to-srt-generator/', color: '#d6336c' },
];
// Site root = two levels above this file, so the site works at a domain root OR in a subfolder.
const ROOT = new URL('../../', import.meta.url);
const href = (t) => new URL(t.url.replace(/^\//, ''), ROOT).href;
const RK = 'et:recent';
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
function theme() {
  const root = document.documentElement, b = document.getElementById('theme-toggle');
  if (!b) return;
  // Normalise saved values so a stale/invalid preference never leaves the UI in a half-themed state.
  try { root.dataset.theme = localStorage.getItem('et:theme') || 'dark'; } catch { root.dataset.theme = root.dataset.theme || 'dark'; }
  const sync = () => {
    const dark = root.dataset.theme === 'dark';
    b.textContent = dark ? '☼' : '☾';
    b.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    b.setAttribute('title', `Switch to ${dark ? 'light' : 'dark'} theme`);
    b.setAttribute('aria-pressed', String(dark));
  };
  b.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('et:theme', root.dataset.theme); } catch {}
    sync();
  });
  sync();
}
const ICONS = { youtube: '▶', text: 'T', calc: '∑', convert: '⇄', qr: '▦', image: '▧', pdf: '▤', network: '⌘', subtitle: 'CC' };
const TOOL_ICONS = {
  'youtube-playlist-calculator':'▶','word-counter':'Aa','case-converter':'Aa','remove-duplicate-lines':'⧉','sort-lines':'↕','remove-extra-spaces':'␠','find-and-replace':'⌕','text-compare':'⇆',
  'percentage-calculator':'%','discount-calculator':'％','age-calculator':'◷','date-difference-calculator':'▦','gst-calculator':'₹','bmi-calculator':'⚖','loan-emi-calculator':'₹',
  'length-converter':'↔','weight-converter':'⚖','temperature-converter':'°','data-storage-converter':'▤','qr-code-generator':'▦',
  'image-compressor':'▧','image-resizer':'↗','image-cropper':'⌗','image-converter':'◩','favicon-generator':'✦',
  'merge-pdf':'＋','split-pdf':'⑂','extract-pdf-pages':'⇱','rotate-pdf-pages':'↻','reorder-pdf-pages':'☷','images-to-pdf':'▧','file-to-pdf':'⇧PDF','pdf-to-other-formats':'PDF⇩','pdf-editor':'✎','pdf-to-word':'W',
  'ipv4-subnet-calculator':'⌘','ipv4-cidr-converter':'/24','public-ip-checker':'◎','dns-lookup':'DNS','mac-address-formatter':'⌁','ipv4-address-validator':'4','ipv6-address-validator':'6',
  'srt-subtitle-editor':'CC','srt-validator':'✓','srt-timestamp-shifter':'◷','srt-formatter':'≡','srt-to-txt-converter':'TXT','txt-to-srt-generator':'SRT'
};
const ICON_PALETTE = ['#ef4b2b','#2875d7','#169d80','#783fe1','#f27b0b','#d6336c','#009eaa','#202124','#b34bcb','#558b2f','#c0392b','#1769aa'];
function tile(t, i) {
  const a = document.createElement('a'); a.href = href(t); a.className = 'tile ' + (t.size || '');
  a.style.setProperty('--c', t.color); a.style.setProperty('--icon-bg', ICON_PALETTE[i % ICON_PALETTE.length]);
  const art = document.createElement('i'); art.className = 'art s' + (i % 4); art.setAttribute('aria-hidden', 'true');
  const k = document.createElement('span'); k.className = 'k'; k.textContent = CATEGORIES.find((c) => c.id === t.cat).name;
  const n = document.createElement('span'); n.className = 'n'; n.textContent = t.name;
  const d = document.createElement('span'); d.className = 'd'; d.textContent = t.desc;
  const ic = document.createElement('span'); ic.className = 'ico'; ic.setAttribute('aria-hidden', 'true'); ic.textContent = TOOL_ICONS[t.id] || ICONS[t.cat] || '◆';
  a.append(art, ic, k, n, d); return a;
}
function home() {
  const grid = document.getElementById('tool-grid'); if (!grid) return;
  const q = document.getElementById('search'), none = document.getElementById('no-results'), chips = document.getElementById('chips');
  let cat = (location.hash.slice(1) && CATEGORIES.some((c) => c.id === location.hash.slice(1))) ? location.hash.slice(1) : 'all';
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    const list = TOOLS.filter((t) => (cat === 'all' || t.cat === cat) && (!s || `${t.name} ${t.desc} ${t.cat}`.toLowerCase().includes(s)));
    grid.replaceChildren(...list.map(tile)); none.hidden = list.length > 0;
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    document.getElementById('count').textContent = `${list.length} tool${list.length === 1 ? '' : 's'}`;
  };
  chips.replaceChildren(...[{ id: 'all', name: 'All' }, ...CATEGORIES].map((c) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.cat = c.id; b.textContent = c.name;
    b.onclick = () => { cat = c.id; history.replaceState(null, '', c.id === 'all' ? '#tools' : '#' + c.id); draw(); }; return b; }));
  q.addEventListener('input', draw);
  document.querySelectorAll('[data-sidecat]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); cat = a.dataset.sidecat; history.replaceState(null, '', cat === 'all' ? '#tools' : '#' + cat); draw(); document.getElementById('tools').scrollIntoView({behavior:'smooth',block:'start'}); }));
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h === 'tools' || h === 'all') cat = 'all'; else if (CATEGORIES.some((c) => c.id === h)) cat = h; draw(); });
  draw();
  const menu = document.getElementById('tools-menu'), menuToggle = document.getElementById('menu-toggle');
  if (menu && menuToggle) {
    menu.replaceChildren(...CATEGORIES.map((c) => {
      const group = document.createElement('section'); group.className = 'menu-group';
      const heading = document.createElement('h2'); heading.textContent = c.name; group.append(heading);
      TOOLS.filter((t) => t.cat === c.id).forEach((t) => { const a = document.createElement('a'); a.href = href(t); a.textContent = t.name; group.append(a); });
      return group;
    }));
    menuToggle.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.setAttribute('aria-label', open ? 'Close tools menu' : 'Open tools menu'); });
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) { menu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { menu.hidden = true; menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.focus(); } });
  }
  const rec = store.get(RK, []).map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean);
  if (rec.length) {
    document.getElementById('recent-section').hidden = false;
    document.getElementById('recent-list').replaceChildren(...rec.map((t) => { const a = document.createElement('a'); a.href = href(t); a.textContent = t.name; a.style.marginRight = '14px'; return a; }));
  }
}
function recordUse() {
  const id = document.body.dataset.tool; if (!id) return;
  store.set(RK, [id, ...store.get(RK, []).filter((x) => x !== id)].slice(0, 6));
}
theme(); home(); recordUse();

// Tool pages: "close" (x) button on the panel, back to the home page.
(() => { const m = document.querySelector('main.wrap'), l = document.querySelector('a.logo'); if (!m || !l || document.getElementById('tool-grid') || m.querySelector('.panel-x')) return; const a = document.createElement('a'); a.className = 'panel-x'; a.href = l.getAttribute('href'); a.setAttribute('aria-label', 'Close and go back to all tools'); a.textContent = '×'; m.prepend(a); })();
