import assert from 'node:assert/strict';
import { test } from 'node:test';
import { migrateToPageSpace } from './annotations.ts';

const sizes = [{ width: 600, height: 800 }];
const base = { id: 's', page: 1, color: '#000', opacity: 1, tool: 'pen' as const };

test('old screen-relative strokes become page-relative', () => {
  // 360x600 screen: the page is fitted at scale 0.6 -> 360x480, centred vertically (60px margin top and bottom).
  const old = { strokes: [{ ...base, width: 6, points: [{ x: 0.5, y: 0.5 }, { x: 0, y: 60 / 600 }] }], notes: [], images: [], view: { width: 360, height: 600 } };
  const out = migrateToPageSpace(old, sizes);
  assert.equal(out.version, 2);
  assert.deepEqual(out.strokes[0]!.points[0], { x: 0.5, y: 0.5 });
  assert.deepEqual(out.strokes[0]!.points[1], { x: 0, y: 0 });
  assert.equal(out.strokes[0]!.width, 10); // 6px on a 360px-wide page = 10 units of 600
  assert.equal(out.view, undefined);
});

test('stickers and images are converted too', () => {
  const old = {
    strokes: [], view: { width: 360, height: 600 },
    notes: [{ id: 'n', page: 1, x: 0, y: 60 / 600, text: '⭐', color: 'transparent', kind: 'sticker' as const, size: 36 }],
    images: [{ id: 'i', page: 1, x: 0.5, y: 0.5, w: 0.5, aspect: 1, uri: 'file:///x.png' }],
  };
  const out = migrateToPageSpace(old, sizes);
  assert.equal(out.notes[0]!.size, 0.1);
  assert.deepEqual([out.notes[0]!.x, out.notes[0]!.y], [0, 0]);
  assert.equal(out.images[0]!.w, 0.5);
});

test('already migrated data is untouched; empty data is only versioned', () => {
  const done = { strokes: [], notes: [], images: [], version: 2 };
  assert.equal(migrateToPageSpace(done, sizes), done);
  assert.equal(migrateToPageSpace({ strokes: [], notes: [], images: [] }, sizes).version, 2);
});

test('strokes on unknown pages are kept as they are', () => {
  const old = { strokes: [{ ...base, page: 9, width: 4, points: [{ x: 0.1, y: 0.1 }] }], notes: [], images: [], view: { width: 360, height: 600 } };
  assert.deepEqual(migrateToPageSpace(old, sizes).strokes[0]!.points, [{ x: 0.1, y: 0.1 }]);
});
