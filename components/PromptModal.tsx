import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/lib/theme';

type Props = { visible: boolean; title: string; initial?: string; placeholder?: string; multiline?: boolean; submitLabel?: string; onSubmit: (value: string) => void; onClose: () => void };

export function PromptModal({ visible, title, initial = '', placeholder, multiline, submitLabel = 'Save', onSubmit, onClose }: Props) {
  const { colors } = useTheme();
  const [value, setValue] = useState(initial);
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setValue(initial), 0);
    return () => clearTimeout(timer);
  }, [visible, initial]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
        <View style={[s.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[s.title, { color: colors.ink }]}>{title}</Text>
          <TextInput autoFocus value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline}
            style={[s.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.forest }, multiline && s.multiline]} />
          <View style={s.row}>
            <Pressable onPress={onClose} style={s.btn}><Text style={{ color: colors.muted, fontWeight: '700' }}>Cancel</Text></Pressable>
            <Pressable onPress={() => { onSubmit(value); onClose(); }} style={[s.btn, { backgroundColor: colors.lime }]}><Text style={{ color: colors.onLime, fontWeight: '800' }}>{submitLabel}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,.55)' },
  card: { borderRadius: 22, borderWidth: 1, padding: 18 },
  title: { fontSize: 17, fontWeight: '800', marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
});
