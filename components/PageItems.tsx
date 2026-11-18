/* eslint-disable react-hooks/refs */
import { useRef, useState, type PropsWithChildren } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { clamp01 } from '@/lib/geometry';
import type { ImageItem, StickyNote } from '@/types';

export type ItemKind = 'note' | 'image';
export const STICKER_SIZE = 0.12; // fraction of the page width
type Props = {
  notes: StickyNote[]; images: ImageItem[];
  /** Measured size of the page layer in px (it changes with zoom on some platforms). */
  width: number; height: number;
  /** On-screen width of the page in px: viewer width x zoom. Used to turn finger movement into page fractions. */
  screenWidth: number; interactive: boolean;
  onMove: (kind: ItemKind, id: string, x: number, y: number) => void; onPress: (kind: ItemKind, id: string) => void;
};

type DragProps = PropsWithChildren<{ x: number; y: number; width: number; height: number; screenWidth: number; onCommit: (x: number, y: number) => void; onPress: () => void }>;

function Draggable(props: DragProps) {
  const P = useRef(props); P.current = props;
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      const k = Math.max(P.current.screenWidth, 1) / Math.max(P.current.width, 1); // screen px per layer px
      setDrag({ dx: g.dx / k, dy: g.dy / k });
    },
    onPanResponderRelease: (_, g) => {
      const p = P.current; setDrag(null);
      if (Math.hypot(g.dx, g.dy) < 6) { p.onPress(); return; }
      const w = Math.max(p.screenWidth, 1); const h = w * (p.height / Math.max(p.width, 1));
      p.onCommit(clamp01(p.x + g.dx / w), clamp01(p.y + g.dy / h));
    },
    onPanResponderTerminate: () => setDrag(null),
  }));
  return <View {...responder.panHandlers} style={[styles.item, { left: props.x * props.width + (drag?.dx ?? 0), top: props.y * props.height + (drag?.dy ?? 0) }]}>{props.children}</View>;
}

/** Sticky notes, stickers and images attached to a page. Everything scales with the page width. */
export function PageItems({ notes, images, width, height, screenWidth, interactive, onMove, onPress }: Props) {
  return (
    <View pointerEvents={interactive ? 'box-none' : 'none'} style={StyleSheet.absoluteFill}>
      {images.map((item) => (
        <Draggable key={item.id} x={item.x} y={item.y} width={width} height={height} screenWidth={screenWidth} onCommit={(x, y) => onMove('image', item.id, x, y)} onPress={() => onPress('image', item.id)}>
          <Image source={{ uri: item.uri }} style={{ width: item.w * width, height: (item.w * width) / item.aspect, borderRadius: 4 }} resizeMode="contain" />
        </Draggable>
      ))}
      {notes.map((note) => (
        <Draggable key={note.id} x={note.x} y={note.y} width={width} height={height} screenWidth={screenWidth} onCommit={(x, y) => onMove('note', note.id, x, y)} onPress={() => onPress('note', note.id)}>
          {note.kind === 'sticker'
            ? <Text style={{ fontSize: (note.size ?? STICKER_SIZE) * width }}>{note.text}</Text>
            : (
              <View style={[styles.note, { backgroundColor: note.color, width: width * 0.42, padding: width * 0.028, borderRadius: width * 0.012 }]}>
                <Text numberOfLines={9} style={{ color: '#3B2F0B', fontSize: width * 0.036, lineHeight: width * 0.05 }}>{note.text}</Text>
              </View>
            )}
        </Draggable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute' },
  note: { shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
});
