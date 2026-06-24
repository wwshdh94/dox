import { useEffect, useState } from 'react';
import type { Document } from '@/types';
import { getDocumentFilePages } from '@/lib/documentPages';
import { downloadDecryptedDocumentFile } from '@/lib/supabase/docStorage';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

/** Resolve preview URLs from local files or encrypted Supabase Storage. */
export function useDocumentFileUrl(
  doc: Pick<Document, 'fileDataUrl' | 'additionalFileDataUrls' | 'storagePath' | 'createdBy'> | null | undefined,
): {
  fileDataUrl?: string;
  additionalFileDataUrls?: string[];
  loading: boolean;
  error: string | null;
} {
  const [fileDataUrl, setFileDataUrl] = useState<string | undefined>(doc?.fileDataUrl);
  const [additionalFileDataUrls, setAdditionalFileDataUrls] = useState<string[] | undefined>(
    doc?.additionalFileDataUrls,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) {
      setFileDataUrl(undefined);
      setAdditionalFileDataUrls(undefined);
      setLoading(false);
      setError(null);
      return;
    }

    const localPages = getDocumentFilePages(doc);
    if (localPages.length > 0) {
      setFileDataUrl(localPages[0]);
      setAdditionalFileDataUrls(localPages.slice(1));
      setLoading(false);
      setError(null);
      return;
    }

    if (!doc.storagePath || !isSupabaseConfigured()) {
      setFileDataUrl(undefined);
      setAdditionalFileDataUrls(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const supabase = getSupabase();
      if (!supabase) {
        setError('Supabase is not configured');
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userError || !user) {
        setError(userError?.message ?? 'Not signed in');
        setLoading(false);
        return;
      }

      const creatorUserId = doc.createdBy ?? user.id;
      const res = await downloadDecryptedDocumentFile(doc.storagePath!, creatorUserId);
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }

      setFileDataUrl(res.fileDataUrl);
      setAdditionalFileDataUrls(res.additionalFileDataUrls);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [doc?.fileDataUrl, doc?.additionalFileDataUrls, doc?.storagePath, doc?.createdBy]);

  return { fileDataUrl, additionalFileDataUrls, loading, error };
}
