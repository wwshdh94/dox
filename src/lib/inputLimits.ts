/** Client-side input and payload limits — abuse prevention for uploads and text fields. */

import { VAULT_MAX_BYTES } from '@/lib/imageCompress';

// —— File uploads ——
/** Max raw image size before compression (camera originals). */
export const MAX_UPLOAD_IMAGE_BYTES = 12 * 1024 * 1024;
/** Max PDF size per file. */
export const MAX_UPLOAD_PDF_BYTES = 10 * 1024 * 1024;
/** Max pages (images/PDFs) per document record. */
export const MAX_DOCUMENT_PAGES = 10;
/** Max stored image size after compression. */
export const MAX_STORED_IMAGE_BYTES = VAULT_MAX_BYTES;
/** Max total stored payload per document (all pages as data URLs). */
export const MAX_DOCUMENT_PAYLOAD_BYTES = 14 * 1024 * 1024;

// —— Text fields ——
export const MAX_DOCUMENT_TITLE_CHARS = 120;
export const MAX_DOCUMENT_NOTES_CHARS = 2000;
export const MAX_FEEDBACK_MESSAGE_CHARS = 4000;
export const MAX_CONTACT_SUBJECT_CHARS = 120;
export const MAX_MEMBER_DISPLAY_NAME_CHARS = 80;
export const MAX_MEMBER_RELATIONSHIP_CHARS = 40;
export const MAX_MEMBER_EMAIL_CHARS = 254;
export const MAX_MEMBER_PHONE_CHARS = 24;
export const MAX_ASSET_LABEL_CHARS = 120;
export const MAX_BUNDLE_NAME_CHARS = 120;
export const MAX_BUNDLE_PURPOSE_CHARS = 200;
export const MAX_BUNDLE_DOCUMENTS = 30;
export const MAX_DOC_FIELD_VALUE_CHARS = 500;
export const MAX_HEALTH_FIELD_CHARS = 500;
export const MAX_VISITING_CARD_FIELD_CHARS = 200;
export const MAX_SHARE_NOTE_CHARS = 200;

export function formatLimitBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** Trim and cap string length (Unicode-safe via spread). */
export function clampText(value: string, maxChars: number): string {
  const trimmed = value.trim();
  const chars = [...trimmed];
  if (chars.length <= maxChars) return trimmed;
  return chars.slice(0, maxChars).join('');
}

export function validateUploadFile(
  file: File,
): { ok: true } | { ok: false; message: string } {
  const name = file.name?.trim() || 'file';
  if (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(name)) {
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      return {
        ok: false,
        message: `Image is too large (max ${formatLimitBytes(MAX_UPLOAD_IMAGE_BYTES)}). Try a smaller photo.`,
      };
    }
    return { ok: true };
  }
  if (file.type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
    if (file.size > MAX_UPLOAD_PDF_BYTES) {
      return {
        ok: false,
        message: `PDF is too large (max ${formatLimitBytes(MAX_UPLOAD_PDF_BYTES)}).`,
      };
    }
    return { ok: true };
  }
  return { ok: false, message: 'Only images and PDF files are supported.' };
}

export function validatePageCount(
  currentCount: number,
  adding = 1,
): { ok: true } | { ok: false; message: string } {
  if (currentCount + adding > MAX_DOCUMENT_PAGES) {
    return {
      ok: false,
      message: `A document can have at most ${MAX_DOCUMENT_PAGES} pages.`,
    };
  }
  return { ok: true };
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  const b64 = dataUrl.slice(comma + 1);
  return Math.floor((b64.length * 3) / 4);
}

export function maxStoredBytesForDataUrl(dataUrl: string): number {
  if (dataUrl.startsWith('data:application/pdf')) return MAX_UPLOAD_PDF_BYTES;
  return MAX_STORED_IMAGE_BYTES;
}

export function validateDocumentFilePayload(
  fileDataUrl?: string,
  additionalFileDataUrls?: string[],
): { ok: true } | { ok: false; message: string } {
  const urls = [fileDataUrl, ...(additionalFileDataUrls ?? [])].filter(Boolean) as string[];
  if (urls.length > MAX_DOCUMENT_PAGES) {
    return { ok: false, message: `Too many pages (max ${MAX_DOCUMENT_PAGES}).` };
  }

  let total = 0;
  for (const url of urls) {
    const size = estimateDataUrlBytes(url);
    const cap = maxStoredBytesForDataUrl(url);
    if (size > cap) {
      return {
        ok: false,
        message: `A file is too large to store (max ${formatLimitBytes(cap)} per page).`,
      };
    }
    total += size;
  }
  if (total > MAX_DOCUMENT_PAYLOAD_BYTES) {
    return {
      ok: false,
      message: `Document files are too large in total (max ${formatLimitBytes(MAX_DOCUMENT_PAYLOAD_BYTES)}).`,
    };
  }
  return { ok: true };
}

export function sanitizeDocumentTitle(title: string): string {
  return clampText(title, MAX_DOCUMENT_TITLE_CHARS) || 'Document';
}

export function sanitizeDocumentNotes(notes?: string): string | undefined {
  if (!notes?.trim()) return undefined;
  return clampText(notes, MAX_DOCUMENT_NOTES_CHARS);
}

export function sanitizeDocFieldValues(
  fields: Record<string, string | number | null | undefined>,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === null || value === undefined || value === '') continue;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      out[key] = value;
      continue;
    }
    out[key] = clampText(String(value), MAX_DOC_FIELD_VALUE_CHARS);
  }
  return out;
}

export function sanitizeFeedbackMessage(message: string): string {
  return clampText(message, MAX_FEEDBACK_MESSAGE_CHARS);
}

export function sanitizeMemberInput(m: {
  displayName?: string;
  email?: string;
  phone?: string;
  relationship?: string;
}): {
  displayName?: string;
  email?: string;
  phone?: string;
  relationship?: string;
} {
  const out: {
    displayName?: string;
    email?: string;
    phone?: string;
    relationship?: string;
  } = {};
  if (m.displayName !== undefined) {
    out.displayName = clampText(m.displayName, MAX_MEMBER_DISPLAY_NAME_CHARS);
  }
  if (m.email !== undefined) {
    out.email = clampText(m.email, MAX_MEMBER_EMAIL_CHARS).toLowerCase();
  }
  if (m.phone !== undefined) {
    out.phone = clampText(m.phone, MAX_MEMBER_PHONE_CHARS);
  }
  if (m.relationship !== undefined) {
    out.relationship = clampText(m.relationship, MAX_MEMBER_RELATIONSHIP_CHARS);
  }
  return out;
}

export function sanitizeAssetLabel(label: string): string {
  return clampText(label, MAX_ASSET_LABEL_CHARS) || 'Asset';
}

export function sanitizeBundleInput(b: { name?: string; purpose?: string; documentIds?: string[] }): {
  name?: string;
  purpose?: string;
  documentIds?: string[];
} {
  const out: { name?: string; purpose?: string; documentIds?: string[] } = {};
  if (b.name !== undefined) out.name = clampText(b.name, MAX_BUNDLE_NAME_CHARS);
  if (b.purpose !== undefined) out.purpose = clampText(b.purpose, MAX_BUNDLE_PURPOSE_CHARS);
  if (b.documentIds !== undefined) out.documentIds = b.documentIds.slice(0, MAX_BUNDLE_DOCUMENTS);
  return out;
}
