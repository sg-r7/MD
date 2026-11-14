import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { shadow } from '@/constants/theme';
import { useTheme, type Palette } from '@/lib/theme';
import type { DocumentRecord } from '@/types';

const formatSize = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`);

export function DocumentCard({ doc, onPress, onFavorite, onLongPress }: { doc: DocumentRecord; onPress: () => void; onFavorite: () => void; onLongPress: () => void }) {
  const { colors, t } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const pct = Math.round(doc.progress * 100);
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [s.card, pressed && s.pressed]}>
      <View style={[s.cover, { backgroundColor: doc.accent }]}><Text style={s.coverText}>PDF</Text><View style={s.page}><Text style={s.pageText}>{doc.pages ? `${doc.pages}p` : 'MD'}</Text></View></View>
      <View style={s.info}>
        <View style={s.row}>
          <Text numberOfLines={2} style={s.name}>{doc.name}</Text>
          <Pressable onPress={onFavorite} hitSlop={12}><Ionicons name={doc.favorite ? 'heart' : 'heart-outline'} size={20} color={doc.favorite ? colors.amber : colors.muted} /></Pressable>
        </View>
        <Text style={s.meta}>{doc.tags.length ? doc.tags.map((tag) => t(tag)).join(' · ') : doc.folder}  ·  {formatSize(doc.size)}</Text>
        <View style={s.progress}><View style={[s.fill, { width: `${pct}%` }]} /></View>
        <Text style={s.progressText}>{pct ? t('{n}% complete', { n: pct }) : t('Not started')}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  card: { backgroundColor: c.panel, borderColor: c.line, borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', gap: 14, marginBottom: 12, ...shadow },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  cover: { width: 72, height: 92, borderRadius: 12, padding: 8, justifyContent: 'space-between' },
  coverText: { fontWeight: '900', fontSize: 12, color: '#0E1715' },
  page: { backgroundColor: 'rgba(255,255,255,.75)', alignSelf: 'flex-end', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  pageText: { fontSize: 10, fontWeight: '800', color: '#0E1715' },
  info: { flex: 1, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, color: c.ink, fontSize: 16, fontWeight: '700', lineHeight: 21 },
  meta: { color: c.muted, fontSize: 12, marginTop: 6 },
  progress: { height: 5, backgroundColor: c.line, borderRadius: 4, marginTop: 13, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: c.mint },
  progressText: { color: c.muted, fontSize: 11, marginTop: 6 },
});
