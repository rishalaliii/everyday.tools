// Generates calculator/converter pages, legal pages, footers and sitemap.  Run: node scripts/gen-calc-pages.mjs  (after gen-text-pages.mjs)
import fs from 'node:fs';
import { TEXT } from './gen-text-pages.mjs';
const BASE = 'https://everydaytools.pages.dev';
const inp = (l, f, o = {}) => `<label>${l} <input data-f="${f}" ${o.type === 'date' ? 'type="date"' : 'type="number" inputmode="decimal" step="any"'}${o.v != null ? ` value="${o.v}" data-def="${o.v}"` : ''}${o.today ? ' data-today' : ''}></label>`;
const sel = (l, f, opts, v) => `<label>${l} <select data-f="${f}">${opts.map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
const U = (kind, a) => a.map((k) => [k, k]);
const conv = (kind, units, from, to, extra = '') => ({ f: inp('Value', 'value', { v: 1 }) + sel('From', 'from', units, from) + '<button id="swap" type="button">⇄ Swap</button>' + sel('To', 'to', units, to) + extra });
const LEN = [['m', 'Metres (m)'], ['km', 'Kilometres (km)'], ['cm', 'Centimetres (cm)'], ['mm', 'Millimetres (mm)'], ['mi', 'Miles (mi)'], ['yd', 'Yards (yd)'], ['ft', 'Feet (ft)'], ['in', 'Inches (in)'], ['nmi', 'Nautical miles']];
const WT = [['kg', 'Kilograms (kg)'], ['g', 'Grams (g)'], ['mg', 'Milligrams (mg)'], ['t', 'Metric tonnes (t)'], ['lb', 'Pounds (lb)'], ['oz', 'Ounces (oz)'], ['st', 'Stone (st)']];
const TMP = [['C', 'Celsius (°C)'], ['F', 'Fahrenheit (°F)'], ['K', 'Kelvin (K)']];
const DATA = [['bit', 'Bits'], ['B', 'Bytes (B)'], ['KB', 'Kilobytes (KB)'], ['MB', 'Megabytes (MB)'], ['GB', 'Gigabytes (GB)'], ['TB', 'Terabytes (TB)'], ['PB', 'Petabytes (PB)']];
export const CALC = [
  { id: 'percentage-calculator', op: 'percent', cat: 'calc', name: 'Percentage Calculator', desc: 'Percent of a number, what percent, and percent change.', meta: 'Free percentage calculator: find X% of a number, what percent one number is of another, and percentage increase or decrease.', color: '#2a6fdb', size: 'w',
    f: sel('Calculate', 'mode', [['of', 'X% of Y'], ['is', 'X is what % of Y'], ['chg', '% change from X to Y']], 'of') + inp('X', 'a', { v: 15 }) + inp('Y', 'b', { v: 200 }),
    faq: [['How is percent change calculated?', '(new − old) ÷ |old| × 100. The starting value cannot be zero.']] },
  { id: 'discount-calculator', op: 'discount', cat: 'calc', name: 'Discount Calculator', desc: 'Sale price, savings and optional tax after a discount.', meta: 'Free discount calculator: see the sale price, how much you save and the final price with optional tax.', color: '#ff7a00',
    f: inp('Original price', 'price', { v: 1999 }) + inp('Discount %', 'disc', { v: 25 }) + inp('Tax % (optional)', 'tax'),
    faq: [['Is tax applied before or after the discount?', 'After. Tax is calculated on the discounted price.']] },
  { id: 'age-calculator', op: 'age', cat: 'calc', name: 'Age Calculator', desc: 'Exact age in years, months and days, plus next birthday.', meta: 'Free age calculator: exact age in years, months and days, total days lived and days to next birthday.', color: '#d6336c',
    f: inp('Date of birth', 'dob', { type: 'date' }) + inp('Age on', 'asof', { type: 'date', today: 1 }),
    faq: [['Which time zone is used?', 'Dates are treated as calendar dates, so time zones do not change the result.'], ['How are 29 February birthdays handled?', 'In non-leap years the birthday is counted as 28 February.']] },
  { id: 'date-difference-calculator', op: 'datediff', cat: 'calc', name: 'Date Difference Calculator', desc: 'Days, weeks, months and years between two dates.', meta: 'Free date difference calculator: days, weeks, months and years between two dates.', color: '#7b3fe4',
    f: inp('Start date', 'd1', { type: 'date', today: 1 }) + inp('End date', 'd2', { type: 'date', today: 1 }),
    faq: [['Is the end date included?', 'No. The count is the number of days from the start date to the end date; add 1 for an inclusive count.']] },
  { id: 'gst-calculator', op: 'gst', cat: 'calc', name: 'GST Calculator', desc: 'Add or remove GST and see the CGST/SGST split.', meta: 'Free GST calculator for India: add or remove GST at 5%, 12%, 18%, 28% or a custom rate, with CGST and SGST split.', color: '#1b9e77', size: 'w',
    f: sel('Mode', 'mode', [['add', 'Add GST to amount'], ['remove', 'Remove GST from amount']], 'add') + inp('Amount', 'amount', { v: 1000 }) + inp('GST rate %', 'rate', { v: 18 }) + '<span class="mut">Common rates: 5, 12, 18, 28</span>',
    faq: [['What about IGST?', 'For inter-state supply the whole GST amount is IGST; the total is the same as CGST + SGST.'], ['Are rates up to date?', 'Enter the rate that applies to your goods or service; check the official GST portal for current rates.']] },
  { id: 'bmi-calculator', op: 'bmi', cat: 'calc', name: 'BMI Calculator', desc: 'Body mass index with WHO adult category.', meta: 'Free BMI calculator in metric or imperial units with WHO adult categories and healthy weight range.', color: '#00a6a6',
    f: sel('Units', 'unit', [['metric', 'Metric (cm, kg)'], ['imperial', 'Imperial (inches, lb)']], 'metric') + inp('Height', 'height', { v: 170 }) + inp('Weight', 'weight', { v: 65 }),
    faq: [['Is BMI a diagnosis?', 'No. It is a rough screening number for adults and ignores muscle, age and body shape. Ask a health professional about your health.']] },
  { id: 'loan-emi-calculator', op: 'emi', cat: 'calc', name: 'Loan EMI Calculator', desc: 'Monthly EMI, total interest and total payment.', meta: 'Free loan EMI calculator: monthly instalment, total interest and total payment for any loan amount, rate and tenure.', color: '#111', size: 'w',
    f: inp('Loan amount', 'principal', { v: 500000 }) + inp('Interest rate % per year', 'rate', { v: 9 }) + inp('Tenure', 'tenure', { v: 5 }) + sel('Tenure in', 'tunit', [['years', 'Years'], ['months', 'Months']], 'years'),
    faq: [['What formula is used?', 'Standard reducing-balance EMI = P·r·(1+r)^n ÷ ((1+r)^n − 1), with monthly rate r.'], ['Will my bank match exactly?', 'Not always. Fees, rounding and payment dates can differ, so treat this as an estimate.']] },
  { id: 'length-converter', op: 'length', cat: 'convert', name: 'Length Converter', desc: 'Metres, kilometres, miles, feet, inches and more.', meta: 'Free length converter: metres, kilometres, miles, yards, feet, inches and nautical miles.', color: '#e5322d',
    ...conv('length', LEN, 'km', 'mi'), faq: [['Which mile is used?', 'The international mile, exactly 1,609.344 m.']] },
  { id: 'weight-converter', op: 'weight', cat: 'convert', name: 'Weight Converter', desc: 'Kilograms, grams, pounds, ounces, stone and tonnes.', meta: 'Free weight converter: kilograms, grams, pounds, ounces, stone and tonnes.', color: '#2a6fdb',
    ...conv('weight', WT, 'kg', 'lb'), faq: [['Is this mass or weight?', 'Mass, as commonly used in daily life. A pound is exactly 0.45359237 kg.']] },
  { id: 'temperature-converter', op: 'temperature', cat: 'convert', name: 'Temperature Converter', desc: 'Celsius, Fahrenheit and Kelvin.', meta: 'Free temperature converter between Celsius, Fahrenheit and Kelvin.', color: '#ff7a00',
    ...conv('temperature', TMP, 'C', 'F'), faq: [['Is there a lower limit?', 'Yes, absolute zero: −273.15 °C, −459.67 °F, 0 K.']] },
  { id: 'data-storage-converter', op: 'data', cat: 'convert', name: 'Data Storage Converter', desc: 'Bits, bytes, KB, MB, GB, TB and PB.', meta: 'Free data storage converter: bits, bytes, KB, MB, GB, TB, PB using 1024 or 1000 steps.', color: '#7b3fe4',
    ...conv('data', DATA, 'GB', 'MB', sel('1 KB =', 'base', [['1024', '1024 B (binary)'], ['1000', '1000 B (decimal)']], '1024')), faq: [['1000 or 1024?', 'Operating systems often use 1024; drive makers use 1000. Pick the convention you need.']] },
];
export const FOOT = (p) => `<footer class="site"><div class="wrap">© EverydayTools. Processing happens in your browser. <a href="${p}">All tools</a> · <a href="${p}about/">About</a> · <a href="${p}contact/">Contact</a> · <a href="${p}privacy-policy/">Privacy</a> · <a href="${p}terms/">Terms</a> · <a href="${p}disclaimer/">Disclaimer</a></div></footer>`;
export const head = (p, title, desc, url) => `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<script>try{document.documentElement.dataset.theme=localStorage.getItem('et:theme')||'light'}catch(e){}</script>
<title>${title} | EverydayTools</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' fill='%23F8BB18'/%3E%3Crect x='3' y='3' width='12' height='12' fill='%23111'/%3E%3Crect x='17' y='17' width='12' height='12' fill='%23111'/%3E%3C/svg%3E">
<link rel="stylesheet" href="${p}assets/css/style.css">
</head>`;
export const top = (p) => `<a class="skip" href="#main">Skip to content</a>
<header class="site"><div class="wrap"><a class="logo" href="${p}">Everyday<span>Tools</span></a><div class="hnav"><button id="theme-toggle" type="button">Theme</button><a class="explore" href="${p}#tools">Explore tools</a></div></div></header>`;
const calcPage = (t) => {
  const url = `${BASE}/tools/${t.id}/`, p = '../../';
  const related = CALC.filter((x) => x.id !== t.id && x.cat === t.cat).map((x) => `<a href="../${x.id}/">${x.name}</a>`).join(' · ');
  return `${head(p, t.name + ' – Free Online', t.meta, url)}
<body data-tool="${t.id}" data-op="${t.op}">
${top(p)}
<main id="main" class="wrap">
<h1>${t.name}</h1><p class="mut">${t.desc} Everything is calculated in your browser.</p>
<div id="status" class="status" role="status" aria-live="polite" hidden></div>
<section class="card"><form id="calc" class="row" style="align-items:end">${t.f}</form>
<div class="row" style="margin:12px 0"><button id="copy" type="button">Copy result</button><button id="reset" class="danger" type="button">Reset</button></div>
<div id="result" class="stats" aria-live="polite"></div></section>
<aside class="ad-slot" aria-label="Advertisement placeholder">Ad placeholder – replace with AdSense unit after approval (see README)</aside>
<section aria-labelledby="faq"><h2 id="faq">FAQ</h2>${t.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
<section><h2>Related tools</h2><p>${related} · <a href="${p}#tools">All tools</a></p></section>
</main>
${FOOT(p)}
<script type="module" src="${p}assets/js/common.js"></script>
<script type="module" src="${p}assets/js/calc-ui.js"></script>
</body></html>
`;
};
export const PAGES = [
  { id: 'about', title: 'About', desc: 'About EverydayTools, a free collection of browser-based utilities.', body: '<p>EverydayTools is a small, free collection of everyday utilities: a YouTube playlist calculator, text tools, calculators and unit converters.</p><p>Most tools run entirely in your browser, so what you type stays on your device. The only exception is the optional YouTube playlist import, which contacts the YouTube Data API using a key you provide.</p><p>The site is an independent project. It is not affiliated with YouTube or Google.</p><p>Found a bug or have a tool idea? See the <a href="../contact/">Contact</a> page.</p>' },
  { id: 'contact', title: 'Contact', desc: 'How to contact EverydayTools.', body: '<p>For bug reports, corrections or suggestions, email <a href="mailto:contact2everydaytools@gmail.com">contact2everydaytools@gmail.com</a>.</p><p>When reporting a bug, please include the tool name, what you entered, what you expected and your browser. Do not send passwords or sensitive personal data.</p><p>This is a small project, so replies may take some time and we cannot promise to answer every message.</p>' },
  { id: 'privacy-policy', title: 'Privacy Policy', desc: 'How EverydayTools handles your data.', body: '<p><b>Your inputs.</b> Text, numbers and files you use in the tools are processed in your browser and are not sent to our servers. We do not have user accounts or a database.</p><p><b>Stored in your browser.</b> The site saves your theme choice, recently used tools and, for the YouTube calculator, your progress, using your browser\'s local storage. You can clear this in your browser settings.</p><p><b>YouTube import.</b> If you use the optional playlist import, your browser sends the playlist ID and your own API key directly to Google\'s YouTube Data API. Google\'s privacy policy applies to that request. We never receive your key.</p><p><b>Hosting and advertising.</b> The site is hosted on a static hosting service that may keep standard server logs (such as IP address and pages requested). If advertising such as Google AdSense is added in future, ad providers may use cookies; this policy will be updated before that happens and, where required, consent will be requested.</p><p><b>Children.</b> The site is not directed at children under 13.</p><p><b>Changes.</b> We may update this policy; the current version is always on this page.</p><p>Questions: see <a href="../contact/">Contact</a>.</p>' },
  { id: 'terms', title: 'Terms of Use', desc: 'Terms of use for EverydayTools.', body: '<p>By using EverydayTools you agree to these basic terms.</p><ul><li>The tools are provided free, "as is" and "as available", without warranties of any kind.</li><li>You are responsible for how you use the results and for checking them before relying on them.</li><li>Do not misuse the site, attempt to disrupt it, or use it for unlawful purposes.</li><li>The site\'s design and code are owned by its operator unless stated otherwise. Third-party names such as YouTube and Google belong to their owners.</li><li>To the extent permitted by law, we are not liable for any loss arising from use of the site.</li><li>We may change, suspend or remove tools and these terms at any time.</li></ul><p>See also the <a href="../disclaimer/">Disclaimer</a> and <a href="../privacy-policy/">Privacy Policy</a>.</p>' },
  { id: 'disclaimer', title: 'Disclaimer', desc: 'Disclaimer for EverydayTools results.', body: '<p>Results from EverydayTools are for general information and convenience only.</p><p><b>Not professional advice.</b> The loan EMI, GST, discount and percentage calculators give estimates and do not replace advice from a financial, tax or accounting professional; actual lender or tax calculations may differ. The BMI calculator is a screening figure, not a medical diagnosis.</p><p><b>Accuracy.</b> We try to keep the tools correct but cannot guarantee they are error-free. Please double-check important numbers.</p><p><b>Third parties.</b> This site is independent and not affiliated with, endorsed by or sponsored by YouTube or Google.</p>' },
];
const infoPage = (g) => `${head('../', g.title, g.desc, `${BASE}/${g.id}/`)}
<body>
${top('../')}
<main id="main" class="wrap"><h1>${g.title}</h1>${g.body}</main>
${FOOT('../')}
<script type="module" src="../assets/js/common.js"></script>
</body></html>
`;
if (process.argv[1].endsWith('gen-calc-pages.mjs')) {
  for (const t of CALC) { fs.mkdirSync(`tools/${t.id}`, { recursive: true }); fs.writeFileSync(`tools/${t.id}/index.html`, calcPage(t)); }
  for (const g of PAGES) { fs.mkdirSync(g.id, { recursive: true }); fs.writeFileSync(`${g.id}/index.html`, infoPage(g)); }
  console.log('generated', CALC.length, 'tools,', PAGES.length, 'pages');
}
