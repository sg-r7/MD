import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet } from '@/components/ActionSheet';
import { DocumentCard } from '@/components/DocumentCard';
import { LibraryHeader } from '@/components/LibraryHeader';
import { PromptModal } from '@/components/PromptModal';
import { Screen } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { useLibrary } from '@/hooks/useLibrary';
import { useTheme, type Palette } from '@/lib/theme';
import type { DocumentRecord } from '@/types';

export default function Home() {
  const router = useRouter();
  const lib = useLibrary();
  const { colors, t } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const [active, setActive] = useState<DocumentRecord>();
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Progress, last page and "Recent" change in the reader, so refresh whenever the library regains focus.
  useFocusEffect(useCallback(() => { void lib.reload(); }, [lib.reload]));

  const current = active ? lib.documents.find((d) => d.id === active.id) ?? active : undefined;

  return (
    <Screen>
      <LibraryHeader query={lib.query} setQuery={lib.setQuery} filter={lib.filter} setFilter={lib.setFilter} sort={lib.sort} onSort={lib.cycleSort}
        onImport={() => void lib.importDocument()} onSettings={() => router.push('/settings')} />
      <FlatList
        data={lib.filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => <DocumentCard doc={item} onPress={() => router.push(`/reader/${item.id}`)} onFavorite={() => lib.toggleFavorite(item.id)} onLongPress={() => setActive(item)} />}
        ListHeaderComponent={<View style={s.section}><Text style={s.sectionTitle}>{lib.filter === 'All' ? t('All documents') : t(lib.filter)}</Text><Text style={s.count}>{lib.filtered.length} {lib.filtered.length === 1 ? t('file') : t('files')}</Text></View>}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="library-outline" size={30} color={colors.mint} /></View>
            <Text style={s.emptyTitle}>{lib.loading ? t('Loading library...') : lib.query || lib.filter !== 'All' ? t('Nothing here yet') : t('Your library is ready')}</Text>
            <Text style={s.emptyBody}>{lib.query || lib.filter !== 'All' ? t('Try another search or filter.') : t('Import a PDF to start reading, annotating, and keeping your ideas in one place.')}</Text>
            {!lib.query && lib.filter === 'All' && <Pressable onPress={() => void lib.importDocument()} style={s.cta}><Ionicons name="add" size={18} color={colors.onLime} /><Text style={s.ctaText}>{t('Import PDF')}</Text></Pressable>}
          </View>
        }
      />
      <ActionSheet
        visible={!!current && !renaming && !confirmDelete}
        title={current?.name ?? ''}
        onClose={() => setActive(undefined)}
        actions={current ? [
          { icon: 'open-outline', label: t('Open'), onPress: () => router.push(`/reader/${current.id}`) },
          { icon: current.favorite ? 'heart-dislike-outline' : 'heart-outline', label: current.favorite ? t('Unfavorite') : t('Favorite'), onPress: () => lib.toggleFavorite(current.id) },
          { icon: 'school-outline', label: current.tags.includes('Study') ? t('Remove Study tag') : t('Tag as Study'), onPress: () => lib.toggleTag(current.id, 'Study') },
          { icon: 'briefcase-outline', label: current.tags.includes('Work') ? t('Remove Work tag') : t('Tag as Work'), onPress: () => lib.toggleTag(current.id, 'Work') },
          { icon: 'create-outline', label: t('Rename'), onPress: () => setRenaming(true) },
          { icon: 'trash-outline', label: t('Delete'), danger: true, onPress: () => setConfirmDelete(true) },
        ] : []}
      />
      <PromptModal visible={renaming} title={t('Rename document')} initial={current?.name.replace(/\.pdf$/i, '') ?? ''} submitLabel="Rename"
        onSubmit={(value) => current && lib.rename(current.id, value)} onClose={() => { setRenaming(false); setActive(undefined); }} />
      <ActionSheet visible={confirmDelete} title={t('Delete “{name}” and its annotations?', { name: current?.name ?? '' })}
        onClose={() => { setConfirmDelete(false); setActive(undefined); }}
        actions={[{ icon: 'trash', label: t('Yes, delete'), danger: true, onPress: () => current && void lib.remove(current.id) }, { icon: 'close', label: t('Cancel'), onPress: () => {} }]} />
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: c.ink },
  count: { color: c.muted, fontSize: 12 },
  empty: { alignItems: 'center', padding: 40, marginTop: 50 },
  emptyIcon: { width: 70, height: 70, borderRadius: 24, backgroundColor: c.panel, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: c.ink, fontSize: 20, fontWeight: '800' },
  emptyBody: { color: c.muted, textAlign: 'center', lineHeight: 21, marginTop: 10, maxWidth: 280 },
  cta: { marginTop: 22, backgroundColor: c.lime, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 15, flexDirection: 'row', gap: 8, alignItems: 'center' },
  ctaText: { color: c.onLime, fontWeight: '800' },
});
