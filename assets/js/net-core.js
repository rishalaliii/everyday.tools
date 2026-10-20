/* Network helpers – pure functions, no DOM. Classic script (works from file:// too); exposes globalThis.ET_NET. */
(function (g) {
  'use strict';
  const ip4 = (s) => {
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(s).trim());
    if (!m) return null;
    let n = 0;
    for (let i = 1; i < 5; i++) { if (m[i].length > 1 && m[i][0] === '0') return null; const o = +m[i]; if (o > 255) return null; n = n * 256 + o; }
    return n;
  };
  const ip4Why = (s) => {
    s = String(s).trim();
    if (!s) return 'Empty address.';
    if (!/^[\d.]+$/.test(s)) return 'Contains characters other than digits and dots.';
    const p = s.split('.');
    if (p.length !== 4) return `Needs exactly 4 numbers separated by dots (found ${p.length}).`;
    for (const x of p) {
      if (x === '') return 'Empty octet (two dots in a row, or a leading/trailing dot).';
      if (x.length > 1 && x[0] === '0') return `Octet "${x}" has a leading zero (ambiguous; may be read as octal).`;
      if (+x > 255) return `Octet "${x}" is greater than 255.`;
    }
    return '';
  };
  const str = (n) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  const maskOf = (c) => (c === 0 ? 0 : (0xFFFFFFFF << (32 - c)) >>> 0);
  const maskToCidr = (n) => { const inv = (~n) >>> 0; if ((inv & (inv + 1)) !== 0) return null; let c = 0; for (let i = 31; i >= 0 && (n >>> i) & 1; i--) c++; return c; };
  const bin = (n) => [24, 16, 8, 0].map((s) => ((n >>> s) & 255).toString(2).padStart(8, '0')).join('.');
  // "24", "/24", "255.255.255.0"  -> cidr (or null)
  const parseMask = (s) => {
    s = String(s).trim().replace(/^\//, '');
    if (/^\d{1,2}$/.test(s)) { const c = +s; return c <= 32 ? c : null; }
    const n = ip4(s); return n == null ? null : maskToCidr(n);
  };
  const isPrivate = (n) => (n >>> 24 === 10) || (n >>> 20 === 0xAC1) || (n >>> 16 === 0xC0A8);
  const kind = (n) => {
    if (n >>> 24 === 127) return 'Loopback';
    if (n >>> 16 === 0xA9FE) return 'Link-local (APIPA)';
    if (isPrivate(n)) return 'Private (RFC 1918)';
    if (n >>> 28 === 14) return 'Multicast';
    if (n >>> 28 === 15) return 'Reserved';
    if (n >>> 22 === 0x191) return 'Shared address space (CGNAT)';
    if (n === 0) return 'Unspecified';
    return 'Public';
  };
  const klass = (n) => { const a = n >>> 24; return a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D (multicast)' : 'E (reserved)'; };
  function subnet(ipS, maskS) {
    let ipText = String(ipS).trim(), mk = maskS;
    if (ipText.includes('/')) { [ipText, mk] = ipText.split('/'); }
    else if (/\s/.test(ipText) && !String(maskS || '').trim()) { [ipText, mk] = ipText.split(/\s+/); }
    const ip = ip4(ipText);
    if (ip == null) throw new Error('Invalid IPv4 address: ' + (ip4Why(ipText) || 'check the format (e.g. 192.168.1.10).'));
    if (mk == null || String(mk).trim() === '') throw new Error('Enter a subnet mask or CIDR prefix (e.g. /24 or 255.255.255.0).');
    const c = parseMask(mk);
    if (c == null) throw new Error('Invalid subnet mask. Use a prefix 0–32 or a contiguous mask such as 255.255.255.0.');
    const mask = maskOf(c), net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0, total = 2 ** (32 - c);
    let hosts, first, last;
    if (c <= 30) { hosts = total - 2; first = net + 1; last = bc - 1; }
    else if (c === 31) { hosts = 2; first = net; last = bc; }
    else { hosts = 1; first = last = net; }
    return { ip: str(ip), cidr: c, mask: str(mask), wildcard: str((~mask) >>> 0), network: str(net), broadcast: c >= 31 ? 'n/a' : str(bc),
      first: str(first), last: str(last), hosts, total, klass: klass(ip), kind: kind(ip), maskBin: bin(mask), ipBin: bin(ip),
      note: c === 31 ? '/31 point-to-point link (RFC 3021): both addresses usable.' : c === 32 ? '/32 single host.' : '' };
  }
  function cidrConvert(v) {
    v = String(v).trim();
    if (!v) throw new Error('Enter a CIDR prefix (/24), a subnet mask (255.255.255.0) or a wildcard mask (0.0.0.255).');
    let c = null, from = '';
    if (/^\/?\d{1,2}$/.test(v)) { c = parseMask(v); from = 'prefix'; }
    else {
      const n = ip4(v);
      if (n == null) throw new Error('Not a prefix or IPv4 mask: ' + (ip4Why(v) || 'unrecognised format.'));
      c = maskToCidr(n); from = 'subnet mask';
      if (c == null) { c = maskToCidr((~n) >>> 0); from = 'wildcard mask'; }
    }
    if (c == null) throw new Error('That is not a contiguous subnet or wildcard mask.');
    const m = maskOf(c), total = 2 ** (32 - c);
    return { cidr: c, from, mask: str(m), wildcard: str((~m) >>> 0), maskBin: bin(m), total, usable: c <= 30 ? total - 2 : c === 31 ? 2 : 1 };
  }
  function ipv4Info(s) {
    const why = ip4Why(s);
    if (why) return { ok: false, why };
    const n = ip4(s);
    return { ok: true, addr: str(n), decimal: n, hex: '0x' + n.toString(16).toUpperCase().padStart(8, '0'), bin: bin(n), klass: klass(n), kind: kind(n) };
  }
  // ---- MAC ----
  function macInfo(s) {
    s = String(s).trim();
    const ok = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(s) || /^([0-9a-f]{2}-){5}[0-9a-f]{2}$/i.test(s) || /^([0-9a-f]{4}\.){2}[0-9a-f]{4}$/i.test(s) || /^[0-9a-f]{12}$/i.test(s);
    if (!ok) {
      const h = s.replace(/[:\-.\s]/g, '');
      let why = 'Use 6 hex pairs (AA:BB:CC:DD:EE:FF, AA-BB-…), Cisco AABB.CCDD.EEFF or 12 plain hex digits.';
      if (/[^0-9a-f:\-.\s]/i.test(s)) why = 'Contains non-hex characters (only 0-9 and A-F are allowed).';
      else if (h.length !== 12) why = `Has ${h.length} hex digits; a MAC address has 12.`;
      else if (/[:\-.]/.test(s)) why = 'Mixed or misplaced separators.';
      return { ok: false, why };
    }
    const h = s.replace(/[:\-.]/g, '').toUpperCase(), pairs = h.match(/../g), first = parseInt(h.slice(0, 2), 16);
    return { ok: true, hex: h, colon: pairs.join(':'), hyphen: pairs.join('-'), cisco: (h.slice(0, 4) + '.' + h.slice(4, 8) + '.' + h.slice(8)).toLowerCase(), plain: h,
      cast: first & 1 ? 'Multicast/group' : 'Unicast', admin: first & 2 ? 'Locally administered' : 'Universally administered (OUI-based)', oui: pairs.slice(0, 3).join(':'),
      broadcast: h === 'FFFFFFFFFFFF' };
  }
  // ---- IPv6 ----
  function groups(part, last) {
    if (part === '') return [];
    const t = part.split(':'), o = [];
    for (let i = 0; i < t.length; i++) {
      const x = t[i];
      if (x.includes('.')) { if (!(last && i === t.length - 1)) return null; const n = ip4(x); if (n == null) return null; o.push(n >>> 16, n & 65535); }
      else { if (!/^[0-9a-fA-F]{1,4}$/.test(x)) return null; o.push(parseInt(x, 16)); }
    }
    return o;
  }
  function ip6(s) {
    s = String(s).trim();
    if (!s || !/^[0-9a-fA-F:.]+$/.test(s) || /:::/.test(s)) return null;
    const p = s.split('::');
    if (p.length > 2) return null;
    if (p.length === 1) { const g = groups(p[0], true); return g && g.length === 8 ? g : null; }
    const L = groups(p[0], false), R = groups(p[1], true);
    if (!L || !R || L.length + R.length > 7) return null;
    return [...L, ...Array(8 - L.length - R.length).fill(0), ...R];
  }
  const expand6 = (g) => g.map((x) => x.toString(16).padStart(4, '0')).join(':');
  function compress6(g) {
    let bs = -1, bl = 0;
    for (let i = 0; i < 8;) { if (g[i] === 0) { let j = i; while (j < 8 && g[j] === 0) j++; if (j - i > bl) { bs = i; bl = j - i; } i = j; } else i++; }
    const h = g.map((x) => x.toString(16));
    if (bl < 2) return h.join(':');
    return h.slice(0, bs).join(':') + '::' + h.slice(bs + bl).join(':');
  }
  function kind6(g) {
    if (g.every((x) => x === 0)) return 'Unspecified (::)';
    if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return 'Loopback (::1)';
    if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return 'IPv4-mapped (::ffff:a.b.c.d)';
    if ((g[0] & 0xffc0) === 0xfe80) return 'Link-local (fe80::/10)';
    if ((g[0] & 0xfe00) === 0xfc00) return 'Unique local (fc00::/7)';
    if ((g[0] & 0xff00) === 0xff00) return 'Multicast (ff00::/8)';
    if (g[0] === 0x2001 && g[1] === 0x0db8) return 'Documentation (2001:db8::/32)';
    if ((g[0] & 0xe000) === 0x2000) return 'Global unicast (2000::/3)';
    return 'Other / reserved';
  }
  function ipv6Info(s) {
    s = String(s).trim();
    let zone = '';
    const z = /^([^%]*)%(.+)$/.exec(s); if (z) { s = z[1]; zone = z[2]; }
    const g = ip6(s);
    if (!g) {
      let why = 'Not a valid IPv6 address.';
      if (!s) why = 'Empty address.';
      else if (/[^0-9a-fA-F:.]/.test(s)) why = 'Contains characters that are not hex digits, colons or dots.';
      else if (/:::/.test(s) || s.split('::').length > 2) why = 'Only one "::" is allowed and it cannot be ":::".';
      else if (s.split(':').some((x) => x.length > 4 && !x.includes('.'))) why = 'A group has more than 4 hex digits.';
      else if (!s.includes('::') && s.split(':').length !== 8) why = `Without "::" there must be exactly 8 groups (found ${s.split(':').length}).`;
      else if (s.includes('::')) why = 'Too many groups for "::" to stand for at least one zero group, or a malformed group.';
      return { ok: false, why };
    }
    return { ok: true, expanded: expand6(g), compressed: compress6(g), kind: kind6(g), zone, groups: g };
  }
  g.ET_NET = { ip4, ip4Why, str, maskToCidr, parseMask, subnet, cidrConvert, ipv4Info, macInfo, ip6, ipv6Info, expand6, compress6 };
})(typeof globalThis !== 'undefined' ? globalThis : window);
