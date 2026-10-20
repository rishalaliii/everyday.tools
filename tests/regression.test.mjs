import test from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../assets/js/duration.js';
import { OPS } from '../assets/js/calc.js';
import * as T from '../assets/js/text.js';
// Regression tests for bugs found in the stage 5 audit (browser-level regressions live in tests/e2e/audit.mjs).
test('YouTube: line with trailing "1h 2m 3s" length and no comma (the page placeholder example)', () => {
  assert.deepEqual(d.parseLine('Functions 1h 2m 3s'), { title: 'Functions', sec: 3723, url: null, id: null, watched: false });
  assert.equal(d.parseLine('Part 3 1h 2m 3s').title, 'Part 3');
  assert.equal(d.parseLine('Part 3 1h 2m 3s').sec, 3723);
  assert.equal(d.parseLine('Lesson 4 90m').sec, 5400);
  assert.equal(d.parseLine('Lesson 4 12:30').sec, 750);
  assert.equal(d.parseLine('Lesson 4').sec, null);
  assert.equal(d.parseLine('Rocks and Hills').sec, null);
});
test('Data storage converter rejects negative sizes', () => {
  assert.throws(() => OPS.data({ value: '-1', from: 'GB', to: 'MB', base: '1024' }), /negative/);
  assert.deepEqual(OPS.data({ value: '1', from: 'GB', to: 'MB', base: '1024' }), [['1 GB =', '1,024 MB']]);
});
test('Word counter stats: empty, whitespace-only, unicode', () => {
  assert.deepEqual(T.stats(''), { words: 0, chars: 0, charsNoSpaces: 0, sentences: 0, paragraphs: 0, lines: 0 });
  assert.equal(T.stats('   \n  ').words, 0);
  assert.equal(T.stats('héllo 😀').chars, 7);
  assert.equal(T.stats('one\r\n\r\ntwo').paragraphs, 2);
});
