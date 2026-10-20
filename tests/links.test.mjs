import test from 'node:test';
import assert from 'node:assert/strict';
import { check } from '../scripts/check-links.mjs';
test('internal links, anchors, canonical URLs, sitemap and tool registry are consistent', async () => { const r = await check(); assert.deepEqual(r.problems, []); assert.ok(r.tools >= 31); });
