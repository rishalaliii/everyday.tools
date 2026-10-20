// Generates QR + image tool pages and the full sitemap.  Run last: node scripts/gen-text-pages.mjs && node scripts/gen-calc-pages.mjs && node scripts/gen-media-pages.mjs
import fs from 'node:fs';
import { TEXT } from './gen-text-pages.mjs';
import { CALC, PAGES, FOOT, head, top } from './gen-calc-pages.mjs';
import { PDFT, writePdfPages } from './gen-pdf-pages.mjs';
const BASE = 'https://everydaytools.pages.dev';
const sel = (l, f, opts, v) => `<label>${l} <select data-f="${f}">${opts.map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
const num = (l, f, v = '', w = 90) => `<label>${l} <input data-f="${f}" type="number" inputmode="numeric" min="0" step="1" style="width:${w}px"${v !== '' ? ` value="${v}"` : ''}></label>`;
const txt = (l, f, o = '') => `<label>${l} <input data-f="${f}" type="text" ${o}></label>`;
const chk = (l, f, on) => `<label><input data-f="${f}" type="checkbox"${on ? ' checked' : ''}> ${l}</label>`;
const range = `<label>Quality <input data-f="q" type="range" min="1" max="100" value="75"> <b id="qv">75</b>%</label>`;
const FMT_SAME = sel('Output format', 'fmt', [['same', 'Same as original'], ['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']], 'same');
const FMT = sel('Convert to', 'fmt', [['image/jpeg', 'JPG'], ['image/png', 'PNG'], ['image/webp', 'WebP']], 'image/webp');
export const MEDIA = [
  { id: 'qr-code-generator', cat: 'qr', name: 'QR Code Generator', desc: 'QR codes for links, text, email, phone, Wi-Fi and contacts. Download as PNG.', color: '#111', size: 'w t', meta: 'Free QR code generator for URLs, text, email, phone numbers, Wi-Fi and contact cards. Preview and download PNG. Runs in your browser.',
    faq: [['Is my data sent anywhere?', 'No. The code is generated in your browser; nothing is uploaded.'], ['Do these QR codes expire?', 'No. They are static: the content is stored in the code itself, so they work as long as the link or data stays valid.'], ['Which error-correction level should I pick?', 'M suits most uses. Choose H if the code may get dirty or have a logo placed over it; higher levels make denser codes.'], ['Will the Wi-Fi code work on every phone?', 'Recent iPhone and Android cameras read it. Always test-scan before printing.']] },
  { id: 'image-compressor', cat: 'image', name: 'Image Compressor', desc: 'Make JPG, WebP and PNG files smaller. See before and after sizes.', color: '#e5322d', size: 'w', op: 'compress', meta: 'Free image compressor: reduce JPG, PNG and WebP file size in your browser with a quality slider and before/after sizes. Nothing is uploaded.',
    opts: FMT_SAME + range + num('Max width (px, optional)', 'maxw', '', 110), faq: [['Are my images uploaded?', 'No. Compression happens in your browser, so the file never leaves your device.'], ['Why is my PNG not smaller?', 'PNG is lossless and ignores the quality slider. Choose JPG or WebP, or set a maximum width.'], ['Is transparency kept?', 'In PNG and WebP, yes. JPG has no transparency, so transparent areas become white.']] },
  { id: 'image-resizer', cat: 'image', name: 'Image Resizer', desc: 'Resize an image to an exact width and height in pixels.', color: '#2a6fdb', op: 'resize', meta: 'Free image resizer: change image width and height in pixels, keep the aspect ratio, and download JPG, PNG or WebP. Runs in your browser.',
    opts: num('Width (px)', 'w') + num('Height (px)', 'h') + chk('Keep aspect ratio', 'lock', true) + FMT_SAME + range, faq: [['What is the maximum size?', 'Up to 16,384 px per side and about 100 megapixels, depending on your browser and device memory.'], ['Does enlarging reduce quality?', 'Yes. Enlarging cannot add detail, so large enlargements look soft.']] },
  { id: 'image-cropper', cat: 'image', name: 'Image Cropper', desc: 'Crop by dragging on the picture or by typing exact pixel values.', color: '#ff7a00', op: 'crop', meta: 'Free image cropper: drag to crop or enter pixel values, with 1:1, 4:3, 16:9 and 3:2 ratios. Download JPG, PNG or WebP. Runs in your browser.',
    opts: sel('Ratio', 'ratio', [['free', 'Free'], ['1:1', '1:1'], ['4:3', '4:3'], ['3:2', '3:2'], ['16:9', '16:9']], 'free') + num('X', 'x', 0, 80) + num('Y', 'y', 0, 80) + num('Width', 'cw', '', 80) + num('Height', 'ch', '', 80) + FMT_SAME + range,
    extra: '<p class="mut" style="margin:10px 0 4px">Drag on the image to draw a crop area; drag inside the area to move it.</p><div class="pv"><canvas id="cropcv" class="crop" hidden></canvas></div>',
    faq: [['How do I move the crop area?', 'Drag inside the highlighted area. Dragging outside it starts a new one.'], ['Are the numbers in pixels?', 'Yes, in pixels of the original image.']] },
  { id: 'image-converter', cat: 'image', name: 'Image Converter (JPG, PNG, WebP)', desc: 'Convert between JPG, PNG and WebP.', color: '#7b3fe4', op: 'convert', meta: 'Free image converter between JPG, PNG and WebP in your browser. Pick the quality and background colour for transparent images.',
    opts: FMT + range + `<label>Background for JPG <input data-f="bg" type="color" value="#ffffff"></label>`, faq: [['Which formats are supported?', 'You can open JPG, PNG, WebP, GIF (first frame) and BMP, plus AVIF where your browser reads it. Output depends on your browser; if it cannot write a format you will see a message.'], ['What about HEIC or SVG?', 'Not supported. Convert HEIC to JPG on your device first.']] },
  { id: 'favicon-generator', cat: 'image', name: 'Favicon Generator', desc: 'Make favicon.ico and PNG icons (16 to 512 px) from one image.', color: '#1b9e77', op: 'favicon', meta: 'Free favicon generator: create favicon.ico and PNG icons from a picture, with a ready HTML snippet. Runs in your browser.',
    opts: sel('Fit', 'mode', [['cover', 'Fill square (crop edges)'], ['contain', 'Fit inside (transparent padding)']], 'cover'),
    after: `<h2 style="margin-top:16px">Icons</h2><div id="fav" class="fav"></div><h2 style="margin-top:16px">HTML snippet</h2><code id="snip" class="snip">&lt;link rel="icon" href="/favicon.ico" sizes="48x48"&gt;
&lt;link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"&gt;
&lt;link rel="apple-touch-icon" href="/favicon-180x180.png"&gt;</code><div class="row" style="margin-top:8px"><button id="copysnip" type="button">Copy snippet</button></div>`,
    faq: [['Which files do I need?', 'Upload favicon.ico to your site root, add the PNG sizes you want, and paste the snippet into your page head. Adjust the file paths to match where you upload them.'], ['What image works best?', 'A square image of at least 512×512 px with a simple shape.']] },
];
const QRFORM = `<form id="qr" class="row" style="align-items:end">
${sel('Content type', 'type', [['url', 'Website link'], ['text', 'Plain text'], ['email', 'Email'], ['phone', 'Phone number'], ['wifi', 'Wi-Fi'], ['contact', 'Contact card']], 'url')}
<div data-t="url" class="row">${txt('Web address', 'url', 'size="34" placeholder="example.com" inputmode="url"')}</div>
<div data-t="text" class="row" hidden style="width:100%"><label style="width:100%">Text <textarea data-f="text" rows="3"></textarea></label></div>
<div data-t="email" class="row" hidden>${txt('Email address', 'email', 'type="email" size="24"').replace('type="text" type="email"', 'type="email"')}${txt('Subject (optional)', 'subject', 'size="20"')}${txt('Message (optional)', 'body', 'size="24"')}</div>
<div data-t="phone" class="row" hidden>${txt('Phone number', 'phone', 'size="20" placeholder="+91 98765 43210" inputmode="tel"')}</div>
<div data-t="wifi" class="row" hidden>${txt('Network name (SSID)', 'ssid', 'size="20"')}${txt('Password', 'password', 'size="20" autocomplete="off"')}${sel('Security', 'security', [['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', 'None (open)']], 'WPA')}${chk('Hidden network', 'hidden')}</div>
<div data-t="contact" class="row" hidden>${txt('First name', 'first', 'size="14"')}${txt('Last name', 'last', 'size="14"')}${txt('Phone', 'phone', 'size="16"')}${txt('Email', 'email', 'size="20"')}${txt('Organisation', 'org', 'size="16"')}${txt('Job title', 'title', 'size="14"')}${txt('Website', 'url', 'size="20"')}${txt('Address', 'addr', 'size="28"')}</div>
<div class="row" style="width:100%">${sel('Error correction', 'level', [['L', 'L (7%)'], ['M', 'M (15%)'], ['Q', 'Q (25%)'], ['H', 'H (30%)']], 'M')}${sel('Size', 'size', [['256', '256 px'], ['512', '512 px'], ['1024', '1024 px'], ['2048', '2048 px']], '512')}<label>Colour <input data-f="fg" type="color" value="#000000"></label><label>Background <input data-f="bg" type="color" value="#ffffff"></label>${chk('Quiet-zone margin', 'quiet', true)}</div></form>`;
const page = (t) => {
  const url = `${BASE}/tools/${t.id}/`, p = '../../', isQr = t.cat === 'qr';
  const sib = MEDIA.filter((x) => x.id !== t.id && (x.cat === t.cat || (isQr ? x.id === 'image-compressor' : x.id === 'qr-code-generator'))).map((x) => `<a href="../${x.id}/">${x.name}</a>`).join(' · ') + (t.cat === 'image' || isQr ? ` · <a href="../images-to-pdf/">Images to PDF</a>` : '') + (isQr ? ' · <a href="../favicon-generator/">Favicon Generator</a>' : '');
  const body = isQr ? `${QRFORM}
<div class="row" style="margin:12px 0"><button id="dl" class="primary" type="button" disabled>Download PNG</button><button id="copyimg" type="button" disabled>Copy image</button><button id="copy" type="button" disabled>Copy content as text</button><button id="reset" class="danger" type="button">Reset</button></div>
<canvas id="qr-canvas" hidden style="max-width:100%;height:auto;image-rendering:pixelated;border:2px solid var(--line)" aria-label="QR code preview"></canvas><p id="qr-info" class="mut"></p>`
    : `<div id="drop" class="drop"><label for="file">Choose an image</label> <input type="file" id="file" accept="image/*"><p class="mut" style="margin:6px 0 0">or drop it here. JPG, PNG, WebP, GIF or BMP, up to 50 MB. Nothing is uploaded.</p></div>
<div id="opts" hidden><div class="row">${t.opts}</div>${t.extra || ''}</div>
<div class="row" style="margin:12px 0"><button id="dl" class="primary" type="button" disabled>Download</button><button id="reset" class="danger" type="button">Reset</button></div>
<div id="info" class="stats"></div>
<div class="cmp"><figure id="before-box" hidden><figcaption>Original</figcaption><div id="before" class="pv"></div></figure>${t.op === 'favicon' ? '' : '<figure><figcaption>Result</figcaption><div id="after" class="pv"></div></figure>'}</div>${t.after || ''}`;
  return `${head(p, t.name + ' – Free Online', t.meta, url)}
<body data-tool="${t.id}"${t.op ? ` data-op="${t.op}"` : ''}>
${top(p)}
<main id="main" class="wrap">
<h1>${t.name}</h1><p class="mut">${t.desc} ${isQr ? 'Generated in your browser.' : 'Processed in your browser; your image is not uploaded.'}</p>
<div id="status" class="status" role="status" aria-live="polite" hidden></div>
<section class="card">${body}</section>
<aside class="ad-slot" aria-label="Advertisement placeholder">Ad placeholder – replace with AdSense unit after approval (see README)</aside>
<section aria-labelledby="faq"><h2 id="faq">FAQ</h2>${t.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
<section><h2>Related tools</h2><p>${sib} · <a href="${p}#tools">All tools</a></p></section>
</main>
${FOOT(p)}
<script type="module" src="${p}assets/js/common.js"></script>
<script type="module" src="${p}assets/js/${isQr ? 'qr-ui' : 'img-ui'}.js"></script>
</body></html>
`;
};
if (process.argv[1].endsWith('gen-media-pages.mjs')) {
  for (const t of MEDIA) { fs.mkdirSync(`tools/${t.id}`, { recursive: true }); fs.writeFileSync(`tools/${t.id}/index.html`, page(t)); }
  console.log('generated', writePdfPages(), 'PDF tools');
  const urls = ['/', '/tools/youtube-playlist-calculator/', ...[...TEXT, ...CALC, ...MEDIA, ...PDFT].map((t) => `/tools/${t.id}/`), ...PAGES.map((g) => `/${g.id}/`)];
  fs.writeFileSync('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${BASE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  console.log('generated', MEDIA.length, 'media tools; sitemap', urls.length, 'urls');
}
