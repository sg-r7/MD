import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pointInPolygon, simplifyPoints, strokeHit, strokeInside, strokePathD, strokesBounds, translateStroke, uid } from './geometry.ts';

const base = { id: 's', page: 1, color: '#000000', width: 4, opacity: 1 };
const pen = { ...base, tool: 'pen' as const, points: [{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }, { x: 0.3, y: 0.1 }] };
const rect = { ...base, tool: 'rect' as const, points: [{ x: 0.5, y: 0.5 }, { x: 0.7, y: 0.7 }] };
const px = (p: { x: number; y: number }) => ({ x: p.x * 100, y: p.y * 100 });

test('strokePathD builds smooth pens, rectangles and arrows', () => {
  assert.equal(strokePathD(pen, px), 'M 10 10 Q 20 20 25 15 L 30 10');
  assert.equal(strokePathD(rect, px), 'M 50 50 L 70 50 L 70 70 L 50 70 Z');
  const arrow = strokePathD({ ...base, tool: 'arrow', points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }] }, px);
  assert.ok(arrow.startsWith('M 10 10 L 50 10 M '));
});

test('a single tap draws a dot', () => {
  assert.match(strokePathD({ ...pen, points: [{ x: 0.5, y: 0.5 }] }, px), /^M 50 50 L 50\.01 50$/);
});

test('eraser hits strokes and shape outlines, not empty space or shape interiors', () => {
  assert.equal(strokeHit(pen, [{ x: 0.2, y: 0.2 }], 100, 100, 12), true);
  assert.equal(strokeHit(pen, [{ x: 0.9, y: 0.9 }], 100, 100, 12), false);
  assert.equal(strokeHit(rect, [{ x: 0.6, y: 0.5 }], 100, 100, 12), true);
  assert.equal(strokeHit(rect, [{ x: 0.6, y: 0.6 }], 100, 100, 5), false);
});

test('a fast eraser swipe still hits (path is interpolated)', () => {
  assert.equal(strokeHit(pen, [{ x: 0.0, y: 0.2 }, { x: 0.45, y: 0.2 }], 100, 100, 6), true);
});

test('lasso selects fully enclosed strokes only', () => {
  const poly = [{ x: 0, y: 0 }, { x: 0.4, y: 0 }, { x: 0.4, y: 0.4 }, { x: 0, y: 0.4 }];
  assert.equal(strokeInside(pen, poly), true);
  assert.equal(strokeInside(rect, poly), false);
  assert.equal(pointInPolygon({ x: 0.2, y: 0.2 }, poly), true);
  assert.equal(pointInPolygon({ x: 0.8, y: 0.8 }, poly), false);
});

test('bounds, translate and clamping', () => {
  assert.deepEqual(strokesBounds([pen]), { minX: 0.1, minY: 0.1, maxX: 0.3, maxY: 0.2 });
  assert.equal(strokesBounds([]), null);
  const moved = translateStroke(pen, 5, -5);
  assert.ok(moved.points.every((p) => p.x === 1 && p.y === 0));
});

test('simplifyPoints collapses straight lines but keeps corners', () => {
  const line = Array.from({ length: 50 }, (_, i) => ({ x: i / 49, y: 0.5 }));
  assert.equal(simplifyPoints(line).length, 2);
  const corner = [{ x: 0, y: 0 }, { x: 0.5, y: 0 }, { x: 0.5, y: 0.5 }];
  assert.equal(simplifyPoints(corner).length, 3);
  assert.equal(simplifyPoints([{ x: 0, y: 0 }]).length, 1);
});

test('uid is unique', () => {
  assert.equal(new Set(Array.from({ length: 500 }, uid)).size, 500);
});
