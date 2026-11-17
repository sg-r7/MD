import { useEffect, useState } from 'react';
import { ensureCover } from '@/lib/thumbnails';
import type { DocumentRecord } from '@/types';

/** Map of document id -> cover image URI, filled in as covers are generated. */
export function useCovers(documents: DocumentRecord[]) {
  const [covers, setCovers] = useState<Record<string, string>>({});
  useEffect(() => {
    let active = true;
    documents.forEach((doc) => {
      if (covers[doc.id]) return;
      void ensureCover(doc).then((uri) => { if (active && uri) setCovers((c) => (c[doc.id] === uri ? c : { ...c, [doc.id]: uri })); });
    });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);
  return covers;
}
