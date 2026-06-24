/**
 * UIDAI Aadhaar Secure QR decoder — 100% client-side.
 * Spec: https://uidai.gov.in/ecosystem/authentication-devices-documents/qr-code-reader.html
 */

import { imageDataFromSource, loadImageFromDataUrl } from '@/lib/ocrPreprocess';

export interface AadhaarQrData {
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  fathersName?: string;
  aadhaarLast4?: string;
  address?: string;
  /** Full 12-digit number when present in QR (older formats). */
  aadhaarNumber?: string;
  confidence: number;
  source: 'secure_qr';
}

const DELIMITER = 255;
const SECURE_QR_RE = /^\d{80,}$/;

/** Convert UIDAI base-10 Secure QR payload to bytes. */
export function base10ToBytes(base10: string): Uint8Array {
  let n = BigInt(base10.trim());
  if (n === 0n) return new Uint8Array(0);
  const bytes: number[] = [];
  while (n > 0n) {
    bytes.unshift(Number(n & 0xffn));
    n >>= 8n;
  }
  return new Uint8Array(bytes);
}

/** Split decompressed payload on delimiter byte 255. */
export function splitAadhaarQrFields(data: Uint8Array): Uint8Array[] {
  const fields: Uint8Array[] = [];
  let start = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] === DELIMITER) {
      if (i > start) fields.push(data.slice(start, i));
      start = i + 1;
    }
  }
  if (start < data.length) fields.push(data.slice(start));
  return fields;
}

function fieldToString(field: Uint8Array): string {
  if (field.length === 0) return '';
  return new TextDecoder('iso-8859-1').decode(field).trim();
}

function parseDobFromQr(raw: string): string | undefined {
  const m = raw.match(/^(\d{2})[\/\-.](\d{2})[\/\-.](\d{4})$/);
  if (!m) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function buildAddress(parts: string[]): string | undefined {
  const joined = parts.filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();
  return joined.length >= 6 ? joined : undefined;
}

/** Parse decompressed Secure QR bytes into structured fields. */
export function parseAadhaarSecureQrPayload(data: Uint8Array): AadhaarQrData | null {
  const fields = splitAadhaarQrFields(data);
  if (fields.length < 4) return null;

  const decode = (idx: number) => fieldToString(fields[idx] ?? new Uint8Array());

  // UIDAI field order after email/mobile indicator
  const referenceId = decode(1);
  const fullName = decode(2);
  const dobRaw = decode(3);
  const gender = decode(4);
  const careOf = decode(5);

  const addressParts = [
    decode(8),
    decode(10),
    decode(11),
    decode(12),
    decode(13),
    decode(14),
    decode(15),
  ];

  const aadhaarLast4 = referenceId.replace(/\D/g, '').slice(-4) || undefined;
  const dateOfBirth = parseDobFromQr(dobRaw);
  const address = buildAddress(addressParts);

  if (!fullName && !aadhaarLast4 && !dateOfBirth) return null;

  let confidence = 0.88;
  if (fullName) confidence += 0.04;
  if (dateOfBirth) confidence += 0.03;
  if (aadhaarLast4) confidence += 0.03;

  return {
    fullName: fullName || undefined,
    dateOfBirth,
    gender: gender || undefined,
    fathersName: careOf || undefined,
    aadhaarLast4,
    address,
    confidence: Math.min(confidence, 0.98),
    source: 'secure_qr',
  };
}

export async function decompressGzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('gzip_decompression_unavailable');
  }
  const ds = new DecompressionStream('gzip');
  const blob = new Blob([bytes]);
  const decompressed = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer();
  return new Uint8Array(decompressed);
}

/** Decode a Secure QR decimal string into Aadhaar fields. */
export async function decodeAadhaarSecureQr(qrData: string): Promise<AadhaarQrData | null> {
  const trimmed = qrData.trim();
  if (!SECURE_QR_RE.test(trimmed)) return null;

  try {
    const compressed = base10ToBytes(trimmed);
    const decompressed = await decompressGzipBytes(compressed);
    return parseAadhaarSecureQrPayload(decompressed);
  } catch {
    return null;
  }
}

function isSecureQrPayload(data: string): boolean {
  return SECURE_QR_RE.test(data.trim());
}

/** Scan image for Aadhaar Secure QR and decode if found. */
export async function scanAadhaarQrFromDataUrl(dataUrl: string): Promise<AadhaarQrData | null> {
  if (!dataUrl.startsWith('data:image/') || typeof document === 'undefined') return null;

  try {
    const img = await loadImageFromDataUrl(dataUrl);
    const imageData = imageDataFromSource(img, img.naturalWidth, img.naturalHeight);
    if (!imageData) return null;

    const jsQR = (await import('jsqr')).default;
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'attemptBoth',
    });
    if (!code?.data || !isSecureQrPayload(code.data)) return null;

    return decodeAadhaarSecureQr(code.data);
  } catch {
    return null;
  }
}

/** Map QR decode result to vault Aadhaar fields. */
export function aadhaarQrToFields(
  qr: AadhaarQrData,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (qr.fullName) out.fullName = qr.fullName;
  if (qr.dateOfBirth) out.dateOfBirth = qr.dateOfBirth;
  if (qr.fathersName) out.fathersName = qr.fathersName;
  if (qr.aadhaarNumber) out.aadhaarNumber = qr.aadhaarNumber;
  return out;
}
