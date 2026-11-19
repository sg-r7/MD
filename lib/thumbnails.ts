import * as FileSystem from 'expo-file-system/legacy';
import { PdfDocument } from 'react-native-better-pdf';
import type { DocumentRecord } from '@/types';

const dir = () => `${FileSystem.documentDirectory}thumbs/`;
let queue: Promise<unknown> = Promise.resolve();

/** First-page image used as the cover in the library. Cached on disk; renders one document at a time. */
export function ensureCover(doc: DocumentRecord): Promise<string | undefined> {
  const run = async () => {
    const target = `${dir()}${doc.id}-${doc.size}.jpg`;
    const existing = await FileSystem.getInfoAsync(target);
    if (existing.exists) return target;
    await FileSystem.makeDirectoryAsync(dir(), { intermediates: true }).catch(() => {});
    const pdf = await PdfDocument.open({ uri: doc.uri });
    try {
      const image = await pdf.renderPage(0, { width: 360, format: 'jpeg', quality: 0.75 });
      await FileSystem.copyAsync({ from: image.uri, to: target });
      await FileSystem.deleteAsync(image.uri, { idempotent: true }).catch(() => {});
      return target;
    } finally {
      pdf.close();
    }
  };
  const result = queue.then(run, run).catch(() => undefined);
  queue = result;
  return result;
}
