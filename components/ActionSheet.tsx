import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/lib/theme';

export type SheetAction = { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; danger?: boolean };

export function ActionSheet({ visible, title, actions, onClose }: { visible: boolean; title: string; actions: SheetAction[]; onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <View style={[s.sheet, { backgroundColor: colors.panel }]} onStartShouldSetResponder={() => true}>
          <View style={[s.handle, { backgroundColor: colors.line }]} />
          <Text numberOfLines={1} style={[s.title, { color: colors.ink }]}>{title}</Text>
          <ScrollView style={s.scroll} contentContainerStyle={s.grid}>
            {actions.map((a) => (
              <Pressable key={a.label} onPress={() => { onClose(); a.onPress(); }} style={[s.action, { backgroundColor: colors.panelAlt }]}>
                <View style={[s.icon, { backgroundColor: colors.forest }]}><Ionicons name={a.icon} size={21} color={a.danger ? colors.danger : colors.mint} /></View>
                <Text style={[s.label, { color: a.danger ? colors.danger : colors.ink }]}>{a.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.48)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 35 },
  handle: { width: 42, height: 4, borderRadius: 3, alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  scroll: { maxHeight: 440 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { width: '47%', borderRadius: 16, padding: 13, gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 12, fontWeight: '700' },
});
