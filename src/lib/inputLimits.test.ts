import { describe, expect, it } from 'vitest';
import {
  MAX_DOCUMENT_NOTES_CHARS,
  MAX_DOCUMENT_PAGES,
  MAX_UPLOAD_IMAGE_BYTES,
  clampText,
  estimateDataUrlBytes,
  sanitizeDocumentNotes,
  validateDocumentFilePayload,
  validatePageCount,
  validateUploadFile,
} from './inputLimits';

describe('inputLimits', () => {
  it('clamps text to max characters', () => {
    expect(clampText('  hello world  ', 5)).toBe('hello');
    expect(clampText('a'.repeat(10), 3)).toBe('aaa');
  });

  it('rejects oversized images', () => {
    const big = new File([new Uint8Array(MAX_UPLOAD_IMAGE_BYTES + 1)], 'big.jpg', {
      type: 'image/jpeg',
    });
    expect(validateUploadFile(big).ok).toBe(false);
  });

  it('accepts normal jpeg upload', () => {
    const ok = new File([new Uint8Array(1024)], 'scan.jpg', { type: 'image/jpeg' });
    expect(validateUploadFile(ok)).toEqual({ ok: true });
  });

  it('limits document page count', () => {
    expect(validatePageCount(MAX_DOCUMENT_PAGES - 1, 1).ok).toBe(true);
    expect(validatePageCount(MAX_DOCUMENT_PAGES, 1).ok).toBe(false);
  });

  it('sanitizes notes length', () => {
    const long = 'x'.repeat(MAX_DOCUMENT_NOTES_CHARS + 50);
    expect(sanitizeDocumentNotes(long)?.length).toBe(MAX_DOCUMENT_NOTES_CHARS);
  });

  it('estimates data URL size', () => {
    const tiny = 'data:image/png;base64,AAAA';
    expect(estimateDataUrlBytes(tiny)).toBeGreaterThan(0);
  });

  it('rejects too many pages in payload', () => {
    const page = 'data:image/jpeg;base64,' + 'A'.repeat(100);
    const urls = Array.from({ length: MAX_DOCUMENT_PAGES + 1 }, () => page);
    expect(validateDocumentFilePayload(urls[0], urls.slice(1)).ok).toBe(false);
  });
});
