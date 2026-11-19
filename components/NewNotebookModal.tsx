import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme';
import type { Template } from '@/types';

const options: { id: Template; icon: React.ComponentProps<typeof Ionicons>['name']; label: string }[] = [
  { id: 'blank', icon: 'square-outline', label: 'Blank' },
  { id: 'ruled', icon: 'reorder-three-outline', label: 'Ruled' },
  { id: 'grid', icon: 'grid-outline', label: 'Grid' },
  { id: 'dots', icon: 'ellipsis-horizontal', label: 'Dots' },
];
const pageCounts = [1, 5, 10, 20];

type Props = { visible: boolean; onClose: () => void; onCreate: (opts: { name: string; template: Template; pages: number }) => void };

export function NewNotebookModal({ visible, onClose, onCreate }: Props) {
  const { colors, t } = useTheme();
  const [name, setName] = useState('');
  const [template, setTemplate] = useState<Template>('ruled');
  const [pages, setPages] = useState(5);
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setName(''), 0);
    return () => clearTimeout(timer);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
        <View style={[s.sheet, { backgroundColor: colors.panel }]}>
          <View style={[s.handle, { backgroundColor: colors.line }]} />
          <Text style={[s.title, { color: colors.ink }]}>{t('New notebook')}</Text>
          <TextInput value={name} onChangeText={setName} placeholder={t('Notebook name')} placeholderTextColor={colors.muted}
            style={[s.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.forest }]} />
          <Text style={[s.label, { color: colors.muted }]}>{t('Paper')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
            {options.map((o) => (
              <Pressable key={o.id} onPress={() => setTemplate(o.id)} style={[s.chip, { backgroundColor: template === o.id ? colors.mint : colors.panelAlt }]}>
                <Ionicons name={o.icon} size={20} color={template === o.id ? colors.onMint : colors.muted} />
                <Text style={{ color: template === o.id ? colors.onMint : colors.muted, fontWeight: '700', fontSize: 12 }}>{t(o.label)}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={[s.label, { color: colors.muted }]}>{t('Pages')}</Text>
          <View style={s.row}>
            {pageCounts.map((n) => (
              <Pressable key={n} onPress={() => setPages(n)} style={[s.count, { backgroundColor: pages === n ? colors.mint : colors.panelAlt }]}>
                <Text style={{ color: pages === n ? colors.onMint : colors.muted, fontWeight: '800' }}>{n}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.actions}>
            <Pressable onPress={onClose} style={s.btn}><Text style={{ color: colors.muted, fontWeight: '700' }}>{t('Cancel')}</Text></Pressable>
            <Pressable onPress={() => { onCreate({ name: name.trim() || t('Notebook'), template, pages }); onClose(); }} style={[s.btn, { backgroundColor: colors.lime }]}>
              <Text style={{ color: colors.onLime, fontWeight: '800' }}>{t('Create')}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,.48)' },
  sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 22, paddingBottom: 34 },
  handle: { width: 42, height: 4, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginTop: 18, marginBottom: 9 },
  row: { flexDirection: 'row', gap: 10 },
  chip: { width: 74, paddingVertical: 11, borderRadius: 14, alignItems: 'center', gap: 5 },
  count: { minWidth: 54, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 24 },
  btn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 13 },
});
