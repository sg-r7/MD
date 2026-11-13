/* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps */
import { Canvas, DashPathEffect, Group, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { clamp01, strokePathD, strokesBounds } from '@/lib/geometry';
import type { Point, Stroke, StrokeTool } from '@/types';

export type CanvasTool = 'select' | 'pen' | 'highlight' | 'eraser' | 'shape' | 'ruler' | 'lasso';
export type ShapeKind = 'rect' | 'ellipse' | 'arrow' | 'line';
export type DraftStroke = Pick<Stroke, 'tool' | 'color' | 'width' | 'opacity' | 'points'>;

type Props = {
  strokes: Stroke[]; width: number; height: number; tool: CanvasTool; shapeKind: ShapeKind; color: string; strokeWidth: number; selectedIds: string[];
  onStroke: (stroke: DraftStroke) => void; onErase: (points: Point[]) => void; onLasso: (polygon: Point[]) => void; onMoveSelection: (dx: number, dy: number) => void;
};

const LASSO = '#34D399';
const styleFor = (tool: CanvasTool, shape: ShapeKind, width: number): { tool: StrokeTool; width: number; opacity: number } => {
  if (tool === 'highlight') return { tool: 'highlight', width: Math.max(width * 2.8, 14), opacity: 0.34 };
  if (tool === 'shape') return { tool: shape, width, opacity: 1 };
  if (tool === 'ruler') return { tool: 'line', width, opacity: 1 };
  return { tool: 'pen', width, opacity: 1 };
};
const polyline = (pts: Point[], w: number, h: number) => (pts.length === 1 ? `M ${pts[0]!.x * w} ${pts[0]!.y * h} L ${pts[0]!.x * w + 0.01} ${pts[0]!.y * h}` : pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x * w} ${p.y * h}`).join(' '));

/** GPU-rendered annotation layer: pen, marker, eraser, shapes, ruler and lasso (select + move). */
export function DrawingCanvas(props: Props) {
  const { strokes, width, height, tool, shapeKind, color, strokeWidth, selectedIds } = props;
  const P = useRef(props); P.current = props;
  const pts = useRef<Point[]>([]);
  const start = useRef<Point>({ x: 0, y: 0 });
  const mode = useRef<'draw' | 'move'>('draw');
  const latest = useRef<Point | null>(null);
  const frame = useRef<number | null>(null);
  const offsetRef = useRef<Point>({ x: 0, y: 0 });
  const boundsRef = useRef<ReturnType<typeof strokesBounds>>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  const selected = useMemo(() => strokes.filter((s) => selectedIds.includes(s.id)), [strokes, selectedIds]);
  const others = useMemo(() => strokes.filter((s) => !selectedIds.includes(s.id)), [strokes, selectedIds]);
  const bounds = useMemo(() => strokesBounds(selected), [selected]);
  boundsRef.current = bounds;

  const toPoint = (e: { nativeEvent: { locationX: number; locationY: number } }): Point => ({
    x: clamp01(e.nativeEvent.locationX / Math.max(P.current.width, 1)),
    y: clamp01(e.nativeEvent.locationY / Math.max(P.current.height, 1)),
  });
  const snap = (a: Point, b: Point): Point => {
    const w = P.current.width; const h = P.current.height;
    const dx = (b.x - a.x) * w; const dy = (b.y - a.y) * h; const step = Math.PI / 12;
    const ang = Math.round(Math.atan2(dy, dx) / step) * step; const len = Math.hypot(dx, dy);
    return { x: clamp01(a.x + (Math.cos(ang) * len) / w), y: clamp01(a.y + (Math.sin(ang) * len) / h) };
  };

  const flush = () => {
    frame.current = null;
    const p = latest.current;
    if (!p) return;
    latest.current = null;
    const t = P.current.tool;
    if (mode.current === 'move') { const o = { x: p.x - start.current.x, y: p.y - start.current.y }; offsetRef.current = o; setOffset(o); return; }
    if (t === 'shape' || t === 'ruler') { pts.current = [start.current, t === 'ruler' ? snap(start.current, p) : p]; setDraft(pts.current); return; }
    pts.current.push(p);
    setDraft([...pts.current]);
  };
  const reset = () => { pts.current = []; latest.current = null; offsetRef.current = { x: 0, y: 0 }; setDraft([]); setOffset({ x: 0, y: 0 }); };

  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => P.current.tool !== 'select',
    onMoveShouldSetPanResponder: () => P.current.tool !== 'select',
    onPanResponderGrant: (e) => {
      const pt = toPoint(e); const b = boundsRef.current;
      start.current = pt; latest.current = null; offsetRef.current = { x: 0, y: 0 };
      const inside = !!b && pt.x >= b.minX - 0.02 && pt.x <= b.maxX + 0.02 && pt.y >= b.minY - 0.02 && pt.y <= b.maxY + 0.02;
      mode.current = P.current.tool === 'lasso' && inside ? 'move' : 'draw';
      pts.current = mode.current === 'move' ? [] : [pt];
      setDraft(pts.current);
    },
    onPanResponderMove: (e) => {
      latest.current = toPoint(e);
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    },
    onPanResponderRelease: () => {
      if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
      flush();
      const p = P.current; const t = p.tool; const points = pts.current;
      if (mode.current === 'move') {
        const o = offsetRef.current;
        if (Math.hypot(o.x * p.width, o.y * p.height) > 2) p.onMoveSelection(o.x, o.y);
      } else if (t === 'lasso') p.onLasso(points.length > 2 ? [...points] : []);
      else if (t === 'eraser') p.onErase([...points]);
      else if (t === 'shape' || t === 'ruler') {
        const [a, b] = points;
        if (a && b && Math.hypot((b.x - a.x) * p.width, (b.y - a.y) * p.height) > 6) p.onStroke({ ...styleFor(t, p.shapeKind, p.strokeWidth), color: p.color, points: [a, b] });
      } else if (points.length > 0) p.onStroke({ ...styleFor(t, p.shapeKind, p.strokeWidth), color: p.color, points: [...points] });
      reset();
    },
    onPanResponderTerminate: reset,
  }));

  const toPx = (p: Point) => ({ x: p.x * width, y: p.y * height });
  const build = (list: Stroke[]) => list.flatMap((stroke) => {
    const path = Skia.Path.MakeFromSVGString(strokePathD(stroke, toPx));
    return path ? [{ path, stroke }] : [];
  });
  const plain = useMemo(() => build(others), [others, width, height]);
  const chosen = useMemo(() => build(selected), [selected, width, height]);
  const draftPath = useMemo(() => {
    if (!draft.length) return null;
    if (tool === 'lasso') return Skia.Path.MakeFromSVGString(`${polyline(draft, width, height)} Z`);
    if (tool === 'eraser') return Skia.Path.MakeFromSVGString(polyline(draft, width, height));
    return Skia.Path.MakeFromSVGString(strokePathD({ id: 'draft', page: 0, color, ...styleFor(tool, shapeKind, strokeWidth), points: draft }, toPx));
  }, [draft, tool, shapeKind, color, strokeWidth, width, height]);
  const boxPath = useMemo(() => {
    if (!bounds) return null;
    const x1 = bounds.minX * width - 8; const y1 = bounds.minY * height - 8; const x2 = bounds.maxX * width + 8; const y2 = bounds.maxY * height + 8;
    return Skia.Path.MakeFromSVGString(`M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2} L ${x1} ${y2} Z`);
  }, [bounds, width, height]);

  const draftStyle = styleFor(tool, shapeKind, strokeWidth);
  return (
    <View pointerEvents={tool === 'select' ? 'none' : 'auto'} style={[styles.layer, { width, height }]} {...responder.panHandlers}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {plain.map(({ path, stroke }) => <Path key={stroke.id} path={path} color={stroke.color} style="stroke" strokeWidth={stroke.width} opacity={stroke.opacity} strokeCap="round" strokeJoin="round" />)}
        <Group transform={[{ translateX: offset.x * width }, { translateY: offset.y * height }]}>
          {chosen.map(({ path, stroke }) => <Path key={stroke.id} path={path} color={stroke.color} style="stroke" strokeWidth={stroke.width} opacity={stroke.opacity} strokeCap="round" strokeJoin="round" />)}
          {boxPath && <Path path={boxPath} color={LASSO} style="stroke" strokeWidth={1.5}><DashPathEffect intervals={[6, 4]} /></Path>}
        </Group>
        {draftPath && tool === 'lasso' && <Path path={draftPath} color={LASSO} style="stroke" strokeWidth={2}><DashPathEffect intervals={[8, 6]} /></Path>}
        {draftPath && tool === 'eraser' && <Path path={draftPath} color="rgba(255,255,255,0.55)" style="stroke" strokeWidth={24} strokeCap="round" strokeJoin="round" />}
        {draftPath && tool !== 'lasso' && tool !== 'eraser' && <Path path={draftPath} color={color} style="stroke" strokeWidth={draftStyle.width} opacity={draftStyle.opacity} strokeCap="round" strokeJoin="round" />}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({ layer: { position: 'absolute', left: 0, top: 0 } });
