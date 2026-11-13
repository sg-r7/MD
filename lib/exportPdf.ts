import * as FileSystem from 'expo-file-system/legacy';
import { LineCapStyle, PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { strokePathD } from '@/lib/geometry';
import type { AnnotationState, DocumentRecord } from '@/types';

const hexToRgb = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  const n = m ? parseInt(m[1]!, 16) : 0;
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
// Helvetica (WinAnsi) cannot draw Arabic/CJK/emoji; such text is replaced by a marker.
const encodable = (text: string) => text.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '\u0001');

/**
 * Flattens strokes, shapes, notes and images into a copy of the PDF.
 * Assumes the reader shows each page fitted and centred in the viewport (fitPolicy BOTH, paging on).
 */
export async function exportAnnotatedPdf(doc: DocumentRecord, ann: AnnotationState): Promise<string> {
  const view = ann.view;
  if (!view || view.width < 1 || view.height < 1) throw new Error('Open the document and annotate it before exporting.');
  const base64 = await FileSystem.readAsStringAsync(doc.uri, { encoding: FileSystem.EncodingType.Base64 });
  const pdf = await PDFDocument.load(base64);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();

  for (let index = 0; index < pages.length; index += 1) {
    const pageNo = index + 1;
    const strokes = ann.strokes.filter((s) => s.page === pageNo);
    const notes = ann.notes.filter((n) => n.page === pageNo && n.kind !== 'sticker');
    const images = ann.images.filter((i) => i.page === pageNo);
    if (!strokes.length && !notes.length && !images.length) continue;

    const page = pages[index]!;
    const { width: pw, height: ph } = page.getSize();
    const s = Math.min(view.width / pw, view.height / ph);
    const ox = (view.width - pw * s) / 2; const oy = (view.height - ph * s) / 2;
    const top = (p: { x: number; y: number }) => ({ x: (p.x * view.width - ox) / s, y: (p.y * view.height - oy) / s });

    for (const stroke of strokes) {
      const d = strokePathD(stroke, top, 1 / s);
      if (!d) continue;
      page.drawSvgPath(d, { x: 0, y: ph, borderColor: hexToRgb(stroke.color), borderWidth: stroke.width / s, borderOpacity: stroke.opacity, borderLineCap: LineCapStyle.Round });
    }

    for (const item of images) {
      const ext = item.uri.split('?')[0]!.split('.').pop()?.toLowerCase();
      try {
        const data = await FileSystem.readAsStringAsync(item.uri, { encoding: FileSystem.EncodingType.Base64 });
        const img = ext === 'png' ? await pdf.embedPng(data) : await pdf.embedJpg(data);
        const w = (item.w * view.width) / s; const h = w / item.aspect; const p = top({ x: item.x, y: item.y });
        page.drawImage(img, { x: p.x, y: ph - p.y - h, width: w, height: h });
      } catch { /* unsupported image type (e.g. WebP/HEIC): skipped */ }
    }

    for (const note of notes) {
      const text = encodable(note.text);
      const unreadable = (text.match(/\u0001/g)?.length ?? 0) > text.length * 0.3;
      const fontSize = 11 / s; const boxW = 150 / s; const pad = 8 / s;
      const lines: string[] = [];
      if (!unreadable) {
        text.split('\n').forEach((para) => {
          let line = '';
          para.split(' ').forEach((word) => {
            const tryLine = line ? `${line} ${word}` : word;
            if (font.widthOfTextAtSize(tryLine.replace(/\u0001/g, '?'), fontSize) > boxW - pad * 2 && line) { lines.push(line); line = word; } else line = tryLine;
          });
          lines.push(line);
        });
      }
      const shown = unreadable ? ['[note - see app]'] : lines.slice(0, 10).map((l) => l.replace(/\u0001/g, '?'));
      const boxH = pad * 2 + shown.length * fontSize * 1.25;
      const p = top({ x: note.x, y: note.y });
      page.drawRectangle({ x: p.x, y: ph - p.y - boxH, width: boxW, height: boxH, color: hexToRgb(note.color), borderColor: rgb(0.8, 0.65, 0.1), borderWidth: 0.6 / s });
      shown.forEach((line, i) => page.drawText(line, { x: p.x + pad, y: ph - p.y - pad - fontSize * (1 + i * 1.25), size: fontSize, font, color: rgb(0.23, 0.18, 0.04) }));
    }
  }

  const out = await pdf.saveAsBase64();
  const name = doc.name.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'document';
  const path = `${FileSystem.cacheDirectory}${name}-annotated.pdf`;
  await FileSystem.writeAsStringAsync(path, out, { encoding: FileSystem.EncodingType.Base64 });
  return path;
}
