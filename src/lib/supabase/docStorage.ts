import {
  bytesToDataUrl,
  dataUrlToBytes,
  decryptFileBytes,
  encryptFileBytes,
  type EncryptedFilePayload,
} from '@/lib/householdCrypto';
import { splitDocumentFilePages } from '@/lib/documentPages';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const HOUSEHOLD_DOCS_BUCKET = 'household-documents';

interface StoredDocFilesV2 {
  version: 2;
  pages: Array<{ mimeType: string; data: string }>;
}

function packDocumentPages(dataUrls: string[]): ArrayBuffer {
  const pages = dataUrls.map((url) => {
    const { bytes, mimeType } = dataUrlToBytes(url);
    const arr = new Uint8Array(bytes);
    let bin = '';
    for (const b of arr) bin += String.fromCharCode(b);
    return { mimeType, data: btoa(bin) };
  });
  const payload: StoredDocFilesV2 = { version: 2, pages };
  return new TextEncoder().encode(JSON.stringify(payload)).buffer;
}

function unpackDocumentPages(bytes: ArrayBuffer): string[] {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as StoredDocFilesV2;
    if (parsed.version === 2 && Array.isArray(parsed.pages) && parsed.pages.length > 0) {
      return parsed.pages.map((page) => {
        const bin = atob(page.data);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return bytesToDataUrl(out.buffer, page.mimeType);
      });
    }
  } catch {
    /* single-file legacy payload */
  }
  return [bytesToDataUrl(bytes, 'application/octet-stream')];
}

export function documentStoragePath(householdId: string, documentId: string): string {
  return `${householdId}/${documentId}.enc`;
}

export async function uploadEncryptedDocumentFile(
  householdId: string,
  documentId: string,
  fileDataUrls: string | string[],
  userId: string,
): Promise<{ ok: true; storagePath: string } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase is not configured' };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  try {
    const pages = Array.isArray(fileDataUrls) ? fileDataUrls : [fileDataUrls];
    const plain =
      pages.length === 1
        ? dataUrlToBytes(pages[0]!).bytes
        : packDocumentPages(pages);
    const mimeType = pages.length === 1 ? dataUrlToBytes(pages[0]!).mimeType : 'application/json';
    const encrypted = await encryptFileBytes(plain, userId, mimeType);
    const storagePath = documentStoragePath(householdId, documentId);
    const body = JSON.stringify(encrypted);
    const { error } = await supabase.storage
      .from(HOUSEHOLD_DOCS_BUCKET)
      .upload(storagePath, body, { upsert: true, contentType: 'application/json' });

    if (error) return { ok: false, error: error.message };
    return { ok: true, storagePath };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Upload failed' };
  }
}

export async function downloadDecryptedDocumentFile(
  storagePath: string,
  creatorUserId: string,
): Promise<
  | { ok: true; fileDataUrl: string; additionalFileDataUrls?: string[] }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'Supabase is not configured' };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  try {
    const { data, error } = await supabase.storage.from(HOUSEHOLD_DOCS_BUCKET).download(storagePath);
    if (error || !data) return { ok: false, error: error?.message ?? 'Download failed' };

    const text = await data.text();
    const payload = JSON.parse(text) as EncryptedFilePayload;
    const bytes = await decryptFileBytes(payload, creatorUserId);
    const pages = unpackDocumentPages(bytes);
    const split = splitDocumentFilePages(pages);
    if (!split.fileDataUrl) return { ok: false, error: 'Download failed' };
    return {
      ok: true,
      fileDataUrl: split.fileDataUrl,
      additionalFileDataUrls: split.additionalFileDataUrls,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Download failed' };
  }
}

export async function deleteDocumentFileFromStorage(
  storagePath: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) return { ok: true };

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Supabase is not configured' };

  const { error } = await supabase.storage.from(HOUSEHOLD_DOCS_BUCKET).remove([storagePath]);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
