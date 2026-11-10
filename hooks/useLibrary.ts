import { useCallback, useEffect, useMemo, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '@/constants/theme';
import type { DocumentRecord, Tag } from '@/types';
import { loadDocuments, saveDocuments } from '@/lib/storage';
const accents=[colors.mint,colors.lime,colors.amber,'#B9A7FF','#FF9FBD'];
export function useLibrary(){ const [documents,setDocuments]=useState<DocumentRecord[]>([]); const [query,setQuery]=useState(''); const [filter,setFilter]=useState<Tag>('All'); const [loading,setLoading]=useState(true);
 useEffect(()=>{loadDocuments().then(setDocuments).finally(()=>setLoading(false));},[]);
 const persist=(next:DocumentRecord[])=>{setDocuments(next); void saveDocuments(next);};
 const importDocument=useCallback(async()=>{ const result=await DocumentPicker.getDocumentAsync({type:'application/pdf',copyToCacheDirectory:true,multiple:false}); if(result.canceled||result.assets.length===0) return; const asset=result.assets[0]!; const base=FileSystem.documentDirectory+'library/'; await FileSystem.makeDirectoryAsync(base,{intermediates:true}).catch(()=>{}); const destination=base+`${Date.now()}-${asset.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`; await FileSystem.copyAsync({from:asset.uri,to:destination}); const now=new Date().toISOString(); const doc:DocumentRecord={id:String(Date.now()),name:asset.name,uri:destination,size:asset.size||0,createdAt:now,updatedAt:now,favorite:false,tags:['Study'],folder:'My Library',progress:0,accent:accents[documents.length%accents.length]??colors.mint}; persist([doc,...documents]); return doc; },[documents]);
 const toggleFavorite=(id:string)=>persist(documents.map(d=>d.id===id?{...d,favorite:!d.favorite}:d));
 const filtered=useMemo(()=>documents.filter(d=>{const text=`${d.name} ${d.tags.join(' ')} ${d.folder}`.toLowerCase(); const matches=text.includes(query.toLowerCase()); const matchesFilter=filter==='All'||(filter==='Favorites'?d.favorite:filter==='Recent'?true:d.tags.includes(filter)); return matches&&matchesFilter;}),[documents,filter,query]);
 return {documents,filtered,query,setQuery,filter,setFilter,importDocument,toggleFavorite,loading}; }
