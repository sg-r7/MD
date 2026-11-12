import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MilkdownEditor, type MilkdownEditorHandle } from '@/components/MilkdownEditor';
import { colors } from '@/constants/theme';
import { loadEditorNote, markdownPreview, saveEditorNote } from '@/lib/editorStorage';

export default function EditorScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const editorRef = useRef<MilkdownEditorHandle>(null);
  const noteId = `workspace-${documentId ?? 'default'}`;
  const [initialMarkdown, setInitialMarkdown] = useState<string>();
  const [markdown, setMarkdown] = useState('');
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    loadEditorNote(noteId, documentId).then((note) => {
      if (!active) return;
      const value = note?.markdown ?? '';
      setInitialMarkdown(value);
      setMarkdown(value);
    });
    return () => { active = false; };
  }, [documentId, noteId]);

  const save = () => {
    if (!ready || saving) return;
    setSaving(true);
    setSaved(false);
    editorRef.current?.requestSave();
  };

  const handleSaved = async (value: string) => {
    await saveEditorNote({ id: noteId, documentId, markdown: value, updatedAt: new Date().toISOString() });
    setMarkdown(value);
    setSaving(false);
    setSaved(true);
    router.back();
  };

  if (initialMarkdown === undefined) return <View style={styles.center}><ActivityIndicator color={colors.mint} /><Text style={styles.loading}>Loading note…</Text></View>;

  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.button}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
      <View style={styles.copy}><Text style={styles.kicker}>MD WORKSPACE</Text><Text style={styles.title}>Note editor</Text></View>
      <Pressable disabled={!ready || saving} onPress={save} style={[styles.save, (!ready || saving) && styles.disabled, saved && styles.saved]}><Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color={colors.forest} /><Text style={styles.saveText}>{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}</Text></Pressable>
    </View>
    <MilkdownEditor ref={editorRef} initialMarkdown={initialMarkdown} placeholder="Write your study notes…" onChange={(value) => { setMarkdown(value); setSaved(false); }} onReady={() => setReady(true)} onSave={handleSaved} />
    {markdownPreview(markdown) ? <View style={styles.status}><Text numberOfLines={1} style={styles.statusText}>Local draft ready · {markdownPreview(markdown)}</Text></View> : null}
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.forest }, center: { flex: 1, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, loading: { color: colors.muted, marginTop: 10 }, header: { minHeight: 84, paddingTop: 30, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, button: { padding: 8 }, copy: { flex: 1 }, kicker: { color: colors.mint, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 3 }, save: { backgroundColor: colors.lime, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5 }, saved: { backgroundColor: colors.mint }, disabled: { opacity: 0.5 }, saveText: { color: colors.forest, fontSize: 12, fontWeight: '800' }, status: { position: 'absolute', left: 12, right: 12, bottom: 10, padding: 8, borderRadius: 9, backgroundColor: colors.panelAlt }, statusText: { color: colors.muted, fontSize: 11 } });
