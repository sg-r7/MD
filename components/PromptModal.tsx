import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/lib/theme';

type Props = {
  visible: boolean; title: string; initial?: string; placeholder?: string; multiline?: boolean; submitLabel?: string;
  palette?: string[]; initialColor?: string; keyboardType?: 'default' | 'number-pad'; onSubmit: (value: string, color?: string) => void; onClose: () => void;
};

export function PromptModal({ visible, title, initial = '', placeholder, multiline, submitLabel = 'Save', palette, initialColor, keyboardType, onSubmit, onClose }: Props) {
  const { colors, t } = useTheme();
  const [value, setValue] = useState(initial);
  const [picked, setPicked] = useState(initialColor ?? palette?.[0]);
  const defaultColor = initialColor ?? palette?.[0];
  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => { setValue(initial); setPicked(defaultColor); }, 0);
    return () => clearTimeout(timer);
  }, [visible, initial, defaultColor]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.backdrop}>
        <View style={[s.card, { backgroundColor: colors.panel, borderColor: colors.line }]}>
          <Text style={[s.title, { color: colors.ink }]}>{title}</Text>
          <TextInput autoFocus value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={colors.muted} multiline={multiline} keyboardType={keyboardType}
            style={[s.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.forest }, multiline && s.multiline]} />
          {palette && (
            <View style={s.palette}>
              {palette.map((c) => <Pressable key={c} onPress={() => setPicked(c)} style={[s.swatch, { backgroundColor: c, borderColor: picked === c ? colors.ink : 'transparent' }]} />)}
            </View>
          )}
          <View style={s.row}>
            <Pressable onPress={onClose} style={s.btn}><Text style={{ color: colors.muted, fontWeight: '700' }}>{t('Cancel')}</Text></Pressable>
            <Pressable onPress={() => { onSubmit(value, picked); onClose(); }} style={[s.btn, { backgroundColor: colors.lime }]}><Text style={{ color: colors.onLime, fontWeight: '800' }}>{t(submitLabel)}</Text></Pressable>
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
  palette: { flexDirection: 'row', gap: 10, marginTop: 14 },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2.5 },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  btn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
});
