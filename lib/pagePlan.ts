import type { AnnotationState } from '@/types';

// Local copy (not imported from geometry) so this file runs under plain Node in the unit tests.
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** One page of the document being rebuilt: `source` is the original 1-based page, or null for a new blank page. */
export type PlanEntry = { key: string; source: number | null; width: number; height: number };

export const initialPlan = (sizes: { width: number; height: number }[]): PlanEntry[] =>
  sizes.map((s, i) => ({ key: `p${i + 1}`, source: i + 1, width: s.width, height: s.height }));

export const isIdentity = (plan: PlanEntry[], originalCount: number) =>
  plan.length === originalCount && plan.every((e, i) => e.source === i + 1);

/** Moves the selected pages one step up (-1) or down (+1), keeping their order and the order of the rest. */
export function moveSelection(plan: PlanEntry[], selected: string[], dir: -1 | 1): PlanEntry[] {
  const next = [...plan];
  const on = (i: number) => selected.includes(next[i]!.key);
  if (dir === -1) {
    for (let i = 1; i < next.length; i += 1) if (on(i) && !on(i - 1)) [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
  } else {
    for (let i = next.length - 2; i >= 0; i -= 1) if (on(i) && !on(i + 1)) [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
  }
  return next;
}

/** Puts a copy right after each selected page. */
export function duplicateSelection(plan: PlanEntry[], selected: string[]): PlanEntry[] {
  return plan.flatMap((e) => (selected.includes(e.key) ? [e, { ...e, key: `${e.key}-${uid()}` }] : [e]));
}

/** Removes the selected pages; a document must keep at least one page, so deleting everything is ignored. */
export function deleteSelection(plan: PlanEntry[], selected: string[]): PlanEntry[] {
  const next = plan.filter((e) => !selected.includes(e.key));
  return next.length ? next : plan;
}

/** Inserts a blank page after the last selected page (or at the end), sized like the page before it. */
export function insertBlank(plan: PlanEntry[], selected: string[]): PlanEntry[] {
  let at = plan.length - 1;
  plan.forEach((e, i) => { if (selected.includes(e.key)) at = i; });
  const ref = plan[at] ?? { width: 595, height: 842 };
  const blank: PlanEntry = { key: `b-${uid()}`, source: null, width: ref.width, height: ref.height };
  return [...plan.slice(0, at + 1), blank, ...plan.slice(at + 1)];
}

/** Moves annotations and bookmarks to the pages' new numbers; copies go with duplicated pages, deleted pages lose theirs. */
export function remapAnnotations(ann: AnnotationState, plan: PlanEntry[]): AnnotationState {
  const targets = new Map<number, number[]>();
  plan.forEach((e, i) => { if (e.source !== null) targets.set(e.source, [...(targets.get(e.source) ?? []), i + 1]); });
  const spread = <T extends { id: string; page: number }>(list: T[]) =>
    list.flatMap((item) => (targets.get(item.page) ?? []).map((page, n) => ({ ...item, page, id: n === 0 ? item.id : uid() })));
  return { ...ann, version: 2, strokes: spread(ann.strokes), notes: spread(ann.notes), images: spread(ann.images) };
}

export function remapBookmarks(bookmarks: number[], plan: PlanEntry[]): number[] {
  const out = new Set<number>();
  plan.forEach((e, i) => { if (e.source !== null && bookmarks.includes(e.source)) out.add(i + 1); });
  return [...out].sort((a, b) => a - b);
}
