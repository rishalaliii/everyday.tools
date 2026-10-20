// Generates Stage 6 pages (word counter, network tools, subtitle tools), and idempotently patches
// assets/js/common.js (registry) and sitemap.xml.  Run: node scripts/gen-stage6-pages.mjs
import fs from 'node:fs';
const BASE = 'https://everydaytools.pages.dev';
const f = (id, label, ph = '', extra = '') => `<label>${label} <input id="${id}" type="text" placeholder="${ph}" autocomplete="off" spellcheck="false" ${extra}></label>`;
const ta = (id, label, rows, ph = '') => `<label for="${id}">${label}</label><textarea id="${id}" rows="${rows}" spellcheck="false" placeholder="${ph}"></textarea>`;
const cb = (id, label, on) => `<label><input type="checkbox" id="${id}"${on ? ' checked' : ''}> ${label}</label>`;
const file = (accept) => `<label>Load a file (read locally, never uploaded) <input id="file" type="file" accept="${accept}"></label>`;
const issues = '<ul id="issues" class="issues" aria-live="polite"></ul>';
const outTa = (label = 'Result') => `<label for="out">${label}</label><textarea id="out" rows="10" readonly spellcheck="false"></textarea>`;
const pre = '<pre id="out" class="out empty" aria-live="polite">Results will appear here.</pre>';

export const NET = 'network', SUB = 'subtitle';
export const TOOLS6 = [
  // ---- network ----
  { id: 'ipv4-subnet-calculator', cat: NET, op: 'subnet', name: 'IPv4 Subnet Calculator', color: '#e8461e', short: 'Network, broadcast, usable range, hosts and mask.', meta: 'Free IPv4 subnet calculator: network address, broadcast address, usable host range, host count, subnet and wildcard mask. Runs in your browser.',
    body: `<div class="row">${f('ip', 'IPv4 address', '192.168.1.10', 'inputmode="decimal"')}${f('mask', 'Mask or CIDR', '/24 or 255.255.255.0')}</div><p class="mut">You can also type <b>192.168.1.10/24</b> in the address box.</p>`, out: pre, go: 'Calculate',
    faq: [['What is a usable host range?', 'Every address between the network and broadcast addresses. /31 and /32 are special cases and are explained in the result.'], ['Does this scan my network?', 'No. It only does arithmetic on the numbers you type.']] },
  { id: 'ipv4-cidr-converter', cat: NET, op: 'cidr', name: 'IPv4 / CIDR Converter', color: '#2a6fdb', short: 'Convert between /prefix, subnet mask and wildcard mask.', meta: 'Convert IPv4 CIDR prefixes to subnet masks and wildcard masks and back, with address counts. Free, in your browser.',
    body: `<div class="row">${f('v', 'Prefix, mask or wildcard', '/24, 255.255.255.0 or 0.0.0.255')}</div>`, out: pre, go: 'Convert',
    faq: [['What is a wildcard mask?', 'The inverse of a subnet mask, used in Cisco ACLs and OSPF network statements (0.0.0.255 for a /24).'], ['Why is my mask rejected?', 'Subnet masks must be a run of 1 bits followed by 0 bits, such as 255.255.248.0.']] },
  { id: 'public-ip-checker', cat: NET, op: 'myip', name: 'Public IP Checker', color: '#1b9e77', short: 'See the public IP address websites see for you.', meta: 'Check your public IP address. Contacts the external ipify service; nothing else is sent or stored.',
    body: `<p class="status warn">This tool contacts an external service (api.ipify.org) to learn your public IP address. That service sees your IP address like any website you visit. Nothing else is sent.</p>`, out: pre, go: 'Check my public IP', noLive: 1,
    faq: [['Why does it differ from my router IP?', 'Your router has a private address on your network; the public address belongs to your ISP, VPN or proxy.'], ['It fails or times out.', 'The service may be blocked by an ad blocker, firewall or VPN, or you may be offline.']] },
  { id: 'dns-lookup', cat: NET, op: 'dns', name: 'DNS Lookup', color: '#7b3fe4', short: 'Look up A, AAAA, MX, TXT, NS, CNAME, SOA and CAA records.', meta: 'Free DNS lookup using public DNS-over-HTTPS (Cloudflare, with Google as fallback). Contacts external services.',
    body: `<p class="status warn">The domain you enter is sent to Cloudflare (or Google as a fallback) over DNS-over-HTTPS. It will not show private/internal DNS records.</p><div class="row">${f('dom', 'Domain', 'example.com')}<label>Record type <select id="type"><option>A</option><option>AAAA</option><option>MX</option><option>TXT</option><option>NS</option><option>CNAME</option><option>SOA</option><option>CAA</option></select></label></div>`, out: pre, go: 'Look up',
    faq: [['What does NXDOMAIN mean?', 'The domain name does not exist.'], ['Why are there no records?', 'The name exists but has no record of that type, or the resolver returned an empty answer.']] },
  { id: 'mac-address-formatter', cat: NET, op: 'mac', name: 'MAC Address Formatter & Validator', color: '#ff7a00', short: 'Validate MACs and convert to colon, hyphen, Cisco or plain format.', meta: 'Validate MAC addresses and convert them to colon, hyphen, Cisco dotted or plain formats. Free, in your browser.',
    body: ta('in', 'MAC addresses (one per line)', 5, '00:1A:2B:3C:4D:5E\n001A.2B3C.4D5E'), out: pre, go: 'Format',
    faq: [['Which formats are accepted?', 'AA:BB:CC:DD:EE:FF, AA-BB-CC-DD-EE-FF, AABB.CCDD.EEFF and 12 plain hex digits.'], ['Does it look up the manufacturer?', 'No. It shows the first three bytes (OUI) only; vendor lookup needs an external database.']] },
  { id: 'ipv4-address-validator', cat: NET, op: 'ipv4', name: 'IPv4 Address Validator', color: '#d6336c', short: 'Check IPv4 addresses and see type, class and binary form.', meta: 'Validate IPv4 addresses with clear error reasons, plus type, class, decimal, hex and binary forms. Free, in your browser.',
    body: ta('in', 'IPv4 addresses (one per line)', 5, '192.168.1.1\n256.1.1.1'), out: pre, go: 'Validate',
    faq: [['Why are leading zeros rejected?', 'Some systems read 010 as octal, so 192.168.01.1 is ambiguous.']] },
  { id: 'ipv6-address-validator', cat: NET, op: 'ipv6', name: 'IPv6 Address Validator & Formatter', color: '#00a6a6', short: 'Validate IPv6, then expand or compress it.', meta: 'Validate IPv6 addresses and convert to expanded or RFC 5952 compressed form, with address type. Free, in your browser.',
    body: ta('in', 'IPv6 addresses (one per line)', 5, '2001:db8::1\nfe80:0:0:0:1:2:3:4'), out: pre, go: 'Validate',
    faq: [['What is compressed form?', 'Leading zeros dropped and the longest run of zero groups replaced by "::" (RFC 5952).'], ['Are zone IDs like %eth0 supported?', 'They are accepted and ignored; they are not part of the address.']] },
  // ---- subtitles ----
  { id: 'srt-subtitle-editor', cat: SUB, op: 'edit', name: 'SRT Subtitle Viewer & Editor', color: '#e5322d', short: 'Open, edit and preview .srt subtitles with live checks.', meta: 'View and edit SRT subtitle files in your browser with a cue preview and live validation. Files are never uploaded.',
    body: file('.srt,.txt,text/plain') + ta('in', 'Subtitles (editable)', 12, '1\n00:00:01,000 --> 00:00:03,500\nHello, world!'), go: 'Check & preview', extraBtn: '<button id="fix" type="button">Clean & renumber</button>',
    after: `${issues}<div id="preview" class="tw" hidden><table><caption class="mut" style="text-align:left">Preview (first 500 cues)</caption><thead><tr><th>#</th><th>Start</th><th>End</th><th>Text</th></tr></thead><tbody></tbody></table></div>`,
    faq: [['Is my file uploaded?', 'No. It is read and edited locally in your browser.'], ['Which encoding is used?', 'UTF-8. Save legacy-encoded files as UTF-8 first.']] },
  { id: 'srt-validator', cat: SUB, op: 'validate', name: 'SRT Validator & Error Checker', color: '#2a6fdb', short: 'Find numbering, timing, overlap and formatting errors.', meta: 'Check SRT subtitle files for bad timestamps, overlaps, numbering and long lines. Local processing, nothing uploaded.',
    body: file('.srt,.txt,text/plain') + ta('in', 'Subtitles', 10) + `<div class="row"><label>Max characters per line <input id="maxline" type="number" min="10" max="120" value="42" style="width:80px"></label></div>`, out: outTa('Cleaned SRT (when no errors)'), go: 'Validate', after: issues,
    faq: [['What counts as an error?', 'Invalid timestamps, end before start, out-of-order cues and unreadable blocks. Overlaps, numbering gaps and long lines are warnings.']] },
  { id: 'srt-timestamp-shifter', cat: SUB, op: 'shift', name: 'SRT Timestamp Shifter', color: '#1b9e77', short: 'Move every subtitle earlier or later by seconds.', meta: 'Shift SRT subtitle timestamps earlier or later to fix sync. Works locally in your browser.',
    body: file('.srt,.txt,text/plain') + ta('in', 'Subtitles', 10) + `<div class="row"><label>Shift by <input id="secs" type="number" step="0.001" min="0" value="1" style="width:100px"> seconds</label><label>Direction <select id="dir"><option value="later">later (delay)</option><option value="earlier">earlier</option></select></label></div>`, out: outTa('Shifted SRT'), go: 'Shift', after: issues,
    faq: [['What if times go below zero?', 'Those cues are clamped to 00:00:00,000 and you are told how many.']] },
  { id: 'srt-formatter', cat: SUB, op: 'format', name: 'SRT Subtitle Formatter', color: '#7b3fe4', short: 'Renumber, tidy spacing, wrap lines and sort by time.', meta: 'Clean and format SRT subtitles: renumber, trim spaces, wrap long lines, strip tags and sort. Local, free.',
    body: file('.srt,.txt,text/plain') + ta('in', 'Subtitles', 10) + `<div class="row">${cb('wrap', 'Wrap long lines', 1)}<label>at <input id="maxline" type="number" min="10" max="120" value="42" style="width:80px"> chars</label>${cb('strip', 'Strip HTML/style tags')}${cb('sort', 'Sort by start time', 1)}${cb('drop', 'Remove empty cues', 1)}</div>`, out: outTa('Formatted SRT'), go: 'Format', after: issues,
    faq: [['Does formatting change timing?', 'No. Only numbering, spacing, line breaks and the options you choose.']] },
  { id: 'srt-to-txt-converter', cat: SUB, op: 'srt2txt', name: 'SRT to TXT Converter', color: '#ff7a00', short: 'Extract plain text from subtitles, without timings.', meta: 'Convert SRT subtitles to plain text by removing numbers and timestamps. Free and local.',
    body: file('.srt,.txt,text/plain') + ta('in', 'Subtitles', 10) + `<div class="row">${cb('oneline', 'Join each cue onto one line')}${cb('blank', 'Blank line between cues')}${cb('keeptags', 'Keep tags like &lt;i&gt;')}</div>`, out: outTa('Plain text'), go: 'Convert', after: issues,
    faq: [['Are speaker labels kept?', 'Yes, anything inside the cue text stays; only numbers, timings and tags are removed.']] },
  { id: 'txt-to-srt-generator', cat: SUB, op: 'txt2srt', name: 'TXT to SRT Generator', color: '#d6336c', short: 'Turn text into SRT with automatic or fixed timing.', meta: 'Generate an SRT subtitle file from plain text using reading speed or fixed durations. Local, free.',
    body: file('.txt,text/plain') + ta('in', 'Text', 10, 'One subtitle per line…') + `<div class="row"><label>Split by <select id="mode"><option value="line">line</option><option value="paragraph">paragraph</option><option value="sentence">sentence</option></select></label><label>Start at <input id="start" type="number" min="0" step="0.1" value="0" style="width:80px"> s</label><label>Gap <input id="gap" type="number" min="0" step="0.05" value="0.1" style="width:80px"> s</label></div><div class="row" style="margin-top:8px"><label>Reading speed <input id="cps" type="number" min="5" max="40" value="15" style="width:80px"> chars/s</label>${cb('fixed', 'Use fixed duration')}<label><input id="fixedsecs" type="number" min="0.5" step="0.1" value="3" style="width:80px"> s per cue</label></div>`, out: outTa('Generated SRT'), go: 'Generate',
    faq: [['How are durations decided?', 'From text length at your reading speed (1 to 7 seconds per cue), unless you choose a fixed duration. They are estimates, so review before publishing.']] },
];
const CATNAME = { network: 'Internet & Network', subtitle: 'Subtitle tools' };
const HEAD = (title, desc, url, rel) => `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{document.documentElement.dataset.theme=localStorage.getItem('et:theme')||'light'}catch(e){}</script>
<title>${title} – Free Online | EverydayTools</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23F8BB18'/%3E%3Crect x='3' y='3' width='12' height='12' fill='%23111'/%3E%3Crect x='17' y='17' width='12' height='12' fill='%23111'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../../assets/css/style.css">
</head>`;
const SHELL_TOP = (id, op) => `<body data-tool="${id}" data-op="${op}">
<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap"><a class="logo" href="../../">Everyday<span>Tools</span></a><div class="hnav"><button id="theme-toggle" type="button">Theme</button><a class="explore" href="../../#tools">Explore tools</a></div></div></header>`;
const SHELL_BOT = `<footer class="site"><div class="wrap">© EverydayTools. Processing happens in your browser. <a href="../../">All tools</a> · <a href="../../about/">About</a> · <a href="../../contact/">Contact</a> · <a href="../../privacy-policy/">Privacy</a> · <a href="../../terms/">Terms</a> · <a href="../../disclaimer/">Disclaimer</a></div></footer>`;
const AD = '<aside class="ad-slot" aria-label="Advertisement placeholder">Ad placeholder – replace with AdSense unit after approval (see README)</aside>';
const faqHtml = (faq) => `<section aria-labelledby="faq"><h2 id="faq">FAQ</h2>${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`;

function toolPage(t) {
  const url = `${BASE}/tools/${t.id}/`, isNet = t.cat === NET;
  const related = TOOLS6.filter((x) => x.cat === t.cat && x.id !== t.id).map((x) => `<a href="../${x.id}/">${x.name}</a>`).join(' · ');
  const privacy = isNet ? '' : ' Subtitle text and files never leave your browser.';
  return `${HEAD(t.name, t.meta, url)}
${SHELL_TOP(t.id, t.op)}
<main id="main" class="wrap">
<h1>${t.name}</h1><p class="mut">${t.short}${privacy}</p>
<div id="status" class="status" role="status" aria-live="polite" hidden></div>
<section class="card" id="tool">${t.body}
<div class="row" style="margin:12px 0"><button id="go" class="primary" type="button">${t.go}</button>${t.extraBtn || ''}<button id="copy" type="button">Copy</button><button id="dl" type="button">Download</button><button id="reset" class="danger" type="button">${isNet ? 'Clear' : 'Reset'}</button></div>
${t.out || ''}${t.after || ''}</section>
${AD}
${faqHtml(t.faq)}
<section><h2>Related tools</h2><p>${related}</p></section>
</main>
${SHELL_BOT}
<script type="module" src="../../assets/js/common.js"></script>
<script src="../../assets/js/tool-ui.js"></script>
<script src="../../assets/js/${isNet ? 'net-core.js' : 'srt-core.js'}"></script>
<script src="../../assets/js/${isNet ? 'net-ui.js' : 'srt-ui.js'}"></script>
</body></html>
`;
}
function wordPage() {
  const t = { id: 'word-counter', name: 'Word & Character Counter', desc: 'Words, characters with and without spaces, sentences, paragraphs and lines.', meta: 'Free online word counter and character counter with and without spaces, plus sentences, paragraphs and lines. Runs in your browser.' };
  const faq = [['Are spaces counted?', 'Both totals are shown: characters with spaces and without.'], ['How are sentences counted?', 'Text is split at . ! or ? followed by a space or the end. Abbreviations such as "e.g." can add extra sentences.'], ['Is my text uploaded?', 'No. Counting happens in your browser.']];
  const rel = ['case-converter', 'remove-duplicate-lines', 'sort-lines', 'remove-extra-spaces', 'find-and-replace', 'text-compare'];
  return `${HEAD(t.name, t.meta, `${BASE}/tools/word-counter/`)}
${SHELL_TOP(t.id, 'count')}
<main id="main" class="wrap">
<h1>${t.name}</h1><p class="mut">${t.desc} Your text never leaves this page.</p>
<div id="status" class="status" role="status" aria-live="polite" hidden></div>
<section class="card"><label for="in">Your text</label><textarea id="in" rows="9" spellcheck="false" placeholder="Type or paste your text here…"></textarea>
<div class="row" style="margin:12px 0"><button id="apply" class="primary" type="button">Count Words</button><button id="copy" type="button">Copy Results</button><button id="dl" type="button">Download Results</button><button id="reset" class="danger" type="button">Clear</button></div>
<div id="stats" class="stats" aria-live="polite"></div></section>
${AD}
${faqHtml(faq)}
<section><h2>Related tools</h2><p>${rel.map((r) => `<a href="../${r}/">${r.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase())}</a>`).join(' · ')} · <a href="../youtube-playlist-calculator/">YouTube Playlist Calculator</a></p></section>
</main>
${SHELL_BOT}
<script type="module" src="../../assets/js/common.js"></script>
<script src="../../assets/js/tool-ui.js"></script>
<script src="../../assets/js/wordcount.js"></script>
</body></html>
`;
}
if (process.argv[1].endsWith('gen-stage6-pages.mjs')) {
  fs.writeFileSync('tools/word-counter/index.html', wordPage());
  for (const t of TOOLS6) { fs.mkdirSync(`tools/${t.id}`, { recursive: true }); fs.writeFileSync(`tools/${t.id}/index.html`, toolPage(t)); }
  // registry patch (idempotent)
  let c = fs.readFileSync('assets/js/common.js', 'utf8');
  if (!c.includes("id: 'network'")) c = c.replace("  { id: 'pdf', name: 'PDF tools' },\n", "  { id: 'pdf', name: 'PDF tools' },\n  { id: 'network', name: 'Internet & Network' },\n  { id: 'subtitle', name: 'Subtitle tools' },\n");
  if (!c.includes('/*stage6*/')) {
    const rows = TOOLS6.map((t) => `  { id: '${t.id}', cat: '${t.cat}', name: '${t.name.replace(/'/g, "\\'")}', desc: '${t.short}', url: '/tools/${t.id}/', color: '${t.color}' },`).join('\n');
    c = c.replace(/\];\n\/\/ Site root/, `  /*stage6*/\n${rows}\n];\n// Site root`);
  }
  fs.writeFileSync('assets/js/common.js', c);
  let sm = fs.readFileSync('sitemap.xml', 'utf8');
  for (const t of TOOLS6) { const loc = `<loc>${BASE}/tools/${t.id}/</loc>`; if (!sm.includes(loc)) sm = sm.replace('</urlset>', `<url>${loc}</url>\n</urlset>`); }
  fs.writeFileSync('sitemap.xml', sm);
  console.log('generated', TOOLS6.length + 1, 'pages');
}
