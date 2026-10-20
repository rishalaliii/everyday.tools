// Generates tools/<id>/index.html for the text tools and the sitemap.  Run: node scripts/gen-text-pages.mjs
import fs from 'node:fs';
const BASE = 'https://everydaytools.pages.dev';
const cb = (id, label, on) => `<label><input type="checkbox" id="${id}"${on ? ' checked' : ''}> ${label}</label>`;
export const TEXT = [
  { id: 'word-counter', op: 'count', name: 'Word & Character Counter', desc: 'Words, characters with and without spaces, sentences, paragraphs, lines.', meta: 'Free online word counter and character counter with and without spaces, plus sentences, paragraphs and lines. Runs in your browser.', faq: [['Are spaces counted?', 'Both totals are shown: characters with spaces and without.'], ['How are sentences counted?', 'Text is split at . ! or ? followed by a space or the end. Abbreviations such as "e.g." can add extra sentences.']] },
  { id: 'case-converter', op: 'case', name: 'Case Converter', desc: 'UPPERCASE, lowercase or Title Case in one click.', meta: 'Convert text to uppercase, lowercase or title case online. Free, private, runs in your browser.', opts: '<label>Case <select id="mode"><option value="upper">UPPERCASE</option><option value="lower">lowercase</option><option value="title">Title Case</option></select></label>', faq: [['Does Title Case know small words like "of"?', 'No. It capitalises the first letter of every word, so edit small words by hand if your style guide needs it.'], ['Does it support non-English letters?', 'Yes, it uses Unicode-aware letter handling.']] },
  { id: 'remove-duplicate-lines', op: 'dedupe', name: 'Remove Duplicate Lines', desc: 'Keep the first copy of each line, drop the repeats.', meta: 'Remove duplicate lines from a list online. Choose case sensitivity and trimming. Free and private.', opts: cb('cs', 'Case sensitive') + cb('tr', 'Ignore leading/trailing spaces', true), faq: [['Which copy is kept?', 'The first occurrence; order is preserved.'], ['Are blank lines duplicates?', 'Yes, repeated blank lines are collapsed to one.']] },
  { id: 'sort-lines', op: 'sort', name: 'Sort Lines Alphabetically', desc: 'Sort a list A–Z or Z–A, with natural number order.', meta: 'Sort lines of text alphabetically (A–Z or Z–A) online, with optional natural number ordering. Free and private.', opts: '<label>Order <select id="ord"><option value="asc">A → Z</option><option value="desc">Z → A</option></select></label>' + cb('ic', 'Ignore case', true) + cb('nat', 'Natural numbers (2 before 10)', true), faq: [['How are accents sorted?', 'Using your browser\'s locale-aware comparison.'], ['What is natural number order?', 'Numbers inside text compare by value, so "item2" sorts before "item10".']] },
  { id: 'remove-extra-spaces', op: 'clean', name: 'Remove Extra Spaces & Blank Lines', desc: 'Collapse repeated spaces and blank lines, trim every line.', meta: 'Remove extra spaces, tabs and blank lines from text online. Free and private.', opts: cb('rb', 'Remove all blank lines (otherwise multiple blank lines become one)'), faq: [['Is indentation removed?', 'Yes, leading and trailing spaces on each line are trimmed.']] },
  { id: 'find-and-replace', op: 'replace', name: 'Find and Replace Text', desc: 'Replace text, optionally with regular expressions.', meta: 'Find and replace text online with optional regular expressions and case matching. Free and private.', opts: '<label>Find <input id="find" size="18"></label><label>Replace with <input id="rep" size="18"></label>' + cb('rx', 'Regular expression') + cb('cs', 'Case sensitive'), faq: [['Can I use capture groups?', 'In regular-expression mode, use $1, $2 in the replacement.'], ['What if my pattern is invalid?', 'You will see an error message and your text is left unchanged.']] },
  { id: 'text-compare', op: 'compare', name: 'Text Compare (Diff)', desc: 'Compare two texts line by line and see what changed.', meta: 'Compare two texts line by line online and see added and removed lines. Free and private.', two: true, faq: [['How does it compare?', 'Line by line, using a longest-common-subsequence diff. Changes inside a line show as one removed plus one added line.'], ['Is there a size limit?', 'About 2,000 lines per side, to keep your browser responsive.']] },
];
const page = (t) => {
  const url = `${BASE}/tools/${t.id}/`;
  const related = TEXT.filter((x) => x.id !== t.id).map((x) => `<a href="../${x.id}/">${x.name}</a>`).join(' · ');
  const inputs = t.two ? '<label for="in">Original text</label><textarea id="in" rows="8" spellcheck="false"></textarea><label for="in2">Changed text</label><textarea id="in2" rows="8" spellcheck="false"></textarea>' : '<label for="in">Your text</label><textarea id="in" rows="9" spellcheck="false"></textarea>';
  const output = t.op === 'count' ? '<div id="stats" class="stats" style="margin-top:12px" aria-live="polite"></div>' : t.op === 'compare' ? '<div id="diff" class="diff tw" aria-live="polite"></div>' : '<label for="out">Result</label><textarea id="out" rows="9" readonly></textarea>';
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{document.documentElement.dataset.theme=localStorage.getItem('et:theme')||'light'}catch(e){}</script>
<title>${t.name} – Free Online | EverydayTools</title>
<meta name="description" content="${t.meta}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${t.name}"><meta property="og:description" content="${t.meta}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23F8BB18'/%3E%3Crect x='3' y='3' width='12' height='12' fill='%23111'/%3E%3Crect x='17' y='17' width='12' height='12' fill='%23111'/%3E%3C/svg%3E">
<link rel="stylesheet" href="../../assets/css/style.css">
</head>
<body data-tool="${t.id}" data-op="${t.op}">
<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap"><a class="logo" href="../../">Everyday<span>Tools</span></a><div class="hnav"><button id="theme-toggle" type="button">Theme</button><a class="explore" href="../../#tools">Explore tools</a></div></div></header>
<main id="main" class="wrap">
<h1>${t.name}</h1><p class="mut">${t.desc} Your text never leaves this page.</p>
<div id="status" class="status" role="status" aria-live="polite" hidden></div>
<section class="card">${inputs}${t.opts ? `<div class="row" style="margin-top:10px">${t.opts}</div>` : ''}
<div class="row" style="margin:12px 0"><button id="apply" class="primary" type="button">${{ count: 'Count words', compare: 'Compare' }[t.op] || 'Apply'}</button><button id="copy" type="button">Copy ${t.op === 'count' ? 'counts' : 'result'}</button><button id="dl" type="button">Download .txt</button><button id="reset" class="danger" type="button">${t.op === 'count' ? 'Clear' : 'Reset'}</button></div>
${output}</section>
<aside class="ad-slot" aria-label="Advertisement placeholder">Ad placeholder – replace with AdSense unit after approval (see README)</aside>
<section aria-labelledby="faq"><h2 id="faq">FAQ</h2>${t.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
<section><h2>Related tools</h2><p>${related} · <a href="../youtube-playlist-calculator/">YouTube Playlist Calculator</a></p></section>
</main>
<footer class="site"><div class="wrap">© EverydayTools. Processing happens in your browser. <a href="../../">All tools</a> · <a href="../../about/">About</a> · <a href="../../contact/">Contact</a> · <a href="../../privacy-policy/">Privacy</a> · <a href="../../terms/">Terms</a> · <a href="../../disclaimer/">Disclaimer</a></div></footer>
<script type="module" src="../../assets/js/common.js"></script>
<script type="module" src="../../assets/js/text-ui.js"></script>
</body></html>
`;
};
if (process.argv[1].endsWith('gen-text-pages.mjs')) {
  for (const t of TEXT.filter((x) => x.op !== 'count')) { fs.mkdirSync(`tools/${t.id}`, { recursive: true }); fs.writeFileSync(`tools/${t.id}/index.html`, page(t)); }
  console.log('generated', TEXT.length, 'pages');
}
