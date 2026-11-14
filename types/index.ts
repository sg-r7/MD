export type Tag = 'All' | 'Recent' | 'Favorites' | 'Work' | 'Study';
export type SortMode = 'date' | 'name' | 'size';
export type Point = { x: number; y: number };

export type DocumentRecord = {
  id: string; name: string; uri: string; size: number; createdAt: string; updatedAt: string;
  lastOpenedAt?: string; pages?: number; lastPage?: number; bookmarks?: number[];
  favorite: boolean; tags: string[]; folder: string; progress: number; accent: string;
};

export type StrokeTool = 'pen' | 'highlight' | 'line' | 'arrow' | 'rect' | 'ellipse';
/** Points are normalised (0..1) against the reader viewport. Shapes use [start, end]. */
export type Stroke = { id: string; page: number; color: string; width: number; opacity: number; points: Point[]; tool: StrokeTool };
export type StickyNote = { id: string; page: number; x: number; y: number; text: string; color: string; kind?: 'note' | 'sticker'; size?: number };
export type ImageItem = { id: string; page: number; x: number; y: number; w: number; aspect: number; uri: string };
export type AnnotationState = { strokes: Stroke[]; notes: StickyNote[]; images: ImageItem[]; view?: { width: number; height: number } };
export type AppSettings = { theme: 'system' | 'light' | 'dark'; pageMode: 'vertical' | 'horizontal'; haptics: boolean; language: 'system' | 'en' | 'ar'; nightMode: boolean };
