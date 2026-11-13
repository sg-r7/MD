import type { Point, Stroke } from '@/types';

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const f = (n: number) => Math.round(n * 100) / 100;

/** SVG path for a stroke, shared by the Skia canvas and the PDF exporter. `unit` scales arrow heads. */
export function strokePathD(stroke: Stroke, map: (p: Point) => Point, unit = 1): string {
  const pts = stroke.points.map(map);
  const a = pts[0]; const b = pts[pts.length - 1];
  if (!a || !b) return '';
  switch (stroke.tool) {
    case 'rect':
      return `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)} L ${f(a.x)} ${f(b.y)} Z`;
    case 'ellipse': {
      const cx = (a.x + b.x) / 2; const cy = (a.y + b.y) / 2;
      const rx = Math.max(Math.abs(b.x - a.x) / 2, 0.5); const ry = Math.max(Math.abs(b.y - a.y) / 2, 0.5);
      return `M ${f(cx - rx)} ${f(cy)} A ${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A ${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
    }
    case 'line':
      return `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`;
    case 'arrow': {
      const ang = Math.atan2(b.y - a.y, b.x - a.x); const head = (stroke.width * 3 + 9) * unit; const spread = Math.PI / 7;
      const h1 = { x: b.x - head * Math.cos(ang - spread), y: b.y - head * Math.sin(ang - spread) };
      const h2 = { x: b.x - head * Math.cos(ang + spread), y: b.y - head * Math.sin(ang + spread) };
      return `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)} M ${f(h1.x)} ${f(h1.y)} L ${f(b.x)} ${f(b.y)} L ${f(h2.x)} ${f(h2.y)}`;
    }
    default: {
      if (pts.length === 1) return `M ${f(a.x)} ${f(a.y)} L ${f(a.x + 0.01)} ${f(a.y)}`;
      if (pts.length === 2) return `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`;
      let d = `M ${f(a.x)} ${f(a.y)}`;
      for (let i = 1; i < pts.length - 1; i += 1) {
        const p = pts[i]!; const n = pts[i + 1]!;
        d += ` Q ${f(p.x)} ${f(p.y)} ${f((p.x + n.x) / 2)} ${f((p.y + n.y) / 2)}`;
      }
      return `${d} L ${f(b.x)} ${f(b.y)}`;
    }
  }
}

export function strokeSegments(s: Stroke): [Point, Point][] {
  const p = s.points; const a = p[0]; const b = p[p.length - 1];
  if (!a || !b) return [];
  if (s.tool === 'rect') {
    const c = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }];
    return c.map((q, i) => [q, c[(i + 1) % 4]!] as [Point, Point]);
  }
  if (s.tool === 'ellipse') {
    const cx = (a.x + b.x) / 2; const cy = (a.y + b.y) / 2; const rx = Math.abs(b.x - a.x) / 2; const ry = Math.abs(b.y - a.y) / 2;
    const ring = Array.from({ length: 28 }, (_, i) => ({ x: cx + rx * Math.cos((i / 28) * Math.PI * 2), y: cy + ry * Math.sin((i / 28) * Math.PI * 2) }));
    return ring.map((q, i) => [q, ring[(i + 1) % 28]!] as [Point, Point]);
  }
  if (s.tool === 'line' || s.tool === 'arrow') return [[a, b]];
  if (p.length === 1) return [[a, a]];
  return p.slice(1).map((q, i) => [p[i]!, q] as [Point, Point]);
}

export function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x; const dy = b.y - a.y; const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** True when the eraser path (normalised points) passes within `radius` px of the stroke. */
export function strokeHit(s: Stroke, probe: Point[], w: number, h: number, radius: number) {
  const r = radius + s.width / 2;
  const px = (q: Point) => ({ x: q.x * w, y: q.y * h });
  const segs = strokeSegments(s).map(([p, q]) => [px(p), px(q)] as [Point, Point]);
  const dense: Point[] = [];
  probe.map(px).forEach((c, i, all) => {
    const prev = all[i - 1];
    if (prev) { const n = Math.ceil(Math.hypot(c.x - prev.x, c.y - prev.y) / Math.max(r / 2, 1)); for (let k = 1; k < n; k += 1) dense.push({ x: prev.x + ((c.x - prev.x) * k) / n, y: prev.y + ((c.y - prev.y) * k) / n }); }
    dense.push(c);
  });
  return dense.some((c) => segs.some(([p, q]) => distToSegment(c, p, q) <= r));
}

export function pointInPolygon(p: Point, poly: Point[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const a = poly[i]!; const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

export function strokeInside(s: Stroke, poly: Point[], ratio = 0.6) {
  const verts = strokeSegments(s).flatMap(([p]) => [p]);
  const last = strokeSegments(s).at(-1)?.[1];
  if (last) verts.push(last);
  if (!verts.length) return false;
  return verts.filter((v) => pointInPolygon(v, poly)).length / verts.length >= ratio;
}

export function strokesBounds(list: Stroke[]) {
  let minX = 1; let minY = 1; let maxX = 0; let maxY = 0; let any = false;
  list.forEach((s) => strokeSegments(s).forEach(([p, q]) => [p, q].forEach((v) => { any = true; minX = Math.min(minX, v.x); minY = Math.min(minY, v.y); maxX = Math.max(maxX, v.x); maxY = Math.max(maxY, v.y); })));
  return any ? { minX, minY, maxX, maxY } : null;
}

export const translateStroke = (s: Stroke, dx: number, dy: number): Stroke => ({ ...s, points: s.points.map((p) => ({ x: clamp01(p.x + dx), y: clamp01(p.y + dy) })) });
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
