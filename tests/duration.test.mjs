import test from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../assets/js/duration.js';

test('parseDuration formats', () => {
  assert.equal(d.parseDuration('1:02:03'), 3723);
  assert.equal(d.parseDuration('12:34'), 754);
  assert.equal(d.parseDuration('1h 2m 3s'), 3723);
  assert.equal(d.parseDuration('90m'), 5400);
  assert.equal(d.parseDuration('PT1H2M3S'), 3723);
  assert.equal(d.parseDuration('P0D'), 0);
});
test('parseDuration rejects bad input', () => {
  for (const x of ['', 'abc', '12:75', '1:75:00', '10', null, 'P']) assert.equal(d.parseDuration(x), null, String(x));
});
test('format helpers', () => {
  assert.equal(d.fmt(3723), '1h 2m 3s');
  assert.equal(d.clock(754), '12:34');
  assert.equal(d.clock(3723), '1:02:03');
  assert.equal(d.atSpeed(3600, 1.5), 2400);
});
test('daysNeeded', () => {
  assert.equal(d.daysNeeded(7200, 1, 2), 1);
  assert.equal(d.daysNeeded(7201, 1, 2), 2);
  assert.equal(d.daysNeeded(36000, 2, 2.5), 2);
  assert.equal(d.daysNeeded(0, 1, 2), 0);
  assert.equal(d.daysNeeded(100, 1, 0), null);
});
test('ids', () => {
  assert.equal(d.extractPlaylistId('https://www.youtube.com/playlist?list=PLabcdefghijk123'), 'PLabcdefghijk123');
  assert.equal(d.extractPlaylistId('PLabcdefghijk123'), 'PLabcdefghijk123');
  assert.equal(d.extractPlaylistId('https://example.com/?list=PLabcdefghijk123'), null);
  assert.equal(d.extractPlaylistId('hello'), null);
  assert.equal(d.extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=5'), 'dQw4w9WgXcQ');
  assert.equal(d.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLx'), 'dQw4w9WgXcQ');
  assert.equal(d.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(d.extractVideoId('nonsense text'), null);
});
test('parseLines handles CSV, plain text, URLs, header', () => {
  const items = d.parseLines('title,duration\n"Intro, part 1",10:05\nLesson 2 1:02:03\nhttps://youtu.be/dQw4w9WgXcQ 3:33\nNo duration here');
  assert.equal(items.length, 4);
  assert.deepEqual(items.map((i) => i.sec), [605, 3723, 213, null]);
  assert.equal(items[0].title, 'Intro, part 1');
  assert.equal(items[2].id, 'dQw4w9WgXcQ');
});
test('CSV export re-imports and neutralises formulas', () => {
  const v = [{ title: '=HYPERLINK("x")', sec: 754, watched: true }, { title: 'B', sec: null, watched: false }];
  const csv = d.toCSV(v);
  assert.ok(csv.includes("\"'=HYPERLINK"));
  const back = d.parseLines(csv);
  assert.equal(back[0].sec, 754);
});
test('totals', () => {
  const t = d.totals([{ sec: 600, watched: true }, { sec: 300 }, { sec: null }]);
  assert.deepEqual(t, { count: 3, total: 900, watched: 600, remaining: 300, unknown: 1, watchedCount: 1 });
});
