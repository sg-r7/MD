import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, type Palette } from '@/lib/theme';

export type Tool = 'select' | 'pen' | 'highlight' | 'eraser' | 'shape' | 'lasso' | 'text' | 'image' | 'sticker' | 'ruler' | 'magnifier';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tools: { id: Tool; icon: IconName; label: string }[] = [
  { id: 'select', icon: 'hand-left-outline', label: 'Read' },
  { id: 'pen', icon: 'pencil-outline', label: 'Pen' },
  { id: 'highlight', icon: 'color-fill-outline', label: 'Mark' },
  { id: 'eraser', icon: 'backspace-outline', label: 'Erase' },
  { id: 'shape', icon: 'shapes-outline', label: 'Shape' },
  { id: 'lasso', icon: 'scan-outline', label: 'Lasso' },
  { id: 'text', icon: 'document-text-outline', label: 'Note' },
  { id: 'image', icon: 'image-outline', label: 'Image' },
  { id: 'sticker', icon: 'happy-outline', label: 'Sticker' },
  { id: 'ruler', icon: 'resize-outline', label: 'Ruler' },
  { id: 'magnifier', icon: 'search-outline', label: 'Zoom' },
];

type Props = { tool: Tool; setTool: (tool: Tool) => void; zoom: number; canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void; onExport: () => void; onMore: () => void };

export function ToolBar({ tool, setTool, zoom, canUndo, canRedo, onUndo, onRedo, onExport, onMore }: Props) {
  const { colors, t } = useTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={[s.shell, { marginBottom: Math.max(insets.bottom, 8) }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.content}>
        <Pressable onPress={onUndo} disabled={!canUndo} style={[s.tool, !canUndo && s.off]}><Ionicons name="arrow-undo-outline" size={19} color={colors.mint} /><Text style={[s.label, s.accent]}>{t('Undo')}</Text></Pressable>
        <Pressable onPress={onRedo} disabled={!canRedo} style={[s.tool, !canRedo && s.off]}><Ionicons name="arrow-redo-outline" size={19} color={colors.mint} /><Text style={[s.label, s.accent]}>{t('Redo')}</Text></Pressable>
        <View style={s.sep} />
        {tools.map((item) => {
          const on = tool === item.id;
          return (
            <Pressable key={item.id} onPress={() => setTool(item.id)} style={[s.tool, on && s.selected]}>
              <Ionicons name={item.icon} size={19} color={on ? colors.onMint : colors.muted} />
              <Text style={[s.label, on && s.selectedLabel]}>{item.id === 'magnifier' && zoom > 1 ? `${zoom}x` : t(item.label)}</Text>
            </Pressable>
          );
        })}
        <View style={s.sep} />
        <Pressable onPress={onMore} style={s.tool}><Ionicons name="ellipsis-horizontal" size={20} color={colors.mint} /><Text style={[s.label, s.accent]}>{t('More')}</Text></Pressable>
        <Pressable onPress={onExport} style={s.tool}><Ionicons name="share-outline" size={20} color={colors.mint} /><Text style={[s.label, s.accent]}>{t('Share')}</Text></Pressable>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  shell: { marginHorizontal: 12, marginTop: 8, backgroundColor: c.panel, borderColor: c.line, borderWidth: 1, borderRadius: 22, paddingVertical: 7 },
  content: { paddingHorizontal: 7, alignItems: 'center' },
  tool: { minWidth: 54, alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 7, borderRadius: 14 },
  off: { opacity: 0.35 },
  selected: { backgroundColor: c.mint },
  label: { fontSize: 9, color: c.muted, fontWeight: '700' },
  selectedLabel: { color: c.onMint },
  accent: { color: c.mint },
  sep: { height: 28, width: 1, backgroundColor: c.line, marginHorizontal: 3 },
});
