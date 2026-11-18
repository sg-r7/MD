import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PdfDocument } from 'react-native-better-pdf';
import { applyPlan } from '@/lib/applyPlan';
import { deleteSelection, duplicateSelection, initialPlan, insertBlank, isIdentity, moveSelection, type PlanEntry } from '@/lib/pagePlan';
import { useTheme, type Palette } from '@/lib/theme';
import type { AnnotationState, DocumentRecord } from '@/types';

type Props = { visible: boolean; doc: DocumentRecord; annotations: AnnotationState; onClose: () => void; onApplied: (doc: DocumentRecord, ann: AnnotationState) => void };
type Loader = (index: number) => Promise<string | undefined>;

function Thumb({ entry, load, width, height, tint }: { entry: PlanEntry; load: Loader; width: number; height: number; tint: Palette }) {
  const [uri, setUri] = useState<string>();
  useEffect(() => {
    let active = true;
    if (entry.source !== null) void load(entry.source - 1).then((u) => { if (active) setUri(u); });
    return () => { active = false; };
  }, [entry.source, load]);
  return (
    <View style={[styles.thumb, { width, height, backgroundColor: '#FFFFFF', borderColor: tint.line }]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" /> : entry.source === null ? <Text style={styles.blank}>+</Text> : <ActivityIndicator color="#999" />}
    </View>
  );
}

function ActionButton({ icon, label, onPress, disabled, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[s.action, disabled && { opacity: 0.35 }]}>
      <Ionicons name={icon} size={21} color={danger ? colors.danger : colors.mint} /><Text style={[s.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

/** Full-screen editor for a document's pages: select, reorder, duplicate, delete and insert blank pages, then apply. */
export function PageManager({ visible, doc, annotations, onClose, onApplied }: Props) {
  const { colors, t } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [plan, setPlan] = useState<PlanEntry[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [original, setOriginal] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<Awaited<ReturnType<typeof PdfDocument.open>> | null>(null);
  const cache = useRef(new Map<number, Promise<string | undefined>>());

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    const resetTimer = setTimeout(() => { setLoading(true); setSelected([]); }, 0);
    cache.current.clear();
    PdfDocument.open({ uri: doc.uri })
      .then(async (pdf) => {
        if (!active) { pdf.close(); return; }
        pdfRef.current = pdf;
        const sizes = await pdf.getPageSizes();
        if (!active) return;
        setPlan(initialPlan(sizes)); setOriginal(sizes.length); setLoading(false);
      })
      .catch(() => { if (active) { setLoading(false); Alert.alert(t('PDF error'), t('This document could not be rendered on this device.')); onClose(); } });
    return () => { clearTimeout(resetTimer); active = false; pdfRef.current?.close(); pdfRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, doc.uri]);

  const load = useMemo<Loader>(() => (index) => {
    const hit = cache.current.get(index);
    if (hit) return hit;
    const pending = (async () => {
      const pdf = pdfRef.current;
      if (!pdf) return undefined;
      try { return (await pdf.renderPage(index, { width: 240, format: 'jpeg', quality: 0.7 })).uri; } catch { return undefined; }
    })();
    cache.current.set(index, pending);
    return pending;
  }, []);

  const toggle = (key: string) => setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  const changed = !isIdentity(plan, original);
  const columns = 3; const gap = 10; const tileW = (screenWidth - 32 - gap * (columns - 1)) / columns;

  const apply = async () => {
    setBusy(true);
    try {
      const result = await applyPlan(doc, plan, annotations);
      onApplied(result.doc, result.ann);
      onClose();
    } catch (error) {
      Alert.alert(t('Could not apply changes'), error instanceof Error ? error.message : t('The document could not be exported.'));
    } finally { setBusy(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[s.root, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <Pressable onPress={onClose} hitSlop={10} style={s.back}><Ionicons name="close" size={24} color={colors.ink} /></Pressable>
          <View style={s.heading}><Text style={s.title}>{t('Manage pages')}</Text><Text style={s.subtitle}>{plan.length} {t('Pages')}{selected.length ? ` · ${selected.length} ${t('selected')}` : ''}</Text></View>
          <Pressable disabled={!changed || busy} onPress={() => void apply()} style={[s.apply, (!changed || busy) && { opacity: 0.4 }]}><Text style={s.applyText}>{t('Apply')}</Text></Pressable>
        </View>
        {loading ? <View style={s.center}><ActivityIndicator color={colors.mint} /></View> : (
          <FlatList
            data={plan} numColumns={columns} keyExtractor={(e) => e.key} contentContainerStyle={s.grid} columnWrapperStyle={{ gap }}
            renderItem={({ item, index }) => {
              const on = selected.includes(item.key);
              const h = tileW * (item.height / Math.max(item.width, 1));
              return (
                <Pressable onPress={() => toggle(item.key)} style={{ width: tileW, marginBottom: 14 }}>
                  <View style={[s.tileFrame, on && { borderColor: colors.mint, borderWidth: 3 }]}>
                    <Thumb entry={item} load={load} width={tileW - (on ? 6 : 0)} height={Math.min(h, tileW * 1.5)} tint={colors} />
                    {on && <View style={s.check}><Ionicons name="checkmark" size={14} color={colors.onMint} /></View>}
                  </View>
                  <Text style={s.num}>{index + 1}{item.source === null ? ` · ${t('New')}` : ''}</Text>
                </Pressable>
              );
            }}
          />
        )}
        <View style={[s.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <ActionButton icon="checkmark-done-outline" label={selected.length === plan.length ? t('None') : t('All')} onPress={() => setSelected(selected.length === plan.length ? [] : plan.map((e) => e.key))} />
          <ActionButton icon="arrow-up" label={t('Up')} disabled={!selected.length} onPress={() => setPlan((p) => moveSelection(p, selected, -1))} />
          <ActionButton icon="arrow-down" label={t('Down')} disabled={!selected.length} onPress={() => setPlan((p) => moveSelection(p, selected, 1))} />
          <ActionButton icon="copy-outline" label={t('Duplicate')} disabled={!selected.length} onPress={() => setPlan((p) => duplicateSelection(p, selected))} />
          <ActionButton icon="document-outline" label={t('Blank')} onPress={() => setPlan((p) => insertBlank(p, selected))} />
          <ActionButton icon="trash-outline" label={t('Delete')} danger disabled={!selected.length || selected.length === plan.length} onPress={() => { setPlan((p) => deleteSelection(p, selected)); setSelected([]); }} />
        </View>
        {busy && <View style={s.busy}><ActivityIndicator color={colors.mint} /><Text style={s.busyText}>{t('Rebuilding document…')}</Text></View>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  thumb: { borderWidth: 1, borderRadius: 6, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  blank: { color: '#BBB', fontSize: 28 },
});

const makeStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.forest },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.line },
  back: { padding: 6 },
  heading: { flex: 1 },
  title: { color: c.ink, fontSize: 18, fontWeight: '800' },
  subtitle: { color: c.muted, fontSize: 11, marginTop: 2 },
  apply: { backgroundColor: c.lime, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 13 },
  applyText: { color: c.onLime, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: 16, paddingBottom: 30 },
  tileFrame: { borderRadius: 8, borderWidth: 0, alignItems: 'center', justifyContent: 'center' },
  check: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' },
  num: { color: c.muted, textAlign: 'center', fontSize: 12, marginTop: 6, fontWeight: '700' },
  bar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, borderTopWidth: 1, borderTopColor: c.line, backgroundColor: c.panel },
  action: { alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 4, minWidth: 52 },
  actionLabel: { color: c.muted, fontSize: 10, fontWeight: '700' },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,.55)', alignItems: 'center', justifyContent: 'center', gap: 10 },
  busyText: { color: '#fff', fontWeight: '700' },
});
