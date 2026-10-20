import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const load = (f) => { const ctx = { console, URL }; ctx.globalThis = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(new URL('../assets/js/' + f, import.meta.url), 'utf8'), ctx); return ctx; };
const N = load('net-core.js').ET_NET, S = load('srt-core.js').ET_SRT, W = load('wordcount.js').ET_WC;

test('word counter stats', () => {
  assert.deepEqual({ ...W.stats('') }, { words: 0, chars: 0, charsNoSpaces: 0, sentences: 0, paragraphs: 0, lines: 0 });
  const s = W.stats('Hello,   world!  Two  spaces.\n\nNew para line.');
  assert.equal(s.words, 7); assert.equal(s.sentences, 3); assert.equal(s.paragraphs, 2); assert.equal(s.lines, 3);
  assert.equal(W.stats('a b').charsNoSpaces, 2);
});
test('IPv4 subnet', () => {
  const r = N.subnet('192.168.1.130/26');
  assert.equal(r.network, '192.168.1.128'); assert.equal(r.broadcast, '192.168.1.191'); assert.equal(r.first, '192.168.1.129'); assert.equal(r.last, '192.168.1.190'); assert.equal(r.hosts, 62); assert.equal(r.mask, '255.255.255.192');
  assert.equal(N.subnet('10.0.0.1', '255.0.0.0').hosts, 16777214);
  assert.equal(N.subnet('10.0.0.0', '/0').total, 4294967296);
  assert.equal(N.subnet('10.0.0.5', '/31').hosts, 2); assert.equal(N.subnet('10.0.0.5', '/32').hosts, 1);
  assert.throws(() => N.subnet('300.1.1.1', '/24')); assert.throws(() => N.subnet('1.1.1.1', '255.0.255.0')); assert.throws(() => N.subnet('1.1.1.1', ''));
});
test('CIDR converter', () => {
  assert.equal(N.cidrConvert('/24').mask, '255.255.255.0'); assert.equal(N.cidrConvert('255.255.254.0').cidr, 23);
  const w = N.cidrConvert('0.0.0.255'); assert.equal(w.cidr, 24); assert.equal(w.from, 'wildcard mask');
  assert.throws(() => N.cidrConvert('255.0.255.0')); assert.throws(() => N.cidrConvert('/33'));
});
test('IPv4 validator', () => {
  assert.equal(N.ipv4Info('192.168.1.1').ok, true); assert.equal(N.ipv4Info('256.1.1.1').ok, false); assert.equal(N.ipv4Info('1.2.3').ok, false);
  assert.equal(N.ipv4Info('01.2.3.4').ok, false); assert.equal(N.ipv4Info('10.0.0.1').kind, 'Private (RFC 1918)'); assert.equal(N.ipv4Info('8.8.8.8').kind, 'Public');
});
test('MAC', () => {
  const m = N.macInfo('00-1a-2b-3c-4d-5e'); assert.equal(m.colon, '00:1A:2B:3C:4D:5E'); assert.equal(m.cisco, '001a.2b3c.4d5e');
  assert.equal(N.macInfo('001A.2B3C.4D5E').ok, true); assert.equal(N.macInfo('001A2B3C4D5E').ok, true);
  assert.equal(N.macInfo('00:1A:2B:3C:4D').ok, false); assert.equal(N.macInfo('00:1A-2B:3C:4D:5E').ok, false); assert.equal(N.macInfo('GG:1A:2B:3C:4D:5E').ok, false);
  assert.match(N.macInfo('01:00:5e:00:00:01').cast, /Multicast/);
});
test('IPv6', () => {
  const r = N.ipv6Info('2001:0db8:0000:0000:0000:0000:0000:0001'); assert.equal(r.compressed, '2001:db8::1'); assert.equal(N.ipv6Info('::').expanded, '0000:0000:0000:0000:0000:0000:0000:0000');
  assert.equal(N.ipv6Info('::1').kind, 'Loopback (::1)'); assert.equal(N.ipv6Info('::ffff:192.168.1.1').ok, true); assert.match(N.ipv6Info('fe80::1%eth0').kind, /Link-local/);
  for (const bad of ['1::2::3', '12345::1', '1:2:3:4:5:6:7', 'g::1', ':::', '1:2:3:4:5:6:7:8:9', '1:2:3:4:5:6:7::8']) assert.equal(N.ipv6Info(bad).ok, false, bad);
  assert.equal(N.compress6(N.ip6('1:0:0:2:0:0:0:3')), '1:0:0:2::3');
});
const SRT = '1\n00:00:01,000 --> 00:00:03,500\nHello <i>world</i>\n\n2\n00:00:03,000 --> 00:00:05,000\nOverlap\n';
test('SRT parse/validate/shift/format/txt', () => {
  const v = S.validate(SRT); assert.equal(v.cues.length, 2); assert.equal(v.errors, 0); assert.ok(v.issues.some((i) => /Overlaps/.test(i.msg)));
  assert.ok(S.validate('1\n00:00:05,000 --> 00:00:03,000\nx\n').errors === 1);
  assert.ok(S.validate('1\n00:00:01,000 -> 00:00:03,000\nx\n').errors === 1); assert.ok(S.validate('').errors === 1);
  assert.ok(S.validate('hello\nworld').errors === 1); assert.ok(S.validate('1\n00:99:01,000 --> 00:00:03,000\nx').errors === 1);
  const sh = S.shift(S.parse(SRT).cues, 2000); assert.equal(S.fmtTime(sh.cues[0].start), '00:00:03,000');
  const neg = S.shift(S.parse(SRT).cues, -2000); assert.equal(neg.clamped, 1); assert.equal(neg.cues[0].start, 0);
  assert.equal(S.toTxt(S.parse(SRT).cues), 'Hello world\nOverlap\n');
  const f = S.format('5\r\n00:00:01.000 --> 00:00:02.000\r\n  hi   there  \r\n\r\n\r\n9\r\n00:00:00,000 --> 00:00:00,500\r\nfirst\r\n', { sort: true });
  assert.match(f.srt, /^1\n00:00:00,000 --> 00:00:00,500\nfirst\n\n2\n00:00:01,000 --> 00:00:02,000\nhi there\n$/);
  assert.equal(S.format('1\n00:00:01,000 --> 00:00:02,000\n' + 'word '.repeat(20), { wrap: 30 }).cues[0].text.split('\n').every((l) => l.length <= 30), true);
});
test('TXT to SRT', () => {
  const c = S.fromTxt('One line.\nSecond line here.\n\n\nThird', { mode: 'line', cps: 10, gapMs: 0 });
  assert.equal(c.length, 3); assert.equal(c[0].start, 0); assert.equal(c[1].start, c[0].end);
  assert.equal(S.fromTxt('a\nb', { fixedMs: 2000, gapMs: 500 })[1].start, 2500);
  assert.equal(S.fromTxt('A. B! C?', { mode: 'sentence' }).length, 3); assert.equal(S.fromTxt('   ').length, 0);
  assert.equal(S.parse(S.toSrt(c)).cues.length, 3);
});
test('YouTube link-only: id extraction, pagination and fallback (mocked network)', async () => {
  const Y = load('yt-link.js').ET_YT;
  assert.equal(Y.extractId('https://www.youtube.com/playlist?list=PLabc1234567&si=x'), 'PLabc1234567');
  assert.equal(Y.extractId('youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc1234567&index=2'), 'PLabc1234567');
  assert.equal(Y.extractId('https://example.com/?list=PLabc1234567'), null); assert.equal(Y.extractId('hello'), null);
  const inv = async (u) => { const p = +/page=(\d+)/.exec(u)[1]; return { title: 'T', videoCount: 3, videos: p === 1 ? [{ title: 'a', lengthSeconds: 60 }, { title: 'b', lengthSeconds: 120 }] : p === 2 ? [{ title: 'c', lengthSeconds: 0 }] : [] }; };
  const r = await Y.load('PLabc1234567', [{ kind: 'piped', base: 'https://bad.example' }, { kind: 'invidious', base: 'https://ok.example' }], async (u) => { if (u.includes('bad.example')) throw new Error('down'); return inv(u); }, () => {}, () => {});
  const s = Y.summarize(r.videos); assert.equal(s.count, 3); assert.equal(s.total, 180); assert.equal(s.unknown, 1); assert.equal(r.via, 'ok.example');
  const pj = async (u) => (u.includes('nextpage') ? { relatedStreams: [{ title: 'z', duration: 30 }] } : { name: 'P', videos: 2, relatedStreams: [{ title: 'y', duration: 90 }], nextpage: 'tok' });
  assert.equal(Y.summarize((await Y.load('PLabc1234567', [{ kind: 'piped', base: 'https://p.example' }], pj, () => {}, () => {})).videos).total, 120);
  await assert.rejects(Y.load('PLabc1234567', [{ kind: 'piped', base: 'https://x.example' }], async () => { throw new Error('down'); }, () => {}, () => {}), /No free public server/);
  assert.equal(Y.fmt(3725), '1h 2m 5s');
});
