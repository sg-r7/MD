import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '@/constants/theme';
import { deleteEditorNote } from '@/lib/editorStorage';
import { useTheme } from '@/lib/theme';
import { loadAnnotations, loadDocuments, removeAnnotations, saveDocuments } from '@/lib/storage';
import type { DocumentRecord, SortMode, Tag } from '@/types';

const accents = [colors.mint, colors.lime, colors.amber, '#B9A7FF', '#FF9FBD'];
const sorts: SortMode[] = ['date', 'name', 'size'];

export function useLibrary() {
  const { t } = useTheme();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const docsRef = useRef<DocumentRecord[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Tag>('All');
  const [sort, setSort] = useState<SortMode>('date');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const docs = await loadDocuments();
    docsRef.current = docs;
    setDocuments(docs);
    setLoading(false);
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  const persist = useCallback((next: DocumentRecord[]) => { docsRef.current = next; setDocuments(next); void saveDocuments(next); }, []);
  const patch = useCallback((id: string, change: Partial<DocumentRecord>) => persist(docsRef.current.map((d) => (d.id === id ? { ...d, ...change } : d))), [persist]);

  const importDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
      if (result.canceled || result.assets.length === 0) return;
      const asset = result.assets[0]!;
      const base = `${FileSystem.documentDirectory}library/`;
      await FileSystem.makeDirectoryAsync(base, { intermediates: true }).catch(() => {});
      const destination = `${base}${Date.now()}-${asset.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await FileSystem.copyAsync({ from: asset.uri, to: destination });
      await FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {});
      const now = new Date().toISOString();
      const doc: DocumentRecord = {
        id: String(Date.now()), name: asset.name, uri: destination, size: asset.size || 0, createdAt: now, updatedAt: now,
        favorite: false, tags: ['Study'], folder: 'My Library', progress: 0, accent: accents[docsRef.current.length % accents.length] ?? colors.mint,
      };
      persist([doc, ...docsRef.current]);
    } catch (error) {
      Alert.alert(t('Import failed'), error instanceof Error ? error.message : t('The file could not be imported.'));
    }
  }, [persist, t]);

  const toggleFavorite = (id: string) => patch(id, { favorite: !docsRef.current.find((d) => d.id === id)?.favorite });
  const toggleTag = (id: string, tag: 'Work' | 'Study') => {
    const tags = docsRef.current.find((d) => d.id === id)?.tags ?? [];
    patch(id, { tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag] });
  };
  const rename = (id: string, name: string) => { const clean = name.trim(); if (clean) patch(id, { name: clean.endsWith('.pdf') ? clean : `${clean}.pdf`, updatedAt: new Date().toISOString() }); };

  const remove = useCallback(async (id: string) => {
    const doc = docsRef.current.find((d) => d.id === id);
    if (!doc) return;
    const ann = await loadAnnotations(id);
    await Promise.all([
      FileSystem.deleteAsync(doc.uri, { idempotent: true }),
      ...ann.images.map((i) => FileSystem.deleteAsync(i.uri, { idempotent: true })),
      removeAnnotations(id), deleteEditorNote(`workspace-${id}`),
    ]).catch(() => {});
    persist(docsRef.current.filter((d) => d.id !== id));
  }, [persist]);

  const cycleSort = () => setSort((current) => sorts[(sorts.indexOf(current) + 1) % sorts.length]!);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = documents.filter((d) => {
      const text = `${d.name} ${d.tags.join(' ')} ${d.folder}`.toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filter === 'Favorites') return d.favorite;
      if (filter === 'Recent') return !!d.lastOpenedAt;
      if (filter === 'All') return true;
      return d.tags.includes(filter);
    });
    if (filter === 'Recent') return list.sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? ''));
    if (sort === 'name') return list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'size') return list.sort((a, b) => b.size - a.size);
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [documents, filter, query, sort]);

  return { documents, filtered, query, setQuery, filter, setFilter, sort, cycleSort, importDocument, toggleFavorite, toggleTag, rename, remove, reload, loading };
}
