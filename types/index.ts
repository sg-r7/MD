export type Tag = 'All' | 'Recent' | 'Favorites' | 'Work' | 'Study';
export type Template = 'blank' | 'ruled' | 'grid' | 'dots';
export type Folder = { id: string; name: string; color: string };
export type SortMode = 'date' | 'name' | 'size';
export type Point = { x: number; y: number };

export type DocumentRecord = {
  id: string; name: string; uri: string; size: number; createdAt: string; updatedAt: string;
  lastOpenedAt?: string; pages?: number; lastPage?: number; bookmarks?: number[];
  /** 'notebook' = a blank-paper PDF created in the app; `template` is the paper used for pages added later. */
  kind?: 'pdf' | 'notebook'; template?: Template; folderId?: string;
  favorite: boolean; tags: string[]; folder: string; progress: number; accent: string;
};

export type StrokeTool = 'pen' | 'highlight' | 'line' | 'arrow' | 'rect' | 'ellipse';
/** Points are normalised (0..1) against the reader viewport. Shapes use [start, end]. */
export type Stroke = { id: string; page: number; color: string; width: number; opacity: number; points: Point[]; tool: StrokeTool };
export type StickyNote = { id: string; page: number; x: number; y: number; text: string; color: string; kind?: 'note' | 'sticker'; size?: number };
export type ImageItem = { id: string; page: number; x: number; y: number; w: number; aspect: number; uri: string };
/** version 2: coordinates are fractions of the page (0..1); stroke width is in units of 1/600 of the page width. */
export type AnnotationState = { strokes: Stroke[]; notes: StickyNote[]; images: ImageItem[]; version?: number; view?: { width: number; height: number } };
export type AppSettings = { theme: 'system' | 'light' | 'dark'; pageMode: 'vertical' | 'horizontal'; haptics: boolean; language: 'system' | 'en' | 'ar'; nightMode: boolean };
