import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '@/constants/theme';
import { useTheme, type Palette } from '@/lib/theme';
import type { SortMode, Tag } from '@/types';

const tabs: Tag[] = ['All', 'Recent', 'Favorites', 'Study', 'Work'];
type Props = { query: string; setQuery: (v: string) => void; filter: Tag; setFilter: (v: Tag) => void; sort: SortMode; onSort: () => void; onImport: () => void; onSettings: () => void };

export function LibraryHeader({ query, setQuery, filter, setFilter, sort, onSort, onImport, onSettings }: Props) {
  const { colors } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <>
      <View style={s.top}>
        <View><Text style={s.kicker}>YOUR WORKSPACE</Text><Text style={s.title}>Library</Text></View>
        <View style={s.actions}>
          <Pressable style={s.icon} onPress={onImport} accessibilityLabel="Import PDF"><Ionicons name="add" size={23} color={colors.onLime} /></Pressable>
          <Pressable style={s.iconDark} onPress={onSettings} accessibilityLabel="Settings"><Ionicons name="settings-outline" size={21} color={colors.mint} /></Pressable>
        </View>
      </View>
      <View style={s.search}>
        <Ionicons name="search" size={19} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Search documents, tags..." placeholderTextColor={colors.muted} style={s.input} />
        {query ? <Pressable onPress={() => setQuery('')} hitSlop={10}><Ionicons name="close-circle" size={19} color={colors.muted} /></Pressable> : null}
        <Pressable onPress={onSort} hitSlop={10} style={s.sort}><Ionicons name="swap-vertical-outline" size={17} color={colors.mint} /><Text style={s.sortText}>{sort}</Text></Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
        {tabs.map((t) => <Pressable key={t} onPress={() => setFilter(t)} style={[s.tab, filter === t && s.active]}><Text style={[s.tabText, filter === t && s.activeText]}>{t}</Text></Pressable>)}
      </ScrollView>
    </>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  top: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kicker: { color: c.mint, fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  title: { color: c.ink, fontSize: 36, fontWeight: '800', marginTop: 5 },
  actions: { flexDirection: 'row', gap: 10 },
  icon: { width: 43, height: 43, borderRadius: 15, backgroundColor: c.lime, alignItems: 'center', justifyContent: 'center' },
  iconDark: { width: 43, height: 43, borderRadius: 15, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: spacing.lg, borderWidth: 1, borderColor: c.line, backgroundColor: c.panel, borderRadius: 15, height: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 },
  input: { flex: 1, color: c.ink, fontSize: 14 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sortText: { color: c.mint, fontSize: 11, fontWeight: '700' },
  tabs: { padding: spacing.lg, flexDirection: 'row', gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: c.panel },
  active: { backgroundColor: c.mint },
  tabText: { color: c.muted, fontWeight: '700', fontSize: 12 },
  activeText: { color: c.onMint },
});
