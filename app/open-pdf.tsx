import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { importPdfFromUri } from '@/lib/importPdf';
import { useTheme } from '@/lib/theme';

/** Landing screen for PDFs opened from other apps (Telegram, Files, WhatsApp...). Imports the file, then opens the reader. */
export default function OpenPdf() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const router = useRouter();
  const { colors, t } = useTheme();
  const [error, setError] = useState<string>();
  const started = useRef(false);

  useEffect(() => {
    if (!uri || started.current) return;
    started.current = true;
    importPdfFromUri(uri)
      .then((doc) => { router.replace('/'); router.push(`/reader/${doc.id}`); })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'The file could not be imported.'));
  }, [uri, router]);

  return (
    <View style={[s.root, { backgroundColor: colors.forest }]}>
      {error ? (
        <>
          <Text style={[s.title, { color: colors.ink }]}>{t('Import failed')}</Text>
          <Text style={[s.body, { color: colors.muted }]}>{t(error)}</Text>
          <Pressable onPress={() => router.replace('/')} style={[s.button, { backgroundColor: colors.lime }]}><Text style={{ color: colors.onLime, fontWeight: '800' }}>{t('Go back')}</Text></Pressable>
        </>
      ) : (
        <>
          <ActivityIndicator color={colors.mint} />
          <Text style={[s.body, { color: colors.muted, marginTop: 12 }]}>{t('Importing…')}</Text>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '800' },
  body: { textAlign: 'center', lineHeight: 21, marginTop: 8 },
  button: { marginTop: 20, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 13 },
});
