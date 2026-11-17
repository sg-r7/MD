import type { Template } from '@/types';

export const templates: Template[] = ['blank', 'ruled', 'grid', 'dots'];
export const A4 = { width: 595, height: 842 } as const;

export type Shape =
  | { k: 'line'; x1: number; y1: number; x2: number; y2: number; width: number; color: [number, number, number] }
  | { k: 'dot'; x: number; y: number; r: number };

const FAINT: [number, number, number] = [0.74, 0.8, 0.88];
const MARGIN: [number, number, number] = [0.93, 0.55, 0.55];

/** Paper pattern as plain shapes (coordinates in points from the page's top-left), so it is easy to test and to draw. */
export function templateShapes(template: Template, w: number, h: number): Shape[] {
  const u = w / A4.width; // scale with page width
  const out: Shape[] = [];
  if (template === 'ruled') {
    const gap = 26 * u;
    for (let y = 64 * u; y < h - 36 * u; y += gap) out.push({ k: 'line', x1: 0, y1: y, x2: w, y2: y, width: 0.6, color: FAINT });
    out.push({ k: 'line', x1: 68 * u, y1: 0, x2: 68 * u, y2: h, width: 0.8, color: MARGIN });
  } else if (template === 'grid') {
    const gap = 20 * u;
    for (let x = gap; x < w; x += gap) out.push({ k: 'line', x1: x, y1: 0, x2: x, y2: h, width: 0.4, color: FAINT });
    for (let y = gap; y < h; y += gap) out.push({ k: 'line', x1: 0, y1: y, x2: w, y2: y, width: 0.4, color: FAINT });
  } else if (template === 'dots') {
    const gap = 20 * u;
    for (let y = gap; y < h; y += gap) for (let x = gap; x < w; x += gap) out.push({ k: 'dot', x, y, r: 0.9 * u });
  }
  return out;
}
