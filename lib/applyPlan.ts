import * as FileSystem from 'expo-file-system/legacy';
import { rewritePdf } from '@/lib/pageOps';
import { remapAnnotations, remapBookmarks, type PlanEntry } from '@/lib/pagePlan';
import { patchDocument, saveAnnotations } from '@/lib/storage';
import type { AnnotationState, DocumentRecord } from '@/types';

/** Rebuilds the document with the new page plan, moves annotations/bookmarks with their pages, and returns the new state. */
export async function applyPlan(doc: DocumentRecord, plan: PlanEntry[], ann: AnnotationState): Promise<{ doc: DocumentRecord; ann: AnnotationState }> {
  const uri = await rewritePdf(doc.uri, plan, doc.template ?? 'blank');
  const info = await FileSystem.getInfoAsync(uri);
  const nextAnn = remapAnnotations(ann, plan);
  const change: Partial<DocumentRecord> = {
    uri, pages: plan.length, size: info.exists ? info.size : doc.size, bookmarks: remapBookmarks(doc.bookmarks ?? [], plan),
    updatedAt: new Date().toISOString(), lastPage: Math.min(doc.lastPage ?? 1, plan.length),
  };
  await saveAnnotations(doc.id, nextAnn);
  await patchDocument(doc.id, change);
  await FileSystem.deleteAsync(doc.uri, { idempotent: true }).catch(() => {});
  return { doc: { ...doc, ...change }, ann: nextAnn };
}
