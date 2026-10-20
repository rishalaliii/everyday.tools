// Loads the vendored UMD build of pdf-lib in Node (the project is "type":"module", so require() can't be used on the .js file).
import fs from 'node:fs';
export function loadPdfLib() {
  const code = fs.readFileSync(new URL('../assets/js/vendor/pdf-lib.min.js', import.meta.url), 'utf8');
  const m = { exports: {} }; new Function('module', 'exports', code)(m, m.exports); return m.exports;
}
