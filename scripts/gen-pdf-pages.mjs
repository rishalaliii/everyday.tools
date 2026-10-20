// Generates the PDF tool pages. Called by gen-media-pages.mjs (run order unchanged); can also run alone: node scripts/gen-pdf-pages.mjs
import fs from 'node:fs';
import { FOOT, head, top } from './gen-calc-pages.mjs';
const BASE = 'https://everydaytools.pages.dev';
const sel = (l, id, opts, v) => `<label>${l} <select id="${id}" data-d="${v}">${opts.map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
const rng = (label, ph, v = '') => `<label>${label} <input id="ranges" type="text" size="26" placeholder="${ph}" value="${v}" data-d="${v}" autocomplete="off"></label>`;
const NOTE = 'Bookmarks, form fields and document-level tags may not be carried over; page content, images, text and links are.';
export const PDFT = [
  { id: 'merge-pdf', op: 'merge', multi: true, accept: '.pdf,application/pdf', name: 'Merge PDF', desc: 'Combine several PDF files into one, in the order you choose.', go: 'Merge PDFs', cat: 'pdf', color: '#e5322d', size: 'w', meta: 'Free PDF merger: combine multiple PDF files into one in your browser, with reordering. Files are not uploaded.',
    faq: [['Are my PDFs uploaded?', 'No. Merging runs entirely in your browser; the files never leave your device.'], ['Can I change the order?', 'Yes. Use the ↑ and ↓ buttons next to each file, or ✕ to remove one.'], ['Why was my file refused?', 'Password-protected or damaged PDFs cannot be merged. Remove the protection in a PDF viewer first.'], ['What is not kept?', NOTE]] },
  { id: 'split-pdf', op: 'split', name: 'Split PDF', desc: 'Split a PDF by page ranges, every N pages, or into single pages.', go: 'Split PDF', cat: 'pdf', color: '#2a6fdb', meta: 'Free PDF splitter: split a PDF by page ranges, every N pages or into single pages, in your browser. Download each part or a ZIP.',
    opts: sel('Split', 'mode', [['ranges', 'By page ranges'], ['every', 'Every N pages'], ['each', 'Into single pages']], 'ranges') + `<span id="ranges-wrap">${rng('Ranges (one file per item)', 'e.g. 1-3, 4-6, 7-')}</span><label id="every-wrap" hidden>Pages per file <input id="every" type="number" min="1" step="1" value="1" data-d="1" style="width:80px"></label>`,
    faq: [['How do ranges work?', 'Each comma-separated item becomes its own PDF: "1-3, 4, 5-" gives three files. Use a number for one page, a-b for a range, a- for "to the end".'], ['Can I download everything at once?', 'Yes. After splitting you get each file as a link plus a ZIP of all parts.'], ['What is not kept?', NOTE]] },
  { id: 'extract-pdf-pages', op: 'extract', name: 'Extract PDF Pages', desc: 'Pull selected pages out of a PDF into a new file.', go: 'Extract pages', cat: 'pdf', color: '#1b9e77', meta: 'Free tool to extract pages from a PDF by number or range in your browser. Nothing is uploaded.',
    opts: rng('Pages to extract', 'e.g. 1-3, 7, 10-'), faq: [['Can I choose the page order?', 'Yes. Pages come out in the order you type them, so "5, 1-2" gives page 5 first. Typing a page twice repeats it.'], ['What if I type a page that does not exist?', 'You will see an error naming the page and the valid range; nothing is created.'], ['What is not kept?', NOTE]] },
  { id: 'rotate-pdf-pages', op: 'rotate', name: 'Rotate PDF Pages', desc: 'Rotate all or selected pages by 90°, 180° or 270°.', go: 'Rotate pages', cat: 'pdf', color: '#7b3fe4', meta: 'Free PDF rotator: turn all or selected pages 90, 180 or 270 degrees in your browser. Nothing is uploaded.',
    opts: sel('Rotate', 'angle', [['90', '90° clockwise'], ['180', '180°'], ['270', '90° counter-clockwise']], '90') + rng('Pages', 'all, or e.g. 2-4, 9', 'all'), faq: [['Is the rotation saved in the file?', 'Yes. The page rotation setting is written into the PDF, so every viewer shows it the same way.'], ['Can I rotate only some pages?', 'Yes. Type the pages, for example "2-4, 9", or leave "all".'], ['What if a page was already rotated?', 'The new rotation is added to the existing one.']] },
  { id: 'reorder-pdf-pages', op: 'reorder', name: 'Reorder PDF Pages', desc: 'Move, delete or reverse pages, then save a new PDF.', go: 'Save reordered PDF', cat: 'pdf', color: '#ff7a00', meta: 'Free PDF page reorder tool: move, delete and reverse pages in your browser. Nothing is uploaded.',
    faq: [['How do I reorder?', 'Use ↑ and ↓ on each page, delete with ✕, or type a full order like "3, 1, 2, 4" and press Apply order.'], ['Can I delete pages here?', 'Yes. Pages you remove are left out of the new file.'], ['Is there a page preview?', 'Not yet. The list shows original page numbers, so check the original in a PDF viewer if you are unsure which page is which.']] },
  { id: 'images-to-pdf', op: 'img2pdf', multi: true, accept: 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp', name: 'Images to PDF', desc: 'Turn JPG, PNG, WebP, GIF or BMP images into a single PDF.', go: 'Create PDF', cat: 'pdf', color: '#d6336c', size: 'w', meta: 'Free images to PDF converter: combine JPG, PNG and WebP pictures into one PDF with A4, Letter or fit-to-image pages. Runs in your browser.',
    opts: sel('Page size', 'size', [['a4', 'A4'], ['letter', 'US Letter'], ['fit', 'Same as image']], 'a4') + sel('Orientation', 'orient', [['auto', 'Automatic'], ['portrait', 'Portrait'], ['landscape', 'Landscape']], 'auto') + sel('Margin', 'margin', [['0', 'None'], ['20', 'Small'], ['40', 'Medium']], '20'),
    faq: [['Which images work?', 'JPG and PNG are embedded directly. WebP, GIF (first frame) and BMP are converted in your browser first. HEIC and SVG are not supported.'], ['Will my photos be rotated correctly?', 'Yes. Photos with a camera rotation flag are straightened before they go into the PDF.'], ['Is image quality reduced?', 'JPG and PNG files are embedded without recompression, so quality is kept (rotated JPEGs are re-saved at high quality).']] },
];
const page = (t) => {
  const url = `${BASE}/tools/${t.id}/`, p = '../../';
  const related = [...PDFT.filter((x) => x.id !== t.id).map((x) => [x.id, x.name]), ['file-to-pdf', 'File to PDF Converter'], ['pdf-to-other-formats', 'PDF to JPG, PNG or TXT'], ['pdf-editor', 'Live PDF Editor'], ['pdf-to-word', 'PDF to Word (DOCX)'], ['image-compressor', 'Image Compressor'], ['image-converter', 'Image Converter (JPG, PNG, WebP)']].map(([id, n]) => `<a href="../${id}/">${n}</a>`).join(' · ');
  const intake = t.multi
    ? `<div id="drop" class="drop"><label for="file">${t.op === 'merge' ? 'Choose PDF files' : 'Choose images'}</label> <input type="file" id="file" accept="${t.accept}" multiple><p class="mut" style="margin:6px 0 0">or drop ${t.op === 'merge' ? 'PDFs' : 'images'} here. Add more at any time. Up to 50 files, 100 MB each. Nothing is uploaded.</p></div><p id="count" class="mut" aria-live="polite"></p><ol id="flist" class="flist" aria-label="Selected files"></ol>`
    : `<div id="drop" class="drop"><label for="file">Choose a PDF</label> <input type="file" id="file" accept=".pdf,application/pdf"><p class="mut" style="margin:6px 0 0">or drop it here. Up to 100 MB. Nothing is uploaded.</p></div><p id="fileinfo" class="mut" aria-live="polite"></p><p id="count" class="mut" aria-live="polite"></p>`;
  const reorder = t.op === 'reorder' ? `<div class="row" style="margin:8px 0"><button id="reverse" type="button">Reverse order</button><button id="restore" type="button">Restore original</button><label>Order <input id="order" type="text" size="24" autocomplete="off" aria-label="Page order, for example 3, 1, 2"></label><button id="apply-order" type="button">Apply order</button></div><ol id="plist" class="flist" aria-label="Pages in new order"></ol>` : '';
  return `${head(p, t.name + ' – Free Online', t.meta, url)}
<body data-tool="${t.id}" data-op="${t.op}">
${top(p)}
<main id="main" class="wrap">
<h1>${t.name}</h1><p class="mut">${t.desc} Processed in your browser; your files are not uploaded.</p>
<div id="status" class="status" role="status" aria-live="polite" hidden></div>
<section class="card">${intake}
<div id="opts" hidden>${t.opts ? `<div class="row" style="margin-top:8px">${t.opts}</div>` : ''}${reorder}</div>
<div class="row" style="margin:12px 0"><button id="go" class="primary" type="button" disabled>${t.go}</button><button id="dl" type="button" disabled>Download${t.op === 'split' ? ' all files' : ''}</button>${t.op === 'split' ? '<button id="dlzip" type="button" hidden>Download ZIP</button>' : ''}<button id="reset" class="danger" type="button">Reset</button></div>
<div id="result" class="stats"></div>${t.op === 'split' ? '<ul id="parts" class="flist plain" aria-label="Created files"></ul>' : ''}</section>
<aside class="ad-slot" aria-label="Advertisement placeholder">Ad placeholder – replace with AdSense unit after approval (see README)</aside>
<section aria-labelledby="faq"><h2 id="faq">FAQ</h2>${t.faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>
<section><h2>Related tools</h2><p>${related} · <a href="${p}#tools">All tools</a></p></section>
</main>
${FOOT(p)}
<script type="module" src="${p}assets/js/common.js"></script>
<script type="module" src="${p}assets/js/pdf-ui.js"></script>
</body></html>
`;
};
export function writePdfPages() { for (const t of PDFT) { fs.mkdirSync(`tools/${t.id}`, { recursive: true }); fs.writeFileSync(`tools/${t.id}/index.html`, page(t)); } return PDFT.length; }
if (process.argv[1].endsWith('gen-pdf-pages.mjs')) console.log('generated', writePdfPages(), 'PDF pages');
