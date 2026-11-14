import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnnotationState, AppSettings, DocumentRecord } from '@/types';

const KEYS = { docs: 'md.documents.v1', annotations: 'md.annotations.v1', settings: 'md.settings.v1' };
const read = async <T>(key: string, fallback: T): Promise<T> => {
  try { const raw = await AsyncStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
};

export const defaultSettings: AppSettings = { theme: 'system', pageMode: 'vertical', haptics: true, language: 'system', nightMode: false };
export const emptyAnnotations = (): AnnotationState => ({ strokes: [], notes: [], images: [] });

export const loadDocuments = () => read<DocumentRecord[]>(KEYS.docs, []);
export const saveDocuments = (value: DocumentRecord[]) => AsyncStorage.setItem(KEYS.docs, JSON.stringify(value));
/** Read-modify-write one document so screens never overwrite each other's fields. */
export async function patchDocument(id: string, patch: Partial<DocumentRecord>) {
  const docs = await loadDocuments();
  const next = docs.map((d) => (d.id === id ? { ...d, ...patch } : d));
  await saveDocuments(next);
  return next.find((d) => d.id === id);
}

export async function loadAnnotations(id: string): Promise<AnnotationState> {
  const raw = await read<Partial<AnnotationState>>(`${KEYS.annotations}.${id}`, {});
  return { strokes: raw.strokes ?? [], notes: raw.notes ?? [], images: raw.images ?? [], view: raw.view };
}
export const saveAnnotations = (id: string, value: AnnotationState) => AsyncStorage.setItem(`${KEYS.annotations}.${id}`, JSON.stringify(value));
export const removeAnnotations = (id: string) => AsyncStorage.removeItem(`${KEYS.annotations}.${id}`);

export const loadSettings = async () => ({ ...defaultSettings, ...(await read<Partial<AppSettings>>(KEYS.settings, {})) });
export const saveSettings = (value: AppSettings) => AsyncStorage.setItem(KEYS.settings, JSON.stringify(value));
