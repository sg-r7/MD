import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DrawingCanvas, type CanvasTool, type DraftStroke, type ShapeKind } from '@/components/DrawingCanvas';
import { PageItems, type ItemKind } from '@/components/PageItems';
import type { ImageItem, Point, StickyNote, Stroke } from '@/types';

type Props = {
  page: number; strokes: Stroke[]; notes: StickyNote[]; images: ImageItem[];
  tool: CanvasTool; shapeKind: ShapeKind; color: string; strokeWidth: number; selectedIds: string[];
  interactive: boolean; screenWidth: number;
  onStroke: (page: number, stroke: DraftStroke) => void;
  onErase: (page: number, points: Point[], width: number, height: number) => void;
  onLasso: (page: number, polygon: Point[]) => void;
  onMoveSelection: (dx: number, dy: number) => void;
  onItemMove: (kind: ItemKind, id: string, x: number, y: number) => void;
  onItemPress: (kind: ItemKind, id: string) => void;
};

/**
 * Lives inside a PdfPageOverlay, so the viewer moves and scales it together with its page. Its size is measured
 * (not assumed) because some platforms re-lay overlays out at the zoomed size; all stored data is page fractions.
 */
export function PageLayer(p: Props) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  return (
    <View style={StyleSheet.absoluteFill} onLayout={(e) => setBox({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {box.width > 0 && box.height > 0 && (
        <>
          <DrawingCanvas
            strokes={p.strokes} width={box.width} height={box.height} tool={p.tool} shapeKind={p.shapeKind} color={p.color} strokeWidth={p.strokeWidth} selectedIds={p.selectedIds}
            onStroke={(draft) => p.onStroke(p.page, draft)} onErase={(points) => p.onErase(p.page, points, box.width, box.height)}
            onLasso={(polygon) => p.onLasso(p.page, polygon)} onMoveSelection={p.onMoveSelection}
          />
          <PageItems notes={p.notes} images={p.images} width={box.width} height={box.height} screenWidth={p.screenWidth} interactive={p.interactive} onMove={p.onItemMove} onPress={p.onItemPress} />
        </>
      )}
    </View>
  );
}
