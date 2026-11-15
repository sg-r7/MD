import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '@/constants/theme';
import { loadDocuments, saveDocuments } from '@/lib/storage';
import type { DocumentRecord } from '@/types';

const accents = [colors.mint, colors.lime, colors.amber, '#B9A7FF', '#FF9FBD'];

/** content:// URIs rarely carry a file name, so use the last segment when it ends in .pdf and fall back to a dated name. */
const nameFromUri = (uri: string) => {
  try {
    const last = decodeURIComponent(uri.split('?')[0]!.split('/').pop() ?? '');
    if (/\.pdf$/i.test(last)) return last.replace(/[\\/:*?"<>|]/g, '_');
  } catch { /* fall through */ }
  return `Imported ${new Date().toISOString().slice(0, 10)}.pdf`;
};

/** Copies a PDF handed over by another app (content:// or file://) into the library and returns its record. */
export async function importPdfFromUri(uri: string): Promise<DocumentRecord> {
  const base = `${FileSystem.documentDirectory}library/`;
  await FileSystem.makeDirectoryAsync(base, { intermediates: true }).catch(() => {});
  const name = nameFromUri(uri);
  const destination = `${base}${Date.now()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  await FileSystem.copyAsync({ from: uri, to: destination });

  // A real PDF starts with "%PDF-", which is "JVBERi0" in base64.
  const head = await FileSystem.readAsStringAsync(destination, { encoding: FileSystem.EncodingType.Base64, position: 0, length: 8 }).catch(() => '');
  if (!head.startsWith('JVBERi')) {
    await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => {});
    throw new Error('The file is not a valid PDF.');
  }

  const info = await FileSystem.getInfoAsync(destination);
  const docs = await loadDocuments();
  const now = new Date().toISOString();
  const doc: DocumentRecord = {
    id: String(Date.now()), name, uri: destination, size: info.exists ? info.size : 0, createdAt: now, updatedAt: now,
    favorite: false, tags: ['Study'], folder: 'My Library', progress: 0, accent: accents[docs.length % accents.length] ?? colors.mint,
  };
  await saveDocuments([doc, ...docs]);
  return doc;
}
