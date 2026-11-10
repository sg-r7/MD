/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import type { Stroke } from '@/types';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

type Props = {
  strokes: Stroke[];
  width: number;
  height: number;
  tool: 'select' | 'pen' | 'highlight' | 'eraser';
  color: string;
  strokeWidth: number;
  onStrokeComplete: (stroke: Stroke) => void;
};

/** A lightweight, normalized drawing layer. Coordinates stay stable across rotation and zoom. */
export function DrawingCanvas({ strokes, width, height, tool, color, strokeWidth, onStrokeComplete }: Props) {
  const currentPoints = useMemo(() => ({ value: [] as { x: number; y: number }[] }), []);
  const paths = useMemo(
    () => strokes.map((stroke) => {
      const d = stroke.points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x * width} ${point.y * height}`).join(' ');
      const path = Skia.Path.MakeFromSVGString(d);
      return path ? { path, stroke } : null;
    }).filter((item): item is { path: NonNullable<ReturnType<typeof Skia.Path.MakeFromSVGString>>; stroke: Stroke } => item !== null),
    [strokes, width, height],
  );

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'pen' || tool === 'highlight' || tool === 'eraser',
    onMoveShouldSetPanResponder: () => tool === 'pen' || tool === 'highlight' || tool === 'eraser',
    onPanResponderGrant: (event) => {
      currentPoints.value = [{
        x: clamp(event.nativeEvent.locationX / Math.max(width, 1)),
        y: clamp(event.nativeEvent.locationY / Math.max(height, 1)),
      }];
    },
    onPanResponderMove: (event) => {
      currentPoints.value.push({
        x: clamp(event.nativeEvent.locationX / Math.max(width, 1)),
        y: clamp(event.nativeEvent.locationY / Math.max(height, 1)),
      });
    },
    onPanResponderRelease: () => {
      if (currentPoints.value.length > 1) {
        const strokeTool = tool === 'highlight' ? 'highlight' : tool === 'eraser' ? 'eraser' : 'pen';
        onStrokeComplete({
          id: '',
          page: 0,
          color: strokeTool === 'eraser' ? '#46534E' : color,
          width: strokeTool === 'highlight' ? Math.max(strokeWidth * 2.8, 14) : strokeWidth,
          opacity: strokeTool === 'highlight' ? 0.34 : 1,
          points: currentPoints.value,
          tool: strokeTool,
        });
      }
      currentPoints.value = [];
    },
  }), [color, height, onStrokeComplete, strokeWidth, tool, width]);

  return (
    <View pointerEvents={tool === 'select' ? 'none' : 'auto'} style={[styles.layer, { width, height }]} {...responder.panHandlers}>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {paths.map(({ path, stroke }) => (
          <Path key={stroke.id} path={path} color={stroke.color} style="stroke" strokeWidth={stroke.width} opacity={stroke.opacity} strokeCap="round" strokeJoin="round" />
        ))}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({ layer: { position: 'absolute', left: 0, top: 0 } });
