import { describe, expect, it } from 'vitest';
import {
  bytesToDataUrl,
  dataUrlToBytes,
  decryptFileBytes,
  encryptFileBytes,
} from '@/lib/householdCrypto';

describe('householdCrypto', () => {
  it('round-trips file bytes for a signed-in user', async () => {
    const original = new TextEncoder().encode('hello prevault').buffer;
    const encrypted = await encryptFileBytes(original, 'google-user-abc', 'text/plain');
    const decrypted = await decryptFileBytes(encrypted, 'google-user-abc');
    expect(new TextDecoder().decode(decrypted)).toBe('hello prevault');
  });

  it('converts data URLs to bytes and back', () => {
    const dataUrl = 'data:text/plain;base64,aGVsbG8=';
    const { bytes, mimeType } = dataUrlToBytes(dataUrl);
    expect(mimeType).toBe('text/plain');
    expect(bytesToDataUrl(bytes, mimeType)).toBe(dataUrl);
  });
});
