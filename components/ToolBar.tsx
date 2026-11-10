import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export type Tool = 'select' | 'pen' | 'highlight' | 'eraser' | 'shape' | 'lasso' | 'text' | 'image' | 'sticker' | 'ruler' | 'magnifier';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tools: { id: Tool; icon: IconName; label: string }[] = [
  { id: 'select', icon: 'hand-left-outline', label: 'Read' },
  { id: 'pen', icon: 'pencil-outline', label: 'Pen' },
  { id: 'highlight', icon: 'color-fill-outline', label: 'Mark' },
  { id: 'eraser', icon: 'backspace-outline', label: 'Erase' },
  { id: 'shape', icon: 'shapes-outline', label: 'Shape' },
  { id: 'lasso', icon: 'scan-outline', label: 'Lasso' },
  { id: 'text', icon: 'text-outline', label: 'Text' },
  { id: 'image', icon: 'image-outline', label: 'Image' },
  { id: 'sticker', icon: 'happy-outline', label: 'Sticker' },
  { id: 'ruler', icon: 'resize-outline', label: 'Ruler' },
  { id: 'magnifier', icon: 'search-outline', label: 'Zoom' },
];

export function ToolBar({ tool, setTool, onExport, onMore }: { tool: Tool; setTool: (tool: Tool) => void; onExport: () => void; onMore: () => void }) {
  return (
    <View style={styles.shell}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tools.map((item) => (
          <Pressable key={item.id} onPress={() => setTool(item.id)} style={[styles.tool, tool === item.id && styles.selected]}>
            <Ionicons name={item.icon} size={19} color={tool === item.id ? colors.forest : colors.muted} />
            <Text style={[styles.label, tool === item.id && styles.selectedLabel]}>{item.label}</Text>
          </Pressable>
        ))}
        <View style={styles.sep} />
        <Pressable onPress={onMore} style={styles.tool}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.mint} />
          <Text style={[styles.label, styles.accentLabel]}>More</Text>
        </Pressable>
        <Pressable onPress={onExport} style={styles.tool}>
          <Ionicons name="share-outline" size={20} color={colors.mint} />
          <Text style={[styles.label, styles.accentLabel]}>Share</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { position: 'absolute', bottom: 16, left: 12, right: 12, backgroundColor: colors.panel, borderColor: colors.line, borderWidth: 1, borderRadius: 22, paddingVertical: 7 },
  content: { paddingHorizontal: 7, alignItems: 'center' },
  tool: { minWidth: 54, alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 7, borderRadius: 14 },
  selected: { backgroundColor: colors.mint },
  label: { fontSize: 9, color: colors.muted, fontWeight: '700' },
  selectedLabel: { color: colors.forest },
  accentLabel: { color: colors.mint },
  sep: { height: 28, width: 1, backgroundColor: colors.line, marginHorizontal: 3 },
});
