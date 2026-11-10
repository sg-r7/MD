import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AnnotationState, AppSettings, DocumentRecord } from '@/types';
const KEYS={docs:'md.documents.v1', annotations:'md.annotations.v1', settings:'md.settings.v1'};
const read = async <T>(key:string, fallback:T):Promise<T> => { try { const raw=await AsyncStorage.getItem(key); return raw?JSON.parse(raw) as T:fallback; } catch { return fallback; } };
export const loadDocuments=()=>read<DocumentRecord[]>(KEYS.docs,[]);
export const saveDocuments=(value:DocumentRecord[])=>AsyncStorage.setItem(KEYS.docs,JSON.stringify(value));
export const loadAnnotations=(id:string)=>read<AnnotationState>(`${KEYS.annotations}.${id}`,{strokes:[],notes:[]});
export const saveAnnotations=(id:string,value:AnnotationState)=>AsyncStorage.setItem(`${KEYS.annotations}.${id}`,JSON.stringify(value));
export const loadSettings=()=>read<AppSettings>(KEYS.settings,{theme:'system',pageMode:'vertical',haptics:true});
export const saveSettings=(value:AppSettings)=>AsyncStorage.setItem(KEYS.settings,JSON.stringify(value));

