import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument, rgb, type PDFPage } from 'pdf-lib';
import type { PlanEntry } from '@/lib/pagePlan';
import { templateShapes } from '@/lib/templates';
import type { Template } from '@/types';

export const libraryDir = () => `${FileSystem.documentDirectory}library/`;

/** Draws a paper pattern (ruled, grid, dots) on a pdf-lib page. */
export function drawTemplate(page: PDFPage, template: Template) {
  const { width, height } = page.getSize();
  for (const s of templateShapes(template, width, height)) {
    if (s.k === 'line') page.drawLine({ start: { x: s.x1, y: height - s.y1 }, end: { x: s.x2, y: height - s.y2 }, thickness: s.width, color: rgb(...s.color) });
    else page.drawCircle({ x: s.x, y: height - s.y, size: s.r, color: rgb(0.55, 0.62, 0.72) });
  }
}

/** Rebuilds a PDF with the pages in `plan` order (reordered, duplicated, deleted, plus new blank pages). Returns the new file's URI. */
export async function rewritePdf(uri: string, plan: PlanEntry[], template: Template = 'blank'): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const source = await PDFDocument.load(base64);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, plan.filter((e) => e.source !== null).map((e) => e.source! - 1));
  let next = 0;
  for (const entry of plan) {
    if (entry.source !== null) out.addPage(copied[next++]!);
    else drawTemplate(out.addPage([entry.width, entry.height]), template);
  }
  await FileSystem.makeDirectoryAsync(libraryDir(), { intermediates: true }).catch(() => {});
  const destination = `${libraryDir()}${Date.now()}-edited.pdf`;
  await FileSystem.writeAsStringAsync(destination, await out.saveAsBase64(), { encoding: FileSystem.EncodingType.Base64 });
  return destination;
}
