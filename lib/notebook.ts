import * as FileSystem from 'expo-file-system/legacy';
import { PDFDocument } from 'pdf-lib';
import { colors } from '@/constants/theme';
import { drawTemplate, libraryDir } from '@/lib/pageOps';
import { loadDocuments, saveDocuments } from '@/lib/storage';
import { A4 } from '@/lib/templates';
import type { DocumentRecord, Template } from '@/types';

/** Creates a notebook: a PDF of blank (or ruled / grid / dotted) A4 pages that opens in the normal reader. */
export async function createNotebook(opts: { name: string; template: Template; pages: number; folderId?: string }): Promise<DocumentRecord> {
  const pdf = await PDFDocument.create();
  for (let i = 0; i < Math.max(1, opts.pages); i += 1) drawTemplate(pdf.addPage([A4.width, A4.height]), opts.template);
  await FileSystem.makeDirectoryAsync(libraryDir(), { intermediates: true }).catch(() => {});
  const clean = opts.name.trim().replace(/[\\/:*?"<>|]/g, '_') || 'Notebook';
  const uri = `${libraryDir()}${Date.now()}-${clean.replace(/[^a-zA-Z0-9._-]/g, '_')}.pdf`;
  await FileSystem.writeAsStringAsync(uri, await pdf.saveAsBase64(), { encoding: FileSystem.EncodingType.Base64 });
  const info = await FileSystem.getInfoAsync(uri);
  const now = new Date().toISOString();
  const docs = await loadDocuments();
  const doc: DocumentRecord = {
    id: String(Date.now()), name: `${clean}.pdf`, uri, size: info.exists ? info.size : 0, createdAt: now, updatedAt: now, pages: Math.max(1, opts.pages),
    favorite: false, tags: [], folder: 'My Library', folderId: opts.folderId, progress: 0, accent: colors.lime, kind: 'notebook', template: opts.template,
  };
  await saveDocuments([doc, ...docs]);
  return doc;
}
