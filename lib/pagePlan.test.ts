import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteSelection, duplicateSelection, initialPlan, insertBlank, isIdentity, moveSelection, remapAnnotations, remapBookmarks } from './pagePlan.ts';
import { templateShapes } from './templates.ts';

const sizes = [1, 2, 3, 4].map(() => ({ width: 600, height: 800 }));
const keys = (plan: { key: string }[]) => plan.map((e) => e.key).join(',');
const sources = (plan: { source: number | null }[]) => plan.map((e) => e.source ?? 'B').join(',');

test('moving keeps relative order and stops at the edges', () => {
  const plan = initialPlan(sizes);
  assert.equal(sources(moveSelection(plan, ['p3'], -1)), '1,3,2,4');
  assert.equal(sources(moveSelection(plan, ['p1'], -1)), '1,2,3,4');
  assert.equal(sources(moveSelection(plan, ['p2', 'p3'], 1)), '1,4,2,3');
  assert.equal(sources(moveSelection(plan, ['p3', 'p4'], 1)), '1,2,3,4');
});

test('duplicate, delete and insert blank', () => {
  const plan = initialPlan(sizes);
  assert.equal(sources(duplicateSelection(plan, ['p2'])), '1,2,2,3,4');
  assert.equal(sources(deleteSelection(plan, ['p2', 'p4'])), '1,3');
  assert.equal(keys(deleteSelection(plan, plan.map((e) => e.key))), keys(plan)); // cannot delete everything
  assert.equal(sources(insertBlank(plan, ['p2'])), '1,2,B,3,4');
  assert.equal(sources(insertBlank(plan, [])), '1,2,3,4,B');
  assert.equal(isIdentity(plan, 4), true);
  assert.equal(isIdentity(moveSelection(plan, ['p2'], 1), 4), false);
});

test('annotations follow their pages', () => {
  const stroke = (id: string, page: number) => ({ id, page, color: '#000', width: 6, opacity: 1, tool: 'pen' as const, points: [{ x: 0.1, y: 0.1 }] });
  const ann = { version: 2, strokes: [stroke('a', 1), stroke('b', 2), stroke('c', 3)], notes: [], images: [] };
  // new order: 3, 2, 2(copy), blank   (page 1 deleted)
  let plan = initialPlan(sizes);
  plan = deleteSelection(plan, ['p1', 'p4']);
  plan = moveSelection(plan, ['p3'], -1);
  plan = duplicateSelection(plan, ['p2']);
  assert.equal(sources(plan), '3,2,2');
  const out = remapAnnotations(ann, plan);
  assert.deepEqual(out.strokes.map((s) => s.page).sort(), [1, 2, 3]);
  assert.equal(out.strokes.find((s) => s.id === 'c')!.page, 1);
  assert.equal(out.strokes.find((s) => s.id === 'b')!.page, 2);
  assert.equal(out.strokes.filter((s) => s.page === 3)[0]!.id === 'b', false); // the copy got a new id
  assert.equal(out.strokes.some((s) => s.id === 'a'), false); // deleted with page 1
});

test('bookmarks are remapped and deduplicated', () => {
  const plan = duplicateSelection(initialPlan(sizes), ['p2']);
  assert.deepEqual(remapBookmarks([2, 4], plan), [2, 3, 5]);
});

test('paper templates draw the expected patterns', () => {
  assert.equal(templateShapes('blank', 595, 842).length, 0);
  assert.ok(templateShapes('ruled', 595, 842).length > 25);
  const grid = templateShapes('grid', 595, 842);
  assert.ok(grid.every((s) => s.k === 'line') && grid.length > 60);
  const dots = templateShapes('dots', 595, 842);
  assert.ok(dots.every((s) => s.k === 'dot') && dots.length > 1000);
});
