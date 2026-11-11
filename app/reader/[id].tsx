import { useEffect, useMemo, useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Pdf from 'react-native-pdf';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { loadAnnotations, loadDocuments, saveAnnotations } from '@/lib/storage';
import type { AnnotationState, DocumentRecord, Stroke } from '@/types';
import { DrawingCanvas } from '@/components/DrawingCanvas';
import { ToolBar, Tool } from '@/components/ToolBar';

const inkColors = ['#1D2925', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];
const strokeSizes = [2, 4, 7, 11];

export default function Reader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentRecord>();
  const [annotations, setAnnotations] = useState<AnnotationState>({ strokes: [], notes: [] });
  const [tool, setTool] = useState<Tool>('select');
  const [page, setPage] = useState(1);
  const [color, setColor] = useState('#1D2925');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [size, setSize] = useState({ width: Dimensions.get('window').width, height: Dimensions.get('window').height - 170 });
  const [showMore, setShowMore] = useState(false);
  const [showPages, setShowPages] = useState(false);

  useEffect(() => {
    loadDocuments().then((documents) => setDoc(documents.find((item) => item.id === id)));
    loadAnnotations(id).then(setAnnotations);
  }, [id]);

  useEffect(() => {
    if (id) void saveAnnotations(id, annotations);
  }, [annotations, id]);

  const currentStrokes = useMemo(() => annotations.strokes.filter((stroke) => stroke.page === page), [annotations.strokes, page]);
  const drawingTool = tool === 'pen' || tool === 'highlight' || tool === 'eraser' ? tool : 'select';
  const pageCount = Math.max(doc?.pages ?? 1, page);

  const share = async () => {
    if (doc && await Sharing.isAvailableAsync()) await Sharing.shareAsync(doc.uri, { dialogTitle: 'Share annotated document' });
  };

  const addStroke = (stroke: Stroke) => {
    if (stroke.tool === 'eraser') {
      const hit = (point: { x: number; y: number }) => stroke.points.some((candidate) => Math.hypot(candidate.x - point.x, candidate.y - point.y) < 0.035);
      setAnnotations((state) => ({ ...state, strokes: state.strokes.filter((item) => item.page !== page || !item.points.some(hit)) }));
      return;
    }
    setAnnotations((state) => ({ ...state, strokes: [...state.strokes, { ...stroke, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, page }] }));
  };

  const chooseTool = (next: Tool) => {
    setTool(next);
    if (next === 'text') {
      router.push('/editor');
      return;
    }
    if (['shape', 'lasso', 'text', 'image', 'sticker', 'ruler', 'magnifier'].includes(next)) {
      Alert.alert(next.slice(0, 1).toUpperCase() + next.slice(1), 'This workspace is ready for the next tool module.');
    }
  };

  if (!doc) return <View style={styles.loading}><Text style={styles.loadingText}>Opening document…</Text></View>;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.headerButton}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
        <View style={styles.heading}><Text numberOfLines={1} style={styles.title}>{doc.name}</Text><Text style={styles.subtitle}>MD workspace  ·  {page}/{pageCount}</Text></View>
        <Pressable onPress={() => setShowPages(true)} style={styles.headerButton}><Ionicons name="grid-outline" size={21} color={colors.mint} /></Pressable>
        <Pressable onPress={() => setShowMore(true)} style={styles.headerButton}><Ionicons name="ellipsis-vertical" size={21} color={colors.mint} /></Pressable>
      </View>

      {(tool === 'pen' || tool === 'highlight') && <View style={styles.options}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsContent}><Text style={styles.optionTitle}>Color</Text>{inkColors.map((item) => <Pressable key={item} onPress={() => setColor(item)} style={[styles.color, { backgroundColor: item }, color === item && styles.selectedColor]} />)}<View style={styles.optionDivider} /><Text style={styles.optionTitle}>Size</Text>{strokeSizes.map((item) => <Pressable key={item} onPress={() => setStrokeWidth(item)} style={[styles.sizeButton, strokeWidth === item && styles.selectedSize]}><View style={[styles.dot, { width: item + 3, height: item + 3, backgroundColor: color }]} /></Pressable>)}</ScrollView></View>}

      <View style={styles.viewer} onLayout={(event) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}>
        <Pdf source={{ uri: doc.uri }} style={StyleSheet.absoluteFill} horizontal={false} enablePaging={false} onPageChanged={setPage} onError={() => Alert.alert('PDF error', 'This document could not be rendered on this device.')} />
        <DrawingCanvas strokes={currentStrokes} width={size.width} height={size.height} tool={drawingTool} color={color} strokeWidth={strokeWidth} onStrokeComplete={addStroke} />
        <View style={styles.pageBadge}><Text style={styles.pageBadgeText}>{page} / {pageCount}</Text></View>
      </View>

      <ToolBar tool={tool} setTool={chooseTool} onExport={share} onMore={() => setShowMore(true)} />

      <Modal visible={showMore} transparent animationType="slide" onRequestClose={() => setShowMore(false)}><Pressable style={styles.modalBackdrop} onPress={() => setShowMore(false)}><View style={styles.sheet} onStartShouldSetResponder={() => true}><View style={styles.handle} /><Text style={styles.sheetTitle}>Document tools</Text><View style={styles.sheetGrid}><SheetAction icon="share-outline" label="Export & share" onPress={() => { setShowMore(false); void share(); }} /><SheetAction icon="save-outline" label="Saved locally" onPress={() => { setShowMore(false); Alert.alert('Saved', 'Annotations are saved automatically on this device.'); }} /><SheetAction icon="trash-outline" label="Clear strokes" onPress={() => { setShowMore(false); setAnnotations((state) => ({ ...state, strokes: state.strokes.filter((stroke) => stroke.page !== page) })); }} /><SheetAction icon="settings-outline" label="Reader settings" onPress={() => { setShowMore(false); router.push('/settings'); }} /></View></View></Pressable></Modal>

      <Modal visible={showPages} transparent animationType="slide" onRequestClose={() => setShowPages(false)}><Pressable style={styles.modalBackdrop} onPress={() => setShowPages(false)}><View style={styles.pageSheet} onStartShouldSetResponder={() => true}><View style={styles.handle} /><Text style={styles.sheetTitle}>Pages</Text><ScrollView contentContainerStyle={styles.pageGrid}>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <Pressable key={item} onPress={() => { setPage(item); setShowPages(false); }} style={[styles.pageTile, item === page && styles.activePageTile]}><Ionicons name="document-text-outline" size={25} color={item === page ? colors.forest : colors.muted} /><Text style={[styles.pageNumber, item === page && styles.activePageNumber]}>{item}</Text></Pressable>)}</ScrollView></View></Pressable></Modal>
    </View>
  );
}

function SheetAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.sheetAction}><View style={styles.sheetIcon}><Ionicons name={icon} size={21} color={colors.mint} /></View><Text style={styles.sheetActionText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forest }, loading: { flex: 1, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, loadingText: { color: colors.ink },
  header: { minHeight: 76, paddingHorizontal: 14, paddingTop: 27, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: 1, borderBottomColor: colors.line }, headerButton: { padding: 8 }, heading: { flex: 1, paddingHorizontal: 4 }, title: { color: colors.ink, fontSize: 15, fontWeight: '800' }, subtitle: { color: colors.muted, fontSize: 11, marginTop: 3 },
  options: { backgroundColor: colors.panel, borderBottomWidth: 1, borderBottomColor: colors.line }, optionsContent: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }, optionTitle: { color: colors.muted, fontSize: 10, fontWeight: '800', marginRight: 2 }, color: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' }, selectedColor: { borderColor: colors.ink, transform: [{ scale: 1.18 }] }, optionDivider: { width: 1, height: 22, backgroundColor: colors.line, marginHorizontal: 3 }, sizeButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, selectedSize: { backgroundColor: colors.panelAlt }, dot: { borderRadius: 20 },
  viewer: { flex: 1, backgroundColor: '#46534E' }, pageBadge: { position: 'absolute', bottom: 83, alignSelf: 'center', backgroundColor: 'rgba(14,23,21,.88)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 }, pageBadgeText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.48)' }, sheet: { backgroundColor: colors.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 35 }, pageSheet: { height: '72%', backgroundColor: colors.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22 }, handle: { width: 42, height: 4, borderRadius: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 18 }, sheetTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 18 }, sheetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, sheetAction: { width: '47%', backgroundColor: colors.panelAlt, borderRadius: 16, padding: 13, gap: 10 }, sheetIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, sheetActionText: { color: colors.ink, fontSize: 12, fontWeight: '700' }, pageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 }, pageTile: { width: 76, height: 94, borderRadius: 15, backgroundColor: colors.panelAlt, alignItems: 'center', justifyContent: 'center', gap: 9 }, activePageTile: { backgroundColor: colors.mint }, pageNumber: { color: colors.muted, fontWeight: '800' }, activePageNumber: { color: colors.forest },
});
