/* eslint-disable react-hooks/refs, react-hooks/exhaustive-deps */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, type SheetAction } from '@/components/ActionSheet';
import { DrawingCanvas, type CanvasTool, type DraftStroke, type ShapeKind } from '@/components/DrawingCanvas';
import { PageItems, type ItemKind } from '@/components/PageItems';
import { PromptModal } from '@/components/PromptModal';
import { ToolBar, type Tool } from '@/components/ToolBar';
import { loadEditorNote, markdownPreview } from '@/lib/editorStorage';
import { exportAnnotatedPdf } from '@/lib/exportPdf';
import { exportNotesMarkdown } from '@/lib/exportNotes';
import { simplifyPoints, strokeHit, strokeInside, translateStroke, uid } from '@/lib/geometry';
import { emptyAnnotations, loadAnnotations, loadDocuments, patchDocument, saveAnnotations } from '@/lib/storage';
import { useTheme, type Palette } from '@/lib/theme';
import type { AnnotationState, DocumentRecord, Point } from '@/types';

const inkColors = ['#1D2925', '#EF4444', '#F59E0B', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];
const strokeSizes = [2, 4, 7, 11];
const shapes: { id: ShapeKind; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { id: 'rect', icon: 'square-outline' }, { id: 'ellipse', icon: 'ellipse-outline' }, { id: 'arrow', icon: 'arrow-forward-outline' }, { id: 'line', icon: 'remove-outline' },
];
const noteColors = ['#FDE68A', '#FCA5A5', '#86EFAC', '#93C5FD', '#D8B4FE'];
const nightStyle = { filter: [{ invert: 1 }, { hueRotate: '180deg' }] } as unknown as ViewStyle;
const stickers = ['⭐', '❤️', '👍', '✅', '❓', '❗', '💡', '📌', '🔥', '✔️', '❌', '🎯', '⚠️', '😀', '🤔', '📝'];
const drawingTools: Tool[] = ['pen', 'highlight', 'eraser', 'shape', 'ruler', 'lasso'];
const NONE: string[] = [];
const clampN = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function Reader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, settings, update, tap, t } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [doc, setDoc] = useState<DocumentRecord>();
  const [missing, setMissing] = useState(false);
  const [ann, setAnn] = useState<AnnotationState>(emptyAnnotations());
  const annRef = useRef<AnnotationState>(ann);
  const past = useRef<AnnotationState[]>([]);
  const future = useRef<AnnotationState[]>([]);
  const loadedRef = useRef(false);

  const [tool, setTool] = useState<Tool>('select');
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect');
  const [color, setColor] = useState('#1D2925');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [pdfReady, setPdfReady] = useState(false);
  const [size, setSize] = useState({ width: 360, height: 600 });
  const sizeRef = useRef(size);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const zoomRef = useRef(1); const panRef = useRef<Point>({ x: 0, y: 0 }); const panStart = useRef<Point>({ x: 0, y: 0 });
  const [showMore, setShowMore] = useState(false);
  const [showPages, setShowPages] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [noteDraft, setNoteDraft] = useState<{ id?: string; text: string; color?: string } | null>(null);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [outlineTab, setOutlineTab] = useState<'pages' | 'bookmarks' | 'notes'>('pages');
  const [showGoTo, setShowGoTo] = useState(false);
  const [hideAnn, setHideAnn] = useState(false);
  const [itemSel, setItemSel] = useState<{ kind: ItemKind; id: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedNote, setSavedNote] = useState<string>();
  const pdfRef = useRef<React.ComponentRef<typeof Pdf>>(null);
  const pageRef = useRef(1);
  const initialPage = useRef(1);

  /* ---------- loading & persistence ---------- */
  useEffect(() => {
    let on = true;
    (async () => {
      const [docs, saved] = await Promise.all([loadDocuments(), loadAnnotations(id)]);
      if (!on) return;
      const found = docs.find((d) => d.id === id);
      if (!found) { setMissing(true); return; }
      initialPage.current = found.lastPage ?? 1; pageRef.current = initialPage.current;
      setPage(initialPage.current); setPageCount(found.pages ?? 1); setBookmarks(found.bookmarks ?? []);
      annRef.current = saved; setAnn(saved); loadedRef.current = true; setDoc(found);
    })();
    return () => { on = false; };
  }, [id]);

  useEffect(() => {
    if (!loadedRef.current || !id) return undefined;
    const timer = setTimeout(() => { void saveAnnotations(id, ann); }, 400);
    return () => clearTimeout(timer);
  }, [ann, id]);
  useEffect(() => () => { if (loadedRef.current && id) void saveAnnotations(id, annRef.current); }, [id]);

  const progress = useRef({ page: 1, pageCount: 1, known: false });
  progress.current = { page, pageCount, known: pdfReady };
  const flushProgress = () => {
    const p = progress.current;
    if (id && p.known) void patchDocument(id, { progress: p.page / Math.max(p.pageCount, 1), lastPage: p.page, pages: p.pageCount, lastOpenedAt: new Date().toISOString() });
  };
  useEffect(() => { if (!pdfReady) return undefined; const t = setTimeout(flushProgress, 700); return () => clearTimeout(t); }, [page, pageCount, pdfReady]);
  useEffect(() => flushProgress, [id]);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (id) loadEditorNote(`workspace-${id}`, id).then((note) => { if (active) setSavedNote(note ? markdownPreview(note.markdown) || undefined : undefined); });
    return () => { active = false; };
  }, [id]));

  /* ---------- annotation state with undo/redo ---------- */
  const commit = (fn: (s: AnnotationState) => AnnotationState) => {
    const next = { ...fn(annRef.current), view: sizeRef.current };
    past.current = [...past.current.slice(-29), annRef.current];
    future.current = [];
    annRef.current = next; setAnn(next);
  };
  const undo = () => { const prev = past.current.pop(); if (!prev) return; future.current.push(annRef.current); annRef.current = prev; setAnn(prev); tap(); };
  const redo = () => { const next = future.current.pop(); if (!next) return; past.current.push(annRef.current); annRef.current = next; setAnn(next); tap(); };

  const pageStrokes = useMemo(() => ann.strokes.filter((s) => s.page === page), [ann.strokes, page]);
  const pageNotes = useMemo(() => ann.notes.filter((n) => n.page === page), [ann.notes, page]);
  const pageImages = useMemo(() => ann.images.filter((i) => i.page === page), [ann.images, page]);

  const onStroke = (draft: DraftStroke) => {
    const points = draft.tool === 'pen' || draft.tool === 'highlight' ? simplifyPoints(draft.points) : draft.points;
    commit((s) => ({ ...s, strokes: [...s.strokes, { ...draft, points, id: uid(), page }] }));
    tap();
  };
  const onErase = (points: Point[]) => {
    const { width, height } = sizeRef.current;
    const hit = annRef.current.strokes.filter((s) => s.page === page && strokeHit(s, points, width, height, 12)).map((s) => s.id);
    if (!hit.length) return;
    commit((s) => ({ ...s, strokes: s.strokes.filter((x) => !hit.includes(x.id)) })); tap();
  };
  const onLasso = (poly: Point[]) => {
    if (poly.length < 3) { setSelected([]); return; }
    const ids = annRef.current.strokes.filter((s) => s.page === page && strokeInside(s, poly)).map((s) => s.id);
    setSelected(ids); if (ids.length) tap();
  };
  const onMoveSelection = (dx: number, dy: number) => commit((s) => ({ ...s, strokes: s.strokes.map((x) => (selected.includes(x.id) ? translateStroke(x, dx, dy) : x)) }));
  const deleteSelection = () => { commit((s) => ({ ...s, strokes: s.strokes.filter((x) => !selected.includes(x.id)) })); setSelected([]); };
  const duplicateSelection = () => {
    const copies = annRef.current.strokes.filter((x) => selected.includes(x.id)).map((x) => ({ ...translateStroke(x, 0.03, 0.03), id: uid() }));
    commit((s) => ({ ...s, strokes: [...s.strokes, ...copies] })); setSelected(copies.map((c) => c.id));
  };
  const recolorSelection = () => commit((s) => ({ ...s, strokes: s.strokes.map((x) => (selected.includes(x.id) ? { ...x, color } : x)) }));

  /* ---------- notes, stickers, images ---------- */
  const centerX = (px: number) => Math.max(0.02, 0.5 - px / 2 / Math.max(sizeRef.current.width, 1));
  const saveNote = (text: string, noteColor?: string) => {
    const clean = text.trim();
    if (!clean) return;
    if (noteDraft?.id) commit((s) => ({ ...s, notes: s.notes.map((n) => (n.id === noteDraft.id ? { ...n, text: clean, color: noteColor ?? n.color } : n)) }));
    else commit((s) => ({ ...s, notes: [...s.notes, { id: uid(), page, x: centerX(150), y: 0.3, text: clean, color: noteColor ?? noteColors[0]!, kind: 'note' }] }));
    tap();
  };
  const addSticker = (emoji: string) => { commit((s) => ({ ...s, notes: [...s.notes, { id: uid(), page, x: centerX(44), y: 0.4, text: emoji, color: 'transparent', kind: 'sticker', size: 44 }] })); tap(); };
  const addImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const base = `${FileSystem.documentDirectory}images/`;
      await FileSystem.makeDirectoryAsync(base, { intermediates: true }).catch(() => {});
      const dest = `${base}${uid()}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await FileSystem.copyAsync({ from: asset.uri, to: dest });
      const aspect = await new Promise<number>((resolve) => Image.getSize(dest, (w, h) => resolve(h ? w / h : 1), () => resolve(1)));
      commit((s) => ({ ...s, images: [...s.images, { id: uid(), page, x: centerX(size.width * 0.4), y: 0.25, w: 0.4, aspect, uri: dest }] }));
      tap();
    } catch (error) { Alert.alert(t('Image failed'), error instanceof Error ? error.message : t('The image could not be added.')); }
  };
  const moveItem = (kind: ItemKind, itemId: string, x: number, y: number) =>
    commit((s) => (kind === 'image' ? { ...s, images: s.images.map((i) => (i.id === itemId ? { ...i, x, y } : i)) } : { ...s, notes: s.notes.map((n) => (n.id === itemId ? { ...n, x, y } : n)) }));
  const resizeItem = (factor: number) => {
    if (!itemSel) return;
    commit((s) => (itemSel.kind === 'image'
      ? { ...s, images: s.images.map((i) => (i.id === itemSel.id ? { ...i, w: clampN(i.w * factor, 0.1, 1) } : i)) }
      : { ...s, notes: s.notes.map((n) => (n.id === itemSel.id ? { ...n, size: clampN((n.size ?? 44) * factor, 20, 160) } : n)) }));
  };
  const deleteItem = () => {
    if (!itemSel) return;
    // Image files stay on disk so undo can restore them; they are removed when the document is deleted.
    commit((s) => ({ ...s, images: s.images.filter((i) => i.id !== itemSel.id), notes: s.notes.filter((n) => n.id !== itemSel.id) }));
  };
  const selectedNote = itemSel?.kind === 'note' ? ann.notes.find((n) => n.id === itemSel.id) : undefined;

  /* ---------- zoom / pan ---------- */
  const [panResponder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { panStart.current = panRef.current; },
    onPanResponderMove: (_, g) => {
      const z = zoomRef.current; const s = sizeRef.current;
      const mx = ((z - 1) * s.width) / 2; const my = ((z - 1) * s.height) / 2;
      const next = { x: clampN(panStart.current.x + g.dx, -mx, mx), y: clampN(panStart.current.y + g.dy, -my, my) };
      panRef.current = next; setPan(next);
    },
  }));
  const setZoomLevel = (z: number) => { zoomRef.current = z; panRef.current = { x: 0, y: 0 }; setZoom(z); setPan({ x: 0, y: 0 }); };

  const chooseTool = (next: Tool) => {
    tap();
    setSelected([]);
    if (next === 'magnifier') { const z = zoom === 1 ? 2 : zoom === 2 ? 3 : 1; setZoomLevel(z); setTool(z === 1 ? 'select' : 'magnifier'); return; }
    if (next === 'text') { setNoteDraft({ text: '' }); setTool('select'); return; }
    if (next === 'sticker') { setShowStickers(true); setTool('select'); return; }
    if (next === 'image') { setTool('select'); void addImage(); return; }
    setTool(next);
  };

  /* ---------- sharing ---------- */
  const share = async (annotated: boolean) => {
    if (!doc) return;
    if (!(await Sharing.isAvailableAsync())) { Alert.alert(t('Sharing unavailable'), t('Sharing is not supported on this device.')); return; }
    const a = annRef.current;
    const has = a.strokes.length > 0 || a.images.length > 0 || a.notes.some((n) => n.kind !== 'sticker');
    try {
      if (annotated && has) {
        setExporting(true);
        const path = await exportAnnotatedPdf(doc, a);
        await Sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('Share annotated PDF') });
      } else await Sharing.shareAsync(doc.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: t('Share original') });
    } catch (error) { Alert.alert(t('Export failed'), error instanceof Error ? error.message : t('The document could not be exported.')); } finally { setExporting(false); }
  };

  const toggleBookmark = () => {
    const next = bookmarks.includes(page) ? bookmarks.filter((b) => b !== page) : [...bookmarks, page].sort((a, b) => a - b);
    setBookmarks(next); tap();
    void patchDocument(id, { bookmarks: next });
  };
  const submitGoTo = (value: string) => {
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) goToPage(clampN(n, 1, Math.max(pageCount, 1)));
  };
  const shareNotes = async () => {
    if (!doc) return;
    try {
      const note = await loadEditorNote(`workspace-${id}`, id);
      const path = await exportNotesMarkdown(doc, note?.markdown ?? '', annRef.current, t);
      if (!path) { Alert.alert(t('Export failed'), t('Nothing to export yet.')); return; }
      if (!(await Sharing.isAvailableAsync())) { Alert.alert(t('Sharing unavailable'), t('Sharing is not supported on this device.')); return; }
      await Sharing.shareAsync(path, { mimeType: 'text/markdown', UTI: 'net.daringfireball.markdown', dialogTitle: t('Export notes (Markdown)') });
    } catch (error) { Alert.alert(t('Export failed'), error instanceof Error ? error.message : t('The document could not be exported.')); }
  };
  const goToPage = (n: number) => { pdfRef.current?.setPage(n); setSelected([]); setPage(n); pageRef.current = n; };
  const mountPage = useMemo(() => pageRef.current, [settings.pageMode, doc?.id]);

  if (missing) return <View style={styles.loading}><Text style={styles.loadingText}>{t('This document is no longer in your library.')}</Text><Pressable onPress={() => router.back()} style={styles.backLink}><Text style={styles.backLinkText}>{t('Go back')}</Text></Pressable></View>;
  if (!doc) return <View style={styles.loading}><ActivityIndicator color={colors.mint} /><Text style={[styles.loadingText, { marginTop: 10 }]}>{t('Opening document…')}</Text></View>;

  const canvasTool: CanvasTool = drawingTools.includes(tool) ? (tool as CanvasTool) : 'select';
  const showOptions = tool === 'pen' || tool === 'highlight' || tool === 'shape' || tool === 'ruler';
  const hasPageContent = pageStrokes.length + pageNotes.length + pageImages.length > 0;

  const moreActions: SheetAction[] = [
    { icon: bookmarks.includes(page) ? 'bookmark' : 'bookmark-outline', label: bookmarks.includes(page) ? t('Remove bookmark') : t('Bookmark this page'), onPress: toggleBookmark },
    { icon: 'navigate-outline', label: t('Go to page'), onPress: () => setShowGoTo(true) },
    { icon: hideAnn ? 'eye-outline' : 'eye-off-outline', label: hideAnn ? t('Show annotations') : t('Hide annotations'), onPress: () => setHideAnn((v) => !v) },
    { icon: 'moon-outline', label: settings.nightMode ? t('Night reading: on') : t('Night reading: off'), onPress: () => update({ nightMode: !settings.nightMode }) },
    { icon: 'share-outline', label: t('Share annotated PDF'), onPress: () => void share(true) },
    { icon: 'document-outline', label: t('Share original'), onPress: () => void share(false) },
    { icon: 'download-outline', label: t('Export notes (Markdown)'), onPress: () => void shareNotes() },
    { icon: 'create-outline', label: t('Study notes'), onPress: () => router.push({ pathname: '/editor', params: { documentId: id } }) },
    { icon: 'trash-outline', label: t('Clear this page'), danger: true, onPress: () => setConfirmClear(true) },
    { icon: 'settings-outline', label: t('Reader settings'), onPress: () => router.push('/settings') },
  ];
  const itemActions: SheetAction[] = [
    ...(selectedNote && selectedNote.kind !== 'sticker' ? [{ icon: 'create-outline' as const, label: t('Edit text'), onPress: () => setNoteDraft({ id: selectedNote.id, text: selectedNote.text, color: selectedNote.color }) }] : []),
    ...(selectedNote?.kind === 'note' ? [] : [
      { icon: 'add-circle-outline' as const, label: t('Bigger'), onPress: () => resizeItem(1.25) },
      { icon: 'remove-circle-outline' as const, label: t('Smaller'), onPress: () => resizeItem(0.8) },
    ]),
    { icon: 'trash-outline', label: t('Delete'), danger: true, onPress: deleteItem },
  ];

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityLabel="Back"><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
        <View style={styles.heading}><Text numberOfLines={1} style={styles.title}>{doc.name}</Text><Text style={styles.subtitle}>{t('MD workspace')}  ·  {page}/{pageCount}{bookmarks.includes(page) ? '  ★' : ''}</Text></View>
        <Pressable onPress={() => setShowPages(true)} style={styles.headerButton}><Ionicons name="grid-outline" size={21} color={colors.mint} /></Pressable>
        <Pressable onPress={() => setShowMore(true)} style={styles.headerButton}><Ionicons name="ellipsis-vertical" size={21} color={colors.mint} /></Pressable>
      </View>

      {showOptions && (
        <View style={styles.options}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsContent}>
            {tool === 'shape' && <>{shapes.map((sh) => <Pressable key={sh.id} onPress={() => setShapeKind(sh.id)} style={[styles.sizeButton, shapeKind === sh.id && styles.selectedSize]}><Ionicons name={sh.icon} size={18} color={shapeKind === sh.id ? colors.mint : colors.muted} /></Pressable>)}<View style={styles.optionDivider} /></>}
            <Text style={styles.optionTitle}>{t('Color')}</Text>
            {inkColors.map((item) => <Pressable key={item} onPress={() => setColor(item)} style={[styles.color, { backgroundColor: item }, color === item && styles.selectedColor]} />)}
            <View style={styles.optionDivider} />
            <Text style={styles.optionTitle}>{t('Size')}</Text>
            {strokeSizes.map((item) => <Pressable key={item} onPress={() => setStrokeWidth(item)} style={[styles.sizeButton, strokeWidth === item && styles.selectedSize]}><View style={[styles.dot, { width: item + 3, height: item + 3, backgroundColor: color }]} /></Pressable>)}
          </ScrollView>
        </View>
      )}

      <View style={styles.viewer} onLayout={(e) => { const { width, height } = e.nativeEvent.layout; sizeRef.current = { width, height }; setSize({ width, height }); }}>
        <View style={[StyleSheet.absoluteFill, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: zoom }] }]}>
          <View style={[StyleSheet.absoluteFill, settings.nightMode ? nightStyle : null]}>
          <Pdf
            key={settings.pageMode} ref={pdfRef} source={{ uri: doc.uri }} style={StyleSheet.absoluteFill}
            horizontal={settings.pageMode === 'horizontal'} enablePaging fitPolicy={2} spacing={0} minScale={1} maxScale={1} enableDoubleTapZoom={false} page={mountPage}
            onLoadComplete={(n) => { setPageCount(n); setPdfReady(true); }}
            onPageChanged={(p, n) => { setSelected([]); setPage(p); pageRef.current = p; if (n) setPageCount(n); }}
            onError={() => Alert.alert(t('PDF error'), t('This document could not be rendered on this device.'))}
          />
          </View>
          {!hideAnn && <DrawingCanvas strokes={pageStrokes} width={size.width} height={size.height} tool={canvasTool} shapeKind={shapeKind} color={color} strokeWidth={strokeWidth}
            selectedIds={tool === 'lasso' ? selected : NONE} onStroke={onStroke} onErase={onErase} onLasso={onLasso} onMoveSelection={onMoveSelection} />}
          {!hideAnn && <PageItems notes={pageNotes} images={pageImages} width={size.width} height={size.height} zoom={zoom} interactive={tool === 'select'} onMove={moveItem} onPress={(kind, itemId) => setItemSel({ kind, id: itemId })} />}
        </View>
        {tool === 'magnifier' && zoom > 1 && <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />}

        <View pointerEvents="none" style={styles.pageBadge}><Text style={styles.pageBadgeText}>{page} / {pageCount}{zoom > 1 ? `  ·  ${zoom}x` : ''}</Text></View>
        {tool === 'lasso' && selected.length > 0 && (
          <View style={styles.selectionBar}>
            <Pressable style={styles.selBtn} onPress={deleteSelection}><Ionicons name="trash-outline" size={18} color={colors.danger} /></Pressable>
            <Pressable style={styles.selBtn} onPress={duplicateSelection}><Ionicons name="copy-outline" size={18} color={colors.mint} /></Pressable>
            <Pressable style={styles.selBtn} onPress={recolorSelection}><View style={[styles.dot, { width: 16, height: 16, backgroundColor: color }]} /></Pressable>
            <Pressable style={styles.selBtn} onPress={() => setSelected([])}><Ionicons name="checkmark" size={20} color={colors.mint} /></Pressable>
          </View>
        )}
        {savedNote ? <Pressable style={styles.notePreview} onPress={() => router.push({ pathname: '/editor', params: { documentId: id } })}><Ionicons name="document-text-outline" size={16} color={colors.mint} /><Text numberOfLines={2} style={styles.notePreviewText}>{savedNote}</Text></Pressable> : null}
        {exporting && <View style={styles.exporting}><ActivityIndicator color={colors.mint} /><Text style={styles.exportingText}>{t('Preparing annotated PDF…')}</Text></View>}
      </View>

      <ToolBar tool={tool} setTool={chooseTool} zoom={zoom} canUndo={past.current.length > 0} canRedo={future.current.length > 0} onUndo={undo} onRedo={redo} onExport={() => void share(true)} onMore={() => setShowMore(true)} />

      <ActionSheet visible={showMore} title={t('Document tools')} actions={moreActions} onClose={() => setShowMore(false)} />
      <ActionSheet visible={!!itemSel && !noteDraft} title={selectedNote ? (selectedNote.kind === 'sticker' ? t('Sticker') : t('Note')) : t('Image')} actions={itemActions} onClose={() => setItemSel(null)} />
      <ActionSheet visible={confirmClear} title={hasPageContent ? t('Remove everything on page {n}?', { n: page }) : t('Nothing to clear on this page')} onClose={() => setConfirmClear(false)}
        actions={hasPageContent ? [
          { icon: 'trash', label: t('Clear page'), danger: true, onPress: () => commit((s) => ({ ...s, strokes: s.strokes.filter((x) => x.page !== page), notes: s.notes.filter((x) => x.page !== page), images: s.images.filter((x) => x.page !== page) })) },
          { icon: 'close', label: t('Cancel'), onPress: () => {} },
        ] : [{ icon: 'close', label: t('OK'), onPress: () => {} }]} />
      <PromptModal visible={!!noteDraft} title={noteDraft?.id ? t('Edit note') : t('New sticky note')} initial={noteDraft?.text ?? ''} placeholder={t('Write a note…')} multiline
        palette={noteColors} initialColor={noteDraft?.color} onSubmit={saveNote} onClose={() => { setNoteDraft(null); setItemSel(null); }} />
      <PromptModal visible={showGoTo} title={t('Go to page (1–{n})', { n: pageCount })} initial={String(page)} submitLabel="Go" keyboardType="number-pad"
        onSubmit={submitGoTo} onClose={() => setShowGoTo(false)} />

      <Modal visible={showStickers} transparent animationType="slide" onRequestClose={() => setShowStickers(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowStickers(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} /><Text style={styles.sheetTitle}>{t('Stickers')}</Text>
            <View style={styles.stickerGrid}>{stickers.map((e) => <Pressable key={e} style={styles.stickerCell} onPress={() => { setShowStickers(false); addSticker(e); }}><Text style={styles.stickerText}>{e}</Text></Pressable>)}</View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showPages} transparent animationType="slide" onRequestClose={() => setShowPages(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowPages(false)}>
          <View style={styles.pageSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.handle} /><Text style={styles.sheetTitle}>{t('Outline')}</Text>
            <View style={styles.outlineTabs}>
              {(['pages', 'bookmarks', 'notes'] as const).map((tab) => (
                <Pressable key={tab} onPress={() => setOutlineTab(tab)} style={[styles.outlineTab, outlineTab === tab && styles.outlineTabOn]}>
                  <Text style={[styles.outlineTabText, outlineTab === tab && styles.outlineTabTextOn]}>{t(tab === 'pages' ? 'Pages' : tab === 'bookmarks' ? 'Bookmarks' : 'Notes')}</Text>
                </Pressable>
              ))}
            </View>
            {outlineTab === 'pages' && (
              <ScrollView contentContainerStyle={styles.pageGrid}>
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => {
                  const marks = ann.strokes.some((x) => x.page === n) || ann.notes.some((x) => x.page === n) || ann.images.some((x) => x.page === n);
                  return (
                    <Pressable key={n} onPress={() => { setShowPages(false); goToPage(n); }} style={[styles.pageTile, n === page && styles.activePageTile]}>
                      <Ionicons name={bookmarks.includes(n) ? 'bookmark' : 'document-text-outline'} size={25} color={n === page ? colors.onMint : bookmarks.includes(n) ? colors.amber : colors.muted} />
                      <Text style={[styles.pageNumber, n === page && styles.activePageNumber]}>{n}</Text>
                      {marks && <View style={styles.markDot} />}
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {outlineTab === 'bookmarks' && (
              <ScrollView>
                {bookmarks.length === 0 && <Text style={styles.emptyText}>{t('No bookmarks yet. Add one from the More menu.')}</Text>}
                {bookmarks.map((n) => (
                  <Pressable key={n} onPress={() => { setShowPages(false); goToPage(n); }} style={styles.listRow}>
                    <Ionicons name="bookmark" size={18} color={colors.amber} /><Text style={styles.listText}>{t('Page {n}', { n })}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {outlineTab === 'notes' && (
              <ScrollView>
                {ann.notes.filter((n) => n.kind !== 'sticker').length === 0 && <Text style={styles.emptyText}>{t('No notes yet.')}</Text>}
                {[...ann.notes].filter((n) => n.kind !== 'sticker').sort((x, y) => x.page - y.page).map((n) => (
                  <Pressable key={n.id} onPress={() => { setShowPages(false); goToPage(n.page); }} style={styles.listRow}>
                    <View style={[styles.noteChip, { backgroundColor: n.color }]} />
                    <View style={styles.listCopy}><Text style={styles.listMeta}>{t('Page {n}', { n: n.page })}</Text><Text numberOfLines={2} style={styles.listText}>{n.text}</Text></View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.forest },
  loading: { flex: 1, backgroundColor: c.forest, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { color: c.ink, textAlign: 'center' },
  backLink: { marginTop: 16, backgroundColor: c.lime, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 13 },
  backLinkText: { color: c.onLime, fontWeight: '800' },
  header: { paddingBottom: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, borderBottomWidth: 1, borderBottomColor: c.line },
  headerButton: { padding: 8 },
  heading: { flex: 1, paddingHorizontal: 4 },
  title: { color: c.ink, fontSize: 15, fontWeight: '800' },
  subtitle: { color: c.muted, fontSize: 11, marginTop: 3 },
  options: { backgroundColor: c.panel, borderBottomWidth: 1, borderBottomColor: c.line },
  optionsContent: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  optionTitle: { color: c.muted, fontSize: 10, fontWeight: '800', marginRight: 2 },
  color: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'transparent' },
  selectedColor: { borderColor: c.ink, transform: [{ scale: 1.18 }] },
  optionDivider: { width: 1, height: 22, backgroundColor: c.line, marginHorizontal: 3 },
  sizeButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  selectedSize: { backgroundColor: c.panelAlt },
  dot: { borderRadius: 20 },
  viewer: { flex: 1, backgroundColor: '#46534E', overflow: 'hidden' },
  pageBadge: { position: 'absolute', bottom: 12, alignSelf: 'center', backgroundColor: c.panel, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  pageBadgeText: { color: c.ink, fontSize: 11, fontWeight: '800' },
  selectionBar: { position: 'absolute', top: 10, alignSelf: 'center', flexDirection: 'row', gap: 4, backgroundColor: c.panel, borderColor: c.line, borderWidth: 1, borderRadius: 16, padding: 4 },
  selBtn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  notePreview: { position: 'absolute', left: 12, right: 12, bottom: 48, padding: 10, borderRadius: 13, backgroundColor: c.panel, borderWidth: 1, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 8 },
  notePreviewText: { color: c.ink, fontSize: 12, flex: 1 },
  exporting: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.45)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  exportingText: { color: '#fff', fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.48)' },
  sheet: { backgroundColor: c.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 35 },
  pageSheet: { height: '72%', backgroundColor: c.panel, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22 },
  handle: { width: 42, height: 4, borderRadius: 3, backgroundColor: c.line, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { color: c.ink, fontSize: 20, fontWeight: '800', marginBottom: 18 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  stickerCell: { width: 66, height: 66, borderRadius: 16, backgroundColor: c.panelAlt, alignItems: 'center', justifyContent: 'center' },
  stickerText: { fontSize: 32 },
  pageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingBottom: 20 },
  pageTile: { width: 76, height: 94, borderRadius: 15, backgroundColor: c.panelAlt, alignItems: 'center', justifyContent: 'center', gap: 9 },
  activePageTile: { backgroundColor: c.mint },
  pageNumber: { color: c.muted, fontWeight: '800' },
  activePageNumber: { color: c.onMint },
  outlineTabs: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  outlineTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: c.panelAlt },
  outlineTabOn: { backgroundColor: c.mint },
  outlineTabText: { color: c.muted, fontWeight: '700', fontSize: 12 },
  outlineTabTextOn: { color: c.onMint },
  emptyText: { color: c.muted, textAlign: 'center', marginTop: 30, lineHeight: 21 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.line },
  listCopy: { flex: 1 },
  listMeta: { color: c.muted, fontSize: 11, fontWeight: '700' },
  listText: { color: c.ink, fontSize: 14, flex: 1 },
  noteChip: { width: 14, height: 36, borderRadius: 4 },
  markDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: c.amber },
});
