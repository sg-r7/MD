import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MilkdownEditor, type MilkdownEditorHandle } from '@/components/MilkdownEditor';
import { loadEditorNote, markdownPreview, saveEditorNote } from '@/lib/editorStorage';
import { useTheme, type Palette } from '@/lib/theme';

export default function EditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, t } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const editorRef = useRef<MilkdownEditorHandle>(null);
  const noteId = `workspace-${documentId ?? 'default'}`;
  const [initialMarkdown, setInitialMarkdown] = useState<string>();
  const [markdown, setMarkdown] = useState('');
  const lastSaved = useRef('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const leaving = useRef(false);

  useEffect(() => {
    let active = true;
    loadEditorNote(noteId, documentId).then((note) => {
      if (!active) return;
      const value = note?.markdown ?? '';
      lastSaved.current = value;
      setInitialMarkdown(value);
      setMarkdown(value);
    });
    return () => { active = false; };
  }, [documentId, noteId]);

  const persist = async (value: string) => {
    if (value === lastSaved.current) return;
    lastSaved.current = value;
    await saveEditorNote({ id: noteId, documentId, markdown: value, updatedAt: new Date().toISOString() });
  };

  // Autosave 1.2s after the last edit so nothing is lost if the screen is closed by the system back gesture.
  useEffect(() => {
    if (!ready || initialMarkdown === undefined || markdown === lastSaved.current) return undefined;
    const timer = setTimeout(() => { void persist(markdown).then(() => setSaved(true)); }, 1200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdown, ready, initialMarkdown]);

  const handleSaved = async (value: string) => {
    await persist(value);
    setMarkdown(value);
    setSaving(false);
    setSaved(true);
    if (leaving.current) router.back();
  };

  const finish = () => {
    if (!ready || saving) { router.back(); return; }
    leaving.current = true;
    setSaving(true);
    editorRef.current?.requestSave();
  };
  const saveOnly = () => {
    if (!ready || saving) return;
    leaving.current = false;
    setSaving(true);
    setSaved(false);
    editorRef.current?.requestSave();
  };

  if (initialMarkdown === undefined) return <View style={styles.center}><ActivityIndicator color={colors.mint} /><Text style={styles.loading}>{t('Loading note…')}</Text></View>;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={finish} style={styles.button} accessibilityLabel="Save and go back"><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
        <View style={styles.copy}><Text style={styles.kicker}>{t('MD WORKSPACE')}</Text><Text style={styles.title}>{t('Note editor')}</Text></View>
        <Pressable disabled={!ready || saving} onPress={saveOnly} style={[styles.save, (!ready || saving) && styles.disabled, saved && styles.saved]}>
          <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color={colors.onLime} /><Text style={styles.saveText}>{saving ? t('Saving…') : saved ? t('Saved') : t('Save')}</Text>
        </Pressable>
      </View>
      <MilkdownEditor ref={editorRef} initialMarkdown={initialMarkdown} placeholder={t('Write your study notes…')} onChange={(value) => { setMarkdown(value); setSaved(false); }} onReady={() => setReady(true)} onSave={handleSaved} />
      {markdownPreview(markdown) ? <View style={[styles.status, { bottom: insets.bottom + 10 }]}><Text numberOfLines={1} style={styles.statusText}>{saved ? t('Saved') : t('Draft')} · {markdownPreview(markdown)}</Text></View> : null}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.forest },
  center: { flex: 1, backgroundColor: c.forest, alignItems: 'center', justifyContent: 'center' },
  loading: { color: c.muted, marginTop: 10 },
  header: { paddingBottom: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: c.line },
  button: { padding: 8 },
  copy: { flex: 1 },
  kicker: { color: c.mint, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: c.ink, fontSize: 19, fontWeight: '800', marginTop: 3 },
  save: { backgroundColor: c.lime, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5 },
  saved: { backgroundColor: c.mint },
  disabled: { opacity: 0.5 },
  saveText: { color: c.onLime, fontSize: 12, fontWeight: '800' },
  status: { position: 'absolute', left: 12, right: 12, padding: 8, borderRadius: 9, backgroundColor: c.panelAlt },
  statusText: { color: c.muted, fontSize: 11 },
});
