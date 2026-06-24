/**
 * Per-user AES-256-GCM encryption for document files.
 * Key material: SHA-256(pepper + Supabase auth user id) — tied to Google login.
 */

export interface EncryptedFilePayload {
  version: 1;
  iv: string;
  ciphertext: string;
  mimeType?: string;
}

function appPepper(): string {
  return (import.meta.env.VITE_VAULT_PEPPER as string | undefined)?.trim() || 'prevault-dev-pepper';
}

function b64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(str: string): Uint8Array {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function getUserContentKey(userId: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const material = enc.encode(`${appPepper()}:${userId}`);
  const hash = await crypto.subtle.digest('SHA-256', material);
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptFileBytes(
  bytes: ArrayBuffer,
  userId: string,
  mimeType?: string,
): Promise<EncryptedFilePayload> {
  const key = await getUserContentKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return {
    version: 1,
    iv: b64(iv),
    ciphertext: b64(new Uint8Array(ciphertext)),
    mimeType,
  };
}

export async function decryptFileBytes(
  payload: EncryptedFilePayload,
  userId: string,
): Promise<ArrayBuffer> {
  const key = await getUserContentKey(userId);
  const iv = fromB64(payload.iv);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, fromB64(payload.ciphertext));
}

export function dataUrlToBytes(dataUrl: string): { bytes: ArrayBuffer; mimeType: string } {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error('Invalid data URL');
  const header = dataUrl.slice(0, comma);
  const mimeMatch = /^data:([^;]+)/.exec(header);
  const mimeType = mimeMatch?.[1] ?? 'application/octet-stream';
  const bin = atob(dataUrl.slice(comma + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return { bytes: out.buffer, mimeType };
}

export function bytesToDataUrl(bytes: ArrayBuffer, mimeType: string): string {
  const arr = new Uint8Array(bytes);
  let bin = '';
  for (const b of arr) bin += String.fromCharCode(b);
  return `data:${mimeType};base64,${btoa(bin)}`;
}
