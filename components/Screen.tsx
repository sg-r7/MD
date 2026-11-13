import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/lib/theme';

export function Screen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <SafeAreaView style={[s.safe, { backgroundColor: colors.forest }]}><View style={s.body}>{children}</View></SafeAreaView>;
}
const s = StyleSheet.create({ safe: { flex: 1 }, body: { flex: 1, maxWidth: 1100, width: '100%', alignSelf: 'center' } });
