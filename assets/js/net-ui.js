/* Network tools UI (classic script). Needs tool-ui.js + net-core.js. */
(function () {
  'use strict';
  const U = ET_UI, N = ET_NET, $ = U.$, op = document.body.dataset.op, out = $('#out');
  const val = (id) => ($('#' + id) ? $('#' + id).value : '');
  let result = '', busy = false;
  const show = (t) => { result = t; out.textContent = t || 'Results will appear here.'; out.classList.toggle('empty', !t); };
  const lines = (t) => t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fmtN = (n) => n.toLocaleString('en-US');

  const ops = {
    subnet() {
      if (!val('ip').trim()) return { empty: 1 };
      const r = N.subnet(val('ip'), val('mask'));
      return [`Address:         ${r.ip}/${r.cidr}`, `Subnet mask:     ${r.mask}`, `Wildcard mask:   ${r.wildcard}`, `Network address: ${r.network}`, `Broadcast:       ${r.broadcast}`,
        `Usable range:    ${r.first} – ${r.last}`, `Usable hosts:    ${fmtN(r.hosts)}`, `Total addresses: ${fmtN(r.total)}`, `Address class:   ${r.klass}`, `Address type:    ${r.kind}`,
        `Mask (binary):   ${r.maskBin}`, `IP (binary):     ${r.ipBin}`, r.note ? `Note: ${r.note}` : ''].filter(Boolean).join('\n');
    },
    cidr() {
      if (!val('v').trim()) return { empty: 1 };
      const r = N.cidrConvert(val('v'));
      return [`Input read as:    ${r.from}`, `CIDR prefix:      /${r.cidr}`, `Subnet mask:      ${r.mask}`, `Wildcard mask:    ${r.wildcard}`, `Mask (binary):    ${r.maskBin}`, `Total addresses:  ${fmtN(r.total)}`, `Usable hosts:     ${fmtN(r.usable)}`].join('\n');
    },
    ipv4() {
      const L = lines(val('in')); if (!L.length) return { empty: 1 };
      let ok = 0;
      const t = L.map((l) => { const r = N.ipv4Info(l); if (!r.ok) return `✗ ${l}\n    ${r.why}`; ok++; return `✓ ${r.addr}\n    ${r.kind} · class ${r.klass}\n    decimal ${r.decimal} · hex ${r.hex}\n    ${r.bin}`; });
      return { text: t.join('\n'), note: `${ok} of ${L.length} valid.`, level: ok === L.length ? 'ok' : 'warn' };
    },
    ipv6() {
      const L = lines(val('in')); if (!L.length) return { empty: 1 };
      let ok = 0;
      const t = L.map((l) => { const r = N.ipv6Info(l); if (!r.ok) return `✗ ${l}\n    ${r.why}`; ok++; return `✓ ${l}\n    Compressed: ${r.compressed}\n    Expanded:   ${r.expanded}\n    Type:       ${r.kind}${r.zone ? `\n    Zone ID "${r.zone}" ignored (not part of the address).` : ''}`; });
      return { text: t.join('\n'), note: `${ok} of ${L.length} valid.`, level: ok === L.length ? 'ok' : 'warn' };
    },
    mac() {
      const L = lines(val('in')); if (!L.length) return { empty: 1 };
      let ok = 0;
      const t = L.map((l) => { const r = N.macInfo(l); if (!r.ok) return `✗ ${l}\n    ${r.why}`; ok++; return `✓ ${l}\n    Colon:   ${r.colon}\n    Hyphen:  ${r.hyphen}\n    Cisco:   ${r.cisco}\n    Plain:   ${r.plain}\n    ${r.cast} · ${r.admin}${r.broadcast ? ' · broadcast address' : ''}\n    First 3 bytes: ${r.oui}`; });
      return { text: t.join('\n'), note: `${ok} of ${L.length} valid.`, level: ok === L.length ? 'ok' : 'warn' };
    },
  };

  async function fetchJson(url, opts, ms) {
    const ac = new AbortController(), timer = setTimeout(() => ac.abort(), ms || 8000);
    try {
      const r = await fetch(url, { ...opts, signal: ac.signal, cache: 'no-store' });
      if (r.status === 429) throw new Error('The service is rate-limiting requests. Wait a minute and try again.');
      if (!r.ok) throw new Error('The service answered with HTTP ' + r.status + '.');
      return await r.json();
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('The request timed out after ' + (ms || 8000) / 1000 + ' seconds.');
      if (e instanceof TypeError) throw new Error('Network error – you may be offline, or an ad blocker/firewall is blocking the request.');
      throw e;
    } finally { clearTimeout(timer); }
  }
  const TYPES = { 1: 'A', 2: 'NS', 5: 'CNAME', 6: 'SOA', 15: 'MX', 16: 'TXT', 28: 'AAAA', 257: 'CAA' };
  const RCODE = { 0: 'NOERROR', 1: 'FORMERR', 2: 'SERVFAIL', 3: 'NXDOMAIN', 5: 'REFUSED' };
  const remote = {
    async myip() {
      const j = await fetchJson('https://api.ipify.org?format=json');
      if (!j || !j.ip) throw new Error('The service returned an unexpected response.');
      const v6 = j.ip.includes(':');
      return `Your public IP address: ${j.ip}\nVersion: ${v6 ? 'IPv6' : 'IPv4'}\nSource: api.ipify.org (external service)\n\nThis is the address websites see. It may be your ISP's shared address, or a VPN/proxy address.`;
    },
    async dns() {
      let d = val('dom').trim().replace(/^[a-z]+:\/\//i, '').replace(/[/?#].*$/, '').replace(/\.$/, '');
      if (!d) return { empty: 1 };
      try { d = new URL('http://' + d).hostname; } catch { throw new Error('That is not a valid domain name.'); }
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(d) || d.length > 253) throw new Error('That is not a valid domain name.');
      const type = val('type') || 'A', q = `name=${encodeURIComponent(d)}&type=${type}`;
      let j, via = 'cloudflare-dns.com', errs = [];
      for (const [host, url] of [['cloudflare-dns.com', 'https://cloudflare-dns.com/dns-query?' + q], ['dns.google', 'https://dns.google/resolve?' + q]]) {
        try { j = await fetchJson(url, { headers: { accept: 'application/dns-json' } }); via = host; break; } catch (e) { errs.push(host + ': ' + e.message); }
      }
      if (!j) throw new Error('Both DNS-over-HTTPS services failed. ' + errs.join(' | '));
      const code = RCODE[j.Status] || 'RCODE ' + j.Status, ans = (j.Answer || []).filter((a) => true);
      let t = `Domain: ${d}\nRecord type: ${type}\nStatus: ${code}\nResolver: ${via} (external DNS-over-HTTPS service)\n`;
      if (j.Status === 3) return t + '\nThis domain does not exist (NXDOMAIN).';
      if (j.Status !== 0) return t + '\nThe resolver could not complete the lookup.';
      if (!ans.length) return t + `\nNo ${type} records were found for this name.`;
      return t + '\n' + ans.map((a) => `${(TYPES[a.type] || 'TYPE' + a.type).padEnd(6)} TTL ${String(a.TTL).padEnd(6)} ${a.data}`).join('\n');
    },
  };

  async function run() {
    if (busy) return;
    try {
      if (remote[op]) {
        busy = true; $('#go').disabled = true; U.say(op === 'dns' ? 'Contacting DNS-over-HTTPS service…' : 'Contacting external service…', 'info');
        const r = await remote[op]();
        if (r && r.empty) { show(''); return U.say('Enter a domain name first.', 'error'); }
        show(r); U.say('Done.', 'ok'); return;
      }
      const r = ops[op]();
      if (r.empty) { show(''); return U.say('Enter a value above – results update as you type.', 'info'); }
      if (typeof r === 'string') { show(r); U.say('', 'info'); } else { show(r.text); U.say(r.note, r.level); }
    } catch (e) { show(''); U.say(e.message, 'error'); }
    finally { busy = false; const b = $('#go'); if (b) b.disabled = false; }
  }
  U.on('#go', 'click', run);
  if (!remote[op]) document.querySelectorAll('#tool input, #tool textarea, #tool select').forEach((e) => ['input', 'change'].forEach((ev) => e.addEventListener(ev, run)));
  else document.querySelectorAll('#tool input').forEach((e) => e.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') run(); }));
  U.on('#copy', 'click', () => U.copy(result));
  U.on('#dl', 'click', () => U.download(result + '\n', op + '-result.txt'));
  U.on('#reset', 'click', () => { document.querySelectorAll('#tool input:not([type=checkbox]), #tool textarea').forEach((e) => (e.value = '')); show(''); U.say(''); });
  show('');
})();
