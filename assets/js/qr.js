// QR payload builders (pure, no DOM) + matrix generation. Each builder returns a string or throws Error(message).
import qrcode from './vendor/qrcode.mjs';
qrcode.stringToBytes = (s) => Array.from(new TextEncoder().encode(s)); // UTF-8
const req = (v, name) => { v = (v ?? '').trim(); if (!v) throw new Error(`Enter ${name}.`); return v; };
const wifiEsc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
const vEsc = (s) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1');
const EMAIL = /^[^\s@,;<>()]+@[^\s@,;<>()]+\.[^\s@,;<>()]{2,}$/;
export const BUILD = {
  url(x) {
    let u = req(x.url, 'a web address'); if (!/^[a-z][a-z0-9+.-]*:/i.test(u)) u = 'https://' + u;
    let p; try { p = new URL(u); } catch { throw new Error('That web address is not valid.'); }
    if (!/^https?:$/.test(p.protocol)) throw new Error('Only http:// and https:// addresses are supported.');
    if (!p.hostname.includes('.') && p.hostname !== 'localhost') throw new Error('That web address is not valid.');
    return u;
  },
  text: (x) => req(x.text, 'some text'),
  email(x) {
    const a = req(x.email, 'an email address'); if (!EMAIL.test(a)) throw new Error('That email address is not valid.');
    const q = [['subject', x.subject], ['body', x.body]].filter(([, v]) => v && v.trim()).map(([k, v]) => `${k}=${encodeURIComponent(v.trim())}`).join('&');
    return `mailto:${a}${q ? '?' + q : ''}`;
  },
  phone(x) {
    const p = req(x.phone, 'a phone number'); if (!/^\+?[\d\s().-]+$/.test(p)) throw new Error('Use digits, spaces, + ( ) - only.');
    const d = p.replace(/\D/g, ''); if (d.length < 5 || d.length > 15) throw new Error('A phone number has 5–15 digits.');
    return 'tel:' + (p.startsWith('+') ? '+' : '') + d;
  },
  wifi(x) {
    const s = req(x.ssid, 'the network name (SSID)'); if (s.length > 32) throw new Error('Network names are at most 32 characters.');
    const t = x.security || 'WPA', pw = x.password ?? '';
    if (t !== 'nopass') { if (!pw) throw new Error('Enter the Wi-Fi password.'); if (t === 'WPA' && (pw.length < 8 || pw.length > 63)) throw new Error('WPA passwords are 8–63 characters.'); }
    return `WIFI:T:${t};S:${wifiEsc(s)};${t === 'nopass' ? '' : `P:${wifiEsc(pw)};`}${x.hidden === 'true' ? 'H:true;' : ''};`;
  },
  contact(x) {
    const f = (x.first ?? '').trim(), l = (x.last ?? '').trim(); if (!f && !l) throw new Error('Enter a first or last name.');
    if (x.email && x.email.trim() && !EMAIL.test(x.email.trim())) throw new Error('That email address is not valid.');
    if (x.phone && x.phone.trim() && !/^\+?[\d\s().-]{5,}$/.test(x.phone.trim())) throw new Error('That phone number is not valid.');
    if (x.url && x.url.trim()) BUILD.url({ url: x.url });
    const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:${vEsc(l)};${vEsc(f)};;;`, `FN:${vEsc([f, l].filter(Boolean).join(' '))}`];
    const add = (k, v) => { if (v && v.trim()) L.push(`${k}:${vEsc(v.trim())}`); };
    add('ORG', x.org); add('TITLE', x.title); add('TEL', x.phone); add('EMAIL', x.email); if (x.url && x.url.trim()) L.push(`URL:${BUILD.url({ url: x.url })}`); add('ADR', x.addr ? `;;${x.addr}` : '');
    L.push('END:VCARD'); return L.join('\n');
  },
};
export const LEVELS = ['L', 'M', 'Q', 'H'];
export function matrix(text, level = 'M') {
  if (!LEVELS.includes(level)) throw new Error('Unknown error-correction level.');
  const q = qrcode(0, level);
  try { q.addData(text, 'Byte'); q.make(); } catch { throw new Error('Too much data for a QR code. Shorten the content or lower the error-correction level.'); }
  const n = q.getModuleCount(); return { n, dark: (r, c) => q.isDark(r, c) };
}
export function draw(canvas, text, { level = 'M', size = 512, fg = '#000000', bg = '#ffffff', margin = 4 } = {}) {
  const m = matrix(text, level), total = m.n + margin * 2, px = Math.max(1, Math.floor(size / total)), S = px * total;
  canvas.width = canvas.height = S; const g = canvas.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, S, S); g.fillStyle = fg;
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.dark(r, c)) g.fillRect((c + margin) * px, (r + margin) * px, px, px);
  return { modules: m.n, pixels: S };
}
