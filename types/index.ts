export type Tag = 'All' | 'Recent' | 'Favorites' | 'Work' | 'Study';
export type DocumentRecord = { id:string; name:string; uri:string; size:number; createdAt:string; updatedAt:string; pages?:number; favorite:boolean; tags:string[]; folder:string; progress:number; accent:string; };
export type Stroke = { id:string; page:number; color:string; width:number; opacity:number; points:{x:number;y:number}[]; tool:'pen'|'highlight'|'eraser'; };
export type StickyNote = { id:string; page:number; x:number; y:number; text:string; color:string; };
export type AnnotationState = { strokes:Stroke[]; notes:StickyNote[]; };
export type AppSettings = { theme:'system'|'light'|'dark'; pageMode:'vertical'|'horizontal'; haptics:boolean; };

