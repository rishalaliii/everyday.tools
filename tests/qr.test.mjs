import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILD, matrix } from '../assets/js/qr.js';
test('url', () => {
  assert.equal(BUILD.url({ url: 'example.com/a?b=1' }), 'https://example.com/a?b=1');
  assert.equal(BUILD.url({ url: 'http://example.com' }), 'http://example.com');
  assert.throws(() => BUILD.url({ url: '' })); assert.throws(() => BUILD.url({ url: 'javascript:alert(1)' })); assert.throws(() => BUILD.url({ url: 'not a url' }));
});
test('email & phone', () => {
  assert.equal(BUILD.email({ email: 'a@b.com', subject: 'Hi there', body: 'x&y' }), 'mailto:a@b.com?subject=Hi%20there&body=x%26y');
  assert.throws(() => BUILD.email({ email: 'nope' }));
  assert.equal(BUILD.phone({ phone: '+91 98765-43210' }), 'tel:+919876543210');
  assert.throws(() => BUILD.phone({ phone: 'abc' })); assert.throws(() => BUILD.phone({ phone: '12' }));
});
test('wifi', () => {
  assert.equal(BUILD.wifi({ ssid: 'My;Net', password: 'pass:word1', security: 'WPA', hidden: 'true' }), 'WIFI:T:WPA;S:My\\;Net;P:pass\\:word1;H:true;;');
  assert.equal(BUILD.wifi({ ssid: 'Open', security: 'nopass' }), 'WIFI:T:nopass;S:Open;;');
  assert.throws(() => BUILD.wifi({ ssid: 'x', password: 'short', security: 'WPA' })); assert.throws(() => BUILD.wifi({ ssid: '', password: '', security: 'WPA' }));
});
test('contact', () => {
  const v = BUILD.contact({ first: 'Ann', last: 'Lee', phone: '+1 555 123 4567', email: 'ann@x.org', org: 'A, B' });
  assert.match(v, /^BEGIN:VCARD\nVERSION:3.0\nN:Lee;Ann;;;\nFN:Ann Lee\nORG:A\\, B\n/); assert.ok(v.endsWith('END:VCARD'));
  assert.throws(() => BUILD.contact({})); assert.throws(() => BUILD.contact({ first: 'A', email: 'bad' }));
});
test('matrix', () => {
  const m = matrix('https://example.com', 'M'); assert.equal(m.n, 25); // version 2
  assert.ok(m.dark(0, 0) && m.dark(0, 6) && !m.dark(0, 7)); // finder pattern
  assert.ok(matrix('é漢😀', 'L').n >= 21);
  assert.throws(() => matrix('x'.repeat(5000), 'H'), /Too much data/); assert.throws(() => matrix('a', 'Z'));
});
