import AsyncStorage from '@react-native-async-storage/async-storage';

export type EditorNote = {
  id: string;
  documentId?: string;
  markdown: string;
  updatedAt: string;
};

const KEY = 'md.editor-notes.v1';

async function readNotes(): Promise<EditorNote[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) as EditorNote[] : [];
  } catch {
    return [];
  }
}

export async function loadEditorNotes() {
  return readNotes();
}

export async function loadEditorNote(id: string, documentId?: string) {
  const notes = await readNotes();
  return notes.find((note) => note.id === id && note.documentId === documentId) ?? notes.find((note) => note.id === id);
}

export async function saveEditorNote(note: EditorNote) {
  const notes = await readNotes();
  const next = [note, ...notes.filter((item) => item.id !== note.id)].slice(0, 50);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return note;
}

export function markdownPreview(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
