/* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps */
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { Stroke } from '@/types';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
type Point = { x: number; y: number };
type Props = { strokes: Stroke[]; width: number; height: number; tool: 'select' | 'pen' | 'highlight' | 'eraser'; color: string; strokeWidth: number; onStrokeComplete: (stroke: Stroke) => void };

/** GPU-rendered drawing layer with a live draft path and frame-coalesced touch updates. */
export function DrawingCanvas({ strokes, width, height, tool, color, strokeWidth, onStrokeComplete }: Props) {
  const pointsRef = useRef<Point[]>([]);
  const queuedPointRef = useRef<Point | null>(null);
  const frameRef = useRef<number | null>(null);
  const [draftPoints, setDraftPoints] = useState<Point[]>([]);

  const toPoint = (event: { nativeEvent: { locationX: number; locationY: number } }): Point => ({
    x: clamp(event.nativeEvent.locationX / Math.max(width, 1)),
    y: clamp(event.nativeEvent.locationY / Math.max(height, 1)),
  });

  const scheduleDraft = () => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (queuedPointRef.current) {
        pointsRef.current.push(queuedPointRef.current);
        queuedPointRef.current = null;
        setDraftPoints([...pointsRef.current]);
      }
    });
  };

  const paths = useMemo(() => {
    const makePath = (points: Point[]) => {
      if (!points.length) return null;
      const d = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * width} ${point.y * height}`).join(' ');
      return Skia.Path.MakeFromSVGString(d);
    };
    const saved = strokes.map((stroke) => {
      const path = makePath(stroke.points);
      return path ? { path, stroke } : null;
    }).filter((item): item is { path: NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>>; stroke: Stroke } => item !== null);
    const draftPath = makePath(draftPoints);
    return { saved, draftPath };
  }, [draftPoints, height, strokes, width]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'pen' || tool === 'highlight' || tool === 'eraser',
    onMoveShouldSetPanResponder: () => tool === 'pen' || tool === 'highlight' || tool === 'eraser',
    onPanResponderGrant: (event) => {
      const point = toPoint(event);
      pointsRef.current = [point];
      queuedPointRef.current = null;
      setDraftPoints([point]);
    },
    onPanResponderMove: (event) => {
      queuedPointRef.current = toPoint(event);
      scheduleDraft();
    },
    onPanResponderRelease: () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      const points = pointsRef.current;
      if (points.length > 1) {
        const strokeTool = tool === 'highlight' ? 'highlight' : tool === 'eraser' ? 'eraser' : 'pen';
        onStrokeComplete({ id: '', page: 0, color: strokeTool === 'eraser' ? '#46534E' : color, width: strokeTool === 'highlight' ? Math.max(strokeWidth * 2.8, 14) : strokeWidth, opacity: strokeTool === 'highlight' ? 0.34 : 1, points: [...points], tool: strokeTool });
      }
      pointsRef.current = [];
      queuedPointRef.current = null;
      setDraftPoints([]);
    },
    onPanResponderTerminate: () => {
      pointsRef.current = [];
      queuedPointRef.current = null;
      setDraftPoints([]);
    },
  }), [color, height, onStrokeComplete, strokeWidth, tool, width]);

  return <View pointerEvents={tool === 'select' ? 'none' : 'auto'} style={[styles.layer, { width, height }]} {...responder.panHandlers}>
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {paths.saved.map(({ path, stroke }) => <Path key={stroke.id} path={path} color={stroke.color} style="stroke" strokeWidth={stroke.width} opacity={stroke.opacity} strokeCap="round" strokeJoin="round" />)}
      {paths.draftPath && <Path path={paths.draftPath} color={tool === 'eraser' ? '#46534E' : color} style="stroke" strokeWidth={tool === 'highlight' ? Math.max(strokeWidth * 2.8, 14) : strokeWidth} opacity={tool === 'highlight' ? 0.34 : 1} strokeCap="round" strokeJoin="round" />}
    </Canvas>
  </View>;
}

const styles = StyleSheet.create({ layer: { position: 'absolute', left: 0, top: 0 } });
