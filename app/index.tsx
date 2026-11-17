import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet } from '@/components/ActionSheet';
import { DocumentCard } from '@/components/DocumentCard';
import { LibraryHeader } from '@/components/LibraryHeader';
import { NewNotebookModal } from '@/components/NewNotebookModal';
import { PromptModal } from '@/components/PromptModal';
import { Screen } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { useCovers } from '@/hooks/useCovers';
import { useLibrary } from '@/hooks/useLibrary';
import { createNotebook } from '@/lib/notebook';
import { useTheme, type Palette } from '@/lib/theme';
import type { DocumentRecord, Folder } from '@/types';

const folderColors = ['#A7F3D0', '#C8F169', '#F8C76D', '#B9A7FF', '#FF9FBD', '#7DD3FC'];

export default function Home() {
  const router = useRouter();
  const lib = useLibrary();
  const { colors, t } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const covers = useCovers(lib.documents);

  const [active, setActive] = useState<DocumentRecord>();
  const [renaming, setRenaming] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [folderMenu, setFolderMenu] = useState<Folder>();
  const [folderPrompt, setFolderPrompt] = useState<{ folder?: Folder } | null>(null);

  // Progress, last page and "Recent" change in the reader, so refresh whenever the library regains focus.
  useFocusEffect(useCallback(() => { void lib.reload(); }, [lib.reload]));

  const current = active ? lib.documents.find((d) => d.id === active.id) ?? active : undefined;
  const folderOf = (d: DocumentRecord) => lib.folders.find((f) => f.id === d.folderId);
  const showRecents = lib.filter === 'All' && !lib.query && !lib.folderFilter && lib.recents.length > 0;

  const makeNotebook = async (opts: { name: string; template: Parameters<typeof createNotebook>[0]['template']; pages: number }) => {
    const doc = await createNotebook({ ...opts, folderId: lib.folderFilter ?? undefined });
    await lib.reload();
    router.push(`/reader/${doc.id}`);
  };

  return (
    <Screen>
      <LibraryHeader query={lib.query} setQuery={lib.setQuery} filter={lib.filter} setFilter={lib.setFilter} sort={lib.sort} onSort={lib.cycleSort}
        onAdd={() => setShowAdd(true)} onSettings={() => router.push('/settings')}
        folders={lib.folders} folderFilter={lib.folderFilter} setFolderFilter={lib.setFolderFilter} onNewFolder={() => setFolderPrompt({})} onFolderMenu={setFolderMenu} />
      <FlatList
        data={lib.filtered}
        keyExtractor={(d) => d.id}
        contentContainerStyle={s.list}
        renderItem={({ item }) => (
          <DocumentCard doc={item} cover={covers[item.id]} folderColor={folderOf(item)?.color} onPress={() => router.push(`/reader/${item.id}`)}
            onFavorite={() => lib.toggleFavorite(item.id)} onLongPress={() => setActive(item)} />
        )}
        ListHeaderComponent={
          <>
            {showRecents && (
              <View style={s.recents}>
                <Text style={s.sectionTitle}>{t('Continue reading')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.recentRow}>
                  {lib.recents.map((d) => (
                    <Pressable key={d.id} onPress={() => router.push(`/reader/${d.id}`)} style={s.recent}>
                      <View style={[s.recentCover, { backgroundColor: d.accent }]}>{covers[d.id] ? <Image source={{ uri: covers[d.id] }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}</View>
                      <Text numberOfLines={2} style={s.recentName}>{d.name.replace(/\.pdf$/i, '')}</Text>
                      <View style={s.recentBar}><View style={[s.recentFill, { width: `${Math.round(d.progress * 100)}%` }]} /></View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={s.section}><Text style={s.sectionTitle}>{lib.filter === 'All' ? t('All documents') : t(lib.filter)}</Text><Text style={s.count}>{lib.filtered.length} {lib.filtered.length === 1 ? t('file') : t('files')}</Text></View>
          </>
        }
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="library-outline" size={30} color={colors.mint} /></View>
            <Text style={s.emptyTitle}>{lib.loading ? t('Loading library...') : lib.query || lib.filter !== 'All' || lib.folderFilter ? t('Nothing here yet') : t('Your library is ready')}</Text>
            <Text style={s.emptyBody}>{lib.query || lib.filter !== 'All' || lib.folderFilter ? t('Try another search or filter.') : t('Import a PDF to start reading, annotating, and keeping your ideas in one place.')}</Text>
            {!lib.query && lib.filter === 'All' && !lib.folderFilter && <Pressable onPress={() => setShowAdd(true)} style={s.cta}><Ionicons name="add" size={18} color={colors.onLime} /><Text style={s.ctaText}>{t('Add')}</Text></Pressable>}
          </View>
        }
      />

      <ActionSheet visible={showAdd} title={t('Add')} onClose={() => setShowAdd(false)} actions={[
        { icon: 'document-attach-outline', label: t('Import PDF'), onPress: () => void lib.importDocument() },
        { icon: 'create-outline', label: t('New notebook'), onPress: () => setShowNotebook(true) },
        { icon: 'folder-open-outline', label: t('New folder'), onPress: () => setFolderPrompt({}) },
      ]} />
      <NewNotebookModal visible={showNotebook} onClose={() => setShowNotebook(false)} onCreate={(o) => void makeNotebook(o)} />

      <ActionSheet
        visible={!!current && !renaming && !confirmDelete && !moving}
        title={current?.name ?? ''}
        onClose={() => setActive(undefined)}
        actions={current ? [
          { icon: 'open-outline', label: t('Open'), onPress: () => router.push(`/reader/${current.id}`) },
          { icon: current.favorite ? 'heart-dislike-outline' : 'heart-outline', label: current.favorite ? t('Unfavorite') : t('Favorite'), onPress: () => lib.toggleFavorite(current.id) },
          { icon: 'folder-outline', label: t('Move to folder'), onPress: () => setMoving(true) },
          { icon: 'school-outline', label: current.tags.includes('Study') ? t('Remove Study tag') : t('Tag as Study'), onPress: () => lib.toggleTag(current.id, 'Study') },
          { icon: 'briefcase-outline', label: current.tags.includes('Work') ? t('Remove Work tag') : t('Tag as Work'), onPress: () => lib.toggleTag(current.id, 'Work') },
          { icon: 'create-outline', label: t('Rename'), onPress: () => setRenaming(true) },
          { icon: 'trash-outline', label: t('Delete'), danger: true, onPress: () => setConfirmDelete(true) },
        ] : []}
      />
      <ActionSheet visible={moving} title={t('Move to folder')} onClose={() => { setMoving(false); setActive(undefined); }} actions={current ? [
        { icon: 'albums-outline', label: t('No folder'), onPress: () => lib.moveToFolder(current.id, undefined) },
        ...lib.folders.map((f) => ({ icon: (current.folderId === f.id ? 'checkmark-circle' : 'folder') as 'folder', label: f.name, onPress: () => lib.moveToFolder(current.id, f.id) })),
        { icon: 'add-circle-outline', label: t('New folder'), onPress: () => setFolderPrompt({}) },
      ] : []} />
      <PromptModal visible={renaming} title={t('Rename document')} initial={current?.name.replace(/\.pdf$/i, '') ?? ''} submitLabel="Rename"
        onSubmit={(value) => current && lib.rename(current.id, value)} onClose={() => { setRenaming(false); setActive(undefined); }} />
      <ActionSheet visible={confirmDelete} title={t('Delete “{name}” and its annotations?', { name: current?.name ?? '' })}
        onClose={() => { setConfirmDelete(false); setActive(undefined); }}
        actions={[{ icon: 'trash', label: t('Yes, delete'), danger: true, onPress: () => current && void lib.remove(current.id) }, { icon: 'close', label: t('Cancel'), onPress: () => {} }]} />

      <ActionSheet visible={!!folderMenu} title={folderMenu?.name ?? ''} onClose={() => setFolderMenu(undefined)} actions={folderMenu ? [
        { icon: 'create-outline', label: t('Edit folder'), onPress: () => setFolderPrompt({ folder: folderMenu }) },
        { icon: 'trash-outline', label: t('Delete folder'), danger: true, onPress: () => lib.deleteFolder(folderMenu.id) },
      ] : []} />
      <PromptModal visible={!!folderPrompt} title={folderPrompt?.folder ? t('Edit folder') : t('New folder')} initial={folderPrompt?.folder?.name ?? ''} placeholder={t('Folder name')}
        palette={folderColors} initialColor={folderPrompt?.folder?.color} submitLabel="Save"
        onSubmit={(name, color) => { const c = color ?? folderColors[0]!; if (folderPrompt?.folder) lib.editFolder(folderPrompt.folder.id, name, c); else { const f = lib.createFolder(name, c); if (f && current) lib.moveToFolder(current.id, f.id); } }}
        onClose={() => { setFolderPrompt(null); setMoving(false); setActive(undefined); }} />
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  recents: { marginBottom: 20 },
  recentRow: { gap: 12, paddingTop: 12 },
  recent: { width: 104 },
  recentCover: { width: 104, height: 132, borderRadius: 12, overflow: 'hidden' },
  recentName: { color: c.ink, fontSize: 12, fontWeight: '700', marginTop: 8 },
  recentBar: { height: 3, backgroundColor: c.line, borderRadius: 2, marginTop: 6, overflow: 'hidden' },
  recentFill: { height: '100%', backgroundColor: c.mint },
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
