/* eslint-disable react-hooks/refs */
import { useRef, useState, type PropsWithChildren } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { clamp01 } from '@/lib/geometry';
import type { ImageItem, StickyNote } from '@/types';

export type ItemKind = 'note' | 'image';
type Props = {
  notes: StickyNote[]; images: ImageItem[]; width: number; height: number; zoom: number; interactive: boolean;
  onMove: (kind: ItemKind, id: string, x: number, y: number) => void; onPress: (kind: ItemKind, id: string) => void;
};

type DragProps = PropsWithChildren<{ x: number; y: number; width: number; height: number; zoom: number; onCommit: (x: number, y: number) => void; onPress: () => void }>;

function Draggable(props: DragProps) {
  const P = useRef(props); P.current = props;
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => setDrag({ dx: g.dx / P.current.zoom, dy: g.dy / P.current.zoom }),
    onPanResponderRelease: (_, g) => {
      const p = P.current;
      setDrag(null);
      if (Math.hypot(g.dx, g.dy) < 6) { p.onPress(); return; }
      p.onCommit(clamp01(p.x + g.dx / p.zoom / p.width), clamp01(p.y + g.dy / p.zoom / p.height));
    },
    onPanResponderTerminate: () => setDrag(null),
  }));
  return <View {...responder.panHandlers} style={[styles.item, { left: props.x * props.width + (drag?.dx ?? 0), top: props.y * props.height + (drag?.dy ?? 0) }]}>{props.children}</View>;
}

/** Sticky notes, stickers and images that sit above the PDF page and can be dragged or tapped. */
export function PageItems({ notes, images, width, height, zoom, interactive, onMove, onPress }: Props) {
  return (
    <View pointerEvents={interactive ? 'box-none' : 'none'} style={StyleSheet.absoluteFill}>
      {images.map((item) => (
        <Draggable key={item.id} x={item.x} y={item.y} width={width} height={height} zoom={zoom} onCommit={(x, y) => onMove('image', item.id, x, y)} onPress={() => onPress('image', item.id)}>
          <Image source={{ uri: item.uri }} style={{ width: item.w * width, height: (item.w * width) / item.aspect, borderRadius: 4 }} resizeMode="contain" />
        </Draggable>
      ))}
      {notes.map((note) => (
        <Draggable key={note.id} x={note.x} y={note.y} width={width} height={height} zoom={zoom} onCommit={(x, y) => onMove('note', note.id, x, y)} onPress={() => onPress('note', note.id)}>
          {note.kind === 'sticker'
            ? <Text style={{ fontSize: note.size ?? 44 }}>{note.text}</Text>
            : <View style={[styles.note, { backgroundColor: note.color }]}><Text numberOfLines={9} style={styles.noteText}>{note.text}</Text></View>}
        </Draggable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { position: 'absolute' },
  note: { width: 150, padding: 10, borderRadius: 6, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  noteText: { color: '#3B2F0B', fontSize: 13, lineHeight: 18 },
});
