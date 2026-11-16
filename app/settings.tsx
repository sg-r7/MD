import { useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { spacing } from '@/constants/theme';
import { useTheme, type Palette } from '@/lib/theme';

const languages = ['system', 'en', 'ar'] as const;

type SettingsStyles = ReturnType<typeof makeStyles>;
type SettingsRowProps = { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; detail: string; right: React.ReactNode; onPress?: () => void; colors: Palette; styles: SettingsStyles };

function SettingsRow({ icon, title, detail, right, onPress, colors, styles }: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={19} color={colors.mint} /></View>
      <View style={styles.rowCopy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowDetail}>{detail}</Text></View>
      {right}
      {onPress ? <Ionicons name="chevron-forward" size={17} color={colors.muted} /> : null}
    </Pressable>
  );
}

export default function Settings() {
  const router = useRouter();
  const { colors, settings, update, tap, t } = useTheme();
  const s = useMemo(() => makeStyles(colors), [colors]);
  const themeDetail = { system: t('Follow device theme'), light: t('Light'), dark: t('Dark') }[settings.theme];
  const languageValue = settings.language === 'system' ? t('system') : settings.language === 'ar' ? 'العربية' : 'English';
  return (
    <Screen>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={s.back}><Ionicons name="arrow-back" size={22} color={colors.ink} /></Pressable>
        <View><Text style={s.kicker}>{t('MD READER')}</Text><Text style={s.title}>{t('Settings')}</Text></View>
      </View>
      <View style={s.content}>
        <Text style={s.label}>{t('READER')}</Text>
        <SettingsRow colors={colors} styles={s} icon="book-outline" title={t('Page direction')} detail={settings.pageMode === 'vertical' ? t('Swipe up and down between pages') : t('Swipe left and right between pages')}
          right={<Text style={s.value}>{t(settings.pageMode)}</Text>} onPress={() => { tap(); update({ pageMode: settings.pageMode === 'vertical' ? 'horizontal' : 'vertical' }); }} />
        <SettingsRow colors={colors} styles={s} icon="contrast-outline" title={t('Appearance')} detail={themeDetail}
          right={<Text style={s.value}>{t(settings.theme)}</Text>} onPress={() => { tap(); update({ theme: settings.theme === 'system' ? 'dark' : settings.theme === 'dark' ? 'light' : 'system' }); }} />
        <SettingsRow colors={colors} styles={s} icon="language-outline" title={t('Language')} detail={t('Follow device language')}
          right={<Text style={s.value}>{languageValue}</Text>} onPress={() => { tap(); update({ language: languages[(languages.indexOf(settings.language) + 1) % languages.length]! }); }} />
        <SettingsRow colors={colors} styles={s} icon="moon-outline" title={t('Night reading')} detail={t('Invert page colors for dark rooms (needs Android 12+ or iOS)')}
          right={<Switch value={settings.nightMode} onValueChange={(v) => update({ nightMode: v })} trackColor={{ false: colors.line, true: colors.mint }} thumbColor={colors.white} />} />
        <Text style={[s.label, { marginTop: 28 }]}>{t('PREFERENCES')}</Text>
        <SettingsRow colors={colors} styles={s} icon="phone-portrait-outline" title={t('Haptic feedback')} detail={t('Tactile feedback for tools and strokes')}
          right={<Switch value={settings.haptics} onValueChange={(v) => update({ haptics: v })} trackColor={{ false: colors.line, true: colors.mint }} thumbColor={colors.white} />} />
        <View style={s.about}>
          <Text style={s.aboutTitle}>MD</Text>
          <Text style={s.aboutText}>{t('A focused workspace for reading, thinking, and making sense of complex documents.')}</Text>
          <Text style={s.version}>{t('Version {v} · Built with Expo', { v: '1.2.0' })}</Text>
        </View>
      </View>
    </Screen>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  header: { padding: spacing.lg, paddingTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: { padding: 6 },
  kicker: { color: c.mint, fontSize: 11, fontWeight: '800', letterSpacing: 1.7 },
  title: { color: c.ink, fontSize: 32, fontWeight: '800', marginTop: 3 },
  content: { padding: spacing.lg, paddingTop: 0 },
  label: { color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 9 },
  row: { backgroundColor: c.panel, borderColor: c.line, borderWidth: 1, borderRadius: 16, minHeight: 68, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: c.panelAlt, alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1 },
  rowTitle: { color: c.ink, fontWeight: '700', fontSize: 15 },
  rowDetail: { color: c.muted, fontSize: 12, marginTop: 3 },
  value: { color: c.mint, fontSize: 12, fontWeight: '700' },
  about: { marginTop: 34, padding: 22, borderRadius: 20, backgroundColor: c.panelAlt },
  aboutTitle: { color: c.mint, fontSize: 26, fontWeight: '900' },
  aboutText: { color: c.ink, lineHeight: 21, marginTop: 8 },
  version: { color: c.muted, fontSize: 12, marginTop: 18 },
});
