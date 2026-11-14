import * as FileSystem from 'expo-file-system/legacy';
import type { AnnotationState, DocumentRecord } from '@/types';

/** Builds a Markdown file from the study note plus every sticky note (grouped by page). Returns null when empty. */
export async function exportNotesMarkdown(doc: DocumentRecord, markdown: string, ann: AnnotationState, t: (key: string, vars?: Record<string, string | number>) => string) {
  const stickies = ann.notes.filter((n) => n.kind !== 'sticker').sort((a, b) => a.page - b.page);
  if (!markdown.trim() && !stickies.length) return null;
  let out = `# ${doc.name.replace(/\.pdf$/i, '')}\n\n`;
  if (markdown.trim()) out += `## ${t('Study notes')}\n\n${markdown.trim()}\n\n`;
  if (stickies.length) {
    out += `## ${t('Sticky notes')}\n\n`;
    stickies.forEach((n) => { out += `- **${t('Page {n}', { n: n.page })}**: ${n.text.replace(/\s*\n+\s*/g, ' ')}\n`; });
  }
  const safe = doc.name.replace(/\.pdf$/i, '').replace(/[^\p{L}\p{N}._-]/gu, '_') || 'notes';
  const path = `${FileSystem.cacheDirectory}${safe}-notes.md`;
  await FileSystem.writeAsStringAsync(path, out, { encoding: FileSystem.EncodingType.UTF8 });
  return path;
}
