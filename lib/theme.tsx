import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors as darkColors, lightColors } from '@/constants/theme';
import { systemLang, translate, type Lang } from '@/lib/i18n';
import { defaultSettings, loadSettings, saveSettings } from '@/lib/storage';
import type { AppSettings } from '@/types';

export type Palette = { [K in keyof typeof darkColors]: string };
type Ctx = { colors: Palette; isDark: boolean; settings: AppSettings; update: (patch: Partial<AppSettings>) => void; tap: () => void; lang: Lang; t: (key: string, vars?: Record<string, string | number>) => string };

const ThemeContext = createContext<Ctx>({ colors: darkColors, isDark: true, settings: defaultSettings, update: () => {}, tap: () => {}, lang: 'en', t: (key) => key });
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const ref = useRef(settings);
  const scheme = useColorScheme();

  useEffect(() => { loadSettings().then((s) => { ref.current = s; setSettings(s); }); }, []);

  const update = useCallback((patch: Partial<AppSettings>) => {
    const next = { ...ref.current, ...patch };
    ref.current = next;
    setSettings(next);
    void saveSettings(next);
  }, []);
  const tap = useCallback(() => { if (ref.current.haptics) void Haptics.selectionAsync().catch(() => {}); }, []);

  const isDark = settings.theme === 'system' ? scheme !== 'light' : settings.theme === 'dark';
  const lang: Lang = settings.language === 'system' ? systemLang() : settings.language;
  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const value = useMemo<Ctx>(() => ({ colors: isDark ? darkColors : lightColors, isDark, settings, update, tap, lang, t }), [isDark, settings, update, tap, lang, t]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
