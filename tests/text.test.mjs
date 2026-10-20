import test from 'node:test';
import assert from 'node:assert/strict';
import * as t from '../assets/js/text.js';
test('stats', () => {
  assert.deepEqual(t.stats('Hello world. Hi!\n\nNew para'), { words: 5, chars: 26, charsNoSpaces: 21, sentences: 3, paragraphs: 2, lines: 3 });
  assert.equal(t.stats('').words, 0);
});
test('case', () => {
  assert.equal(t.convertCase("don't STOP-me now", 'title'), "Don't Stop-Me Now");
  assert.equal(t.convertCase('aB', 'upper'), 'AB');
});
test('dedupe/sort/clean', () => {
  assert.deepEqual(t.dedupe('a\nA\nb\na'), { text: 'a\nb', removed: 2 });
  assert.equal(t.dedupe('a\nA', { caseSensitive: true }).text, 'a\nA');
  assert.equal(t.sortLines('b\n10\n2\na'), '2\n10\na\nb');
  assert.equal(t.sortLines('a\nb', { desc: true }), 'b\na');
  assert.equal(t.clean('  a   b \n\n\n\n c  '), 'a b\n\nc');
  assert.equal(t.clean('a\n\n\nb', { removeBlank: true }), 'a\nb');
});
test('findReplace', () => {
  assert.deepEqual(t.findReplace('a.b a.b', '.', '-'), { text: 'a-b a-b', count: 2 });
  assert.equal(t.findReplace('Cat cat', 'cat', 'dog', { caseSensitive: true }).text, 'Cat dog');
  assert.equal(t.findReplace('x1 x2', 'x(\\d)', '$1', { regex: true }).text, '1 2');
  assert.throws(() => t.findReplace('a', '(', 'b', { regex: true }));
  assert.throws(() => t.findReplace('a', '', 'b'));
});
test('diff', () => {
  assert.deepEqual(t.diffLines('a\nb\nc', 'a\nc\nd').map((x) => x.t[0] + x.s), ['sa', 'db', 'sc', 'ad']);
});
