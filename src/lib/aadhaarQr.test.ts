import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  base10ToBytes,
  parseAadhaarSecureQrPayload,
  splitAadhaarQrFields,
} from './aadhaarQr';

function buildSecureQrPayload(fields: string[]): Uint8Array {
  const delimiter = Buffer.from([255]);
  const parts = fields.map((f) => Buffer.from(f, 'latin1'));
  const payload = Buffer.concat(
    parts.flatMap((part, index) => (index === 0 ? [part] : [delimiter, part])),
  );
  return new Uint8Array(payload);
}

describe('aadhaarQr', () => {
  it('splits fields on delimiter byte 255', () => {
    const data = new Uint8Array([65, 255, 66, 255, 67]);
    expect(splitAadhaarQrFields(data).map((f) => String.fromCharCode(f[0]))).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('converts base-10 payload to bytes', () => {
    const bytes = base10ToBytes('4660');
    expect(Array.from(bytes)).toEqual([0x12, 0x34]);
  });

  it('parses decompressed Secure QR demographic fields', () => {
    const decompressed = buildSecureQrPayload([
      '3',
      '01234567890123456789012',
      'RAHUL SHARMA',
      '15/08/1990',
      'M',
      'MOHAN SHARMA',
    ]);
    const parsed = parseAadhaarSecureQrPayload(decompressed);
    expect(parsed?.fullName).toBe('RAHUL SHARMA');
    expect(parsed?.dateOfBirth).toBe('1990-08-15');
    expect(parsed?.gender).toBe('M');
    expect(parsed?.fathersName).toBe('MOHAN SHARMA');
    expect(parsed?.aadhaarLast4).toBe('9012');
    expect(parsed?.confidence).toBeGreaterThan(0.9);
  });

  it('returns null for too-few fields', () => {
    expect(parseAadhaarSecureQrPayload(new Uint8Array([1, 2, 3]))).toBeNull();
  });

  it('round-trips gzip compression for Secure QR decimal payloads', async () => {
    const raw = buildSecureQrPayload(['3', 'REF9012', 'TEST USER', '01/01/1990', 'M', 'C/O PARENT']);
    const compressed = gzipSync(Buffer.from(raw));
    const decimal = [...compressed].reduce((acc, b) => acc * 256n + BigInt(b), 0n).toString();
    const { decodeAadhaarSecureQr } = await import('./aadhaarQr');
    const parsed = await decodeAadhaarSecureQr(decimal);
    expect(parsed?.fullName).toBe('TEST USER');
    expect(parsed?.aadhaarLast4).toBe('9012');
  });
});
