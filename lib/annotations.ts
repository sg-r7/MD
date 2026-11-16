import type { AnnotationState, Point } from '@/types';

/** A page is PAGE_UNITS wide for stroke widths, whatever its real size or zoom. */
export const PAGE_UNITS = 600;

type PageSize = { width: number; height: number };

/**
 * Annotations made before the continuous reader were stored as fractions of the screen, with the page fitted
 * and centred in it. This converts them to fractions of the page so they stay attached to it while scrolling.
 */
export function migrateToPageSpace(a: AnnotationState, sizes: PageSize[]): AnnotationState {
  if (a.version === 2) return a;
  const view = a.view;
  const hasContent = a.strokes.length + a.notes.length + a.images.length > 0;
  if (!hasContent || !view || view.width < 1 || view.height < 1) return { ...a, version: 2, view: undefined };

  const frame = (page: number) => {
    const size = sizes[page - 1];
    if (!size) return undefined;
    const s = Math.min(view.width / size.width, view.height / size.height);
    return { s, ox: (view.width - size.width * s) / 2, oy: (view.height - size.height * s) / 2, pw: size.width * s, ph: size.height * s };
  };
  type Frame = NonNullable<ReturnType<typeof frame>>;
  const point = (f: Frame, p: Point): Point => ({ x: (p.x * view.width - f.ox) / f.pw, y: (p.y * view.height - f.oy) / f.ph });

  return {
    version: 2,
    strokes: a.strokes.map((s) => {
      const f = frame(s.page);
      return f ? { ...s, points: s.points.map((p) => point(f, p)), width: (s.width * PAGE_UNITS) / f.pw } : s;
    }),
    notes: a.notes.map((n) => {
      const f = frame(n.page);
      if (!f) return n;
      const p = point(f, { x: n.x, y: n.y });
      return { ...n, x: p.x, y: p.y, size: n.kind === 'sticker' ? (n.size ?? 44) / f.pw : n.size };
    }),
    images: a.images.map((i) => {
      const f = frame(i.page);
      if (!f) return i;
      const p = point(f, { x: i.x, y: i.y });
      return { ...i, x: p.x, y: p.y, w: (i.w * view.width) / f.pw };
    }),
  };
}
