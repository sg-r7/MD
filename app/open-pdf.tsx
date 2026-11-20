import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { importPdfFromUri } from '@/lib/importPdf';
import { useTheme } from '@/lib/theme';
import { sameResource } from '@/lib/uri';

/** Landing screen for PDFs opened from other apps (Telegram, Files, WhatsApp...). Imports the file, then opens the reader. */
export default function OpenPdf() {
  const { uri } = useLocalSearchParams<{ uri?: string }>();
  const router = useRouter();
  const { colors, t } = useTheme();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(true);
  const started = useRef(false);

  const open = useCallback(async (source: string, preferred?: string) => {
    setBusy(true); setError(undefined);
    try {
      const doc = await importPdfFromUri(source, preferred);
      router.replace('/');
      router.push(`/reader/${doc.id}`);
    } catch (e) {
      setError(e instanceof Error && /not a valid PDF/i.test(e.message) ? e.message : 'Could not read this file from the other app.');
      setBusy(false);
    }
  }, [router]);

  useEffect(() => {
    if (!uri || started.current) return;
    started.current = true;
    // The untouched URL from the Android intent, when it is the same file, is the exact string the sender granted access to.
    void Linking.getInitialURL().catch(() => null).then((raw) => void open(uri, raw && sameResource(raw, uri) ? raw : undefined));
  }, [uri, open]);

  const choose = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
    if (!result.canceled && result.assets[0]) void open(result.assets[0].uri);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.forest }]}>
      {busy ? (
        <>
          <ActivityIndicator color={colors.mint} />
          <Text style={[s.body, { color: colors.muted, marginTop: 12 }]}>{t('Importing…')}</Text>
        </>
      ) : (
        <>
          <Text style={[s.title, { color: colors.ink }]}>{t('Import failed')}</Text>
          <Text style={[s.body, { color: colors.muted }]}>{t(error ?? 'Could not read this file from the other app.')}</Text>
          <Pressable onPress={() => void choose()} style={[s.button, { backgroundColor: colors.lime }]}><Text style={{ color: colors.onLime, fontWeight: '800' }}>{t('Choose a PDF file')}</Text></Pressable>
          <Pressable onPress={() => router.replace('/')} style={s.link}><Text style={{ color: colors.muted, fontWeight: '700' }}>{t('Go back')}</Text></Pressable>
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
  link: { marginTop: 14, padding: 8 },
});
