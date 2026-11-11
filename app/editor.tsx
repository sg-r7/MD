import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MilkdownEditor } from '@/components/MilkdownEditor';
import { colors } from '@/constants/theme';

export default function EditorScreen() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [markdown, setMarkdown] = useState('');
  return <View style={styles.root}>
    <View style={styles.header}>
      <Pressable onPress={() => router.back()} style={styles.button}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
      <View style={styles.copy}><Text style={styles.kicker}>MD WORKSPACE</Text><Text style={styles.title}>Note editor</Text></View>
      <Pressable onPress={() => setSaved(true)} style={[styles.save, saved && styles.saved]}><Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color={colors.forest} /><Text style={styles.saveText}>{saved ? 'Saved' : 'Save'}</Text></Pressable>
    </View>
    <MilkdownEditor initialMarkdown={markdown} placeholder="Write your study notes…" onChange={(value) => { setMarkdown(value); setSaved(false); }} onReady={() => setSaved(false)} />
  </View>;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.forest }, header: { minHeight: 84, paddingTop: 30, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.line }, button: { padding: 8 }, copy: { flex: 1 }, kicker: { color: colors.mint, fontSize: 10, fontWeight: '800', letterSpacing: 1.5 }, title: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 3 }, save: { backgroundColor: colors.lime, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 5 }, saved: { backgroundColor: colors.mint }, saveText: { color: colors.forest, fontSize: 12, fontWeight: '800' } });
