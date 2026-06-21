import type {
  ActivityLog,
  AppSettings,
  Asset,
  BundleShareLink,
  Document,
  FamilyMember,
  ShareGrant,
  SharedBundle,
  TempShareLink,
  User,
  VisitingCard,
} from '@/types';

export const BACKUP_FILE_EXT = '.prevaultbackup';
export const BACKUP_VERSION = 1;

export interface VaultExportPayload {
  user: User | null;
  members: FamilyMember[];
  assets: Asset[];
  documents: Document[];
  activities: ActivityLog[];
  shareGrants: ShareGrant[];
  tempLinks: TempShareLink[];
  bundles: SharedBundle[];
  bundleShareLinks: BundleShareLink[];
  visitingCard: VisitingCard | null;
  settings: AppSettings;
}

export type BackupAppId = 'prevault' | 'dox';

export interface EncryptedVaultBackup {
  version: number;
  app: BackupAppId;
  createdAt: string;
  salt: string;
  iv: string;
  ciphertext: string;
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

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptVaultBackup(
  payload: VaultExportPayload,
  passphrase: string,
): Promise<EncryptedVaultBackup> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    version: BACKUP_VERSION,
    app: 'prevault',
    createdAt: new Date().toISOString(),
    salt: b64(salt),
    iv: b64(iv),
    ciphertext: b64(new Uint8Array(encrypted)),
  };
}

function isSupportedBackupApp(app: string): app is BackupAppId {
  return app === 'prevault' || app === 'dox';
}

export async function decryptVaultBackup(
  file: EncryptedVaultBackup,
  passphrase: string,
): Promise<VaultExportPayload> {
  if (!isSupportedBackupApp(file.app) || file.version !== BACKUP_VERSION) {
    throw new Error('Unsupported backup file format.');
  }
  const salt = fromB64(file.salt);
  const iv = fromB64(file.iv);
  const key = await deriveKey(passphrase, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    fromB64(file.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as VaultExportPayload;
}

export function backupFileName(date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  return `prevault-vault-backup-${d}${BACKUP_FILE_EXT}`;
}

export function downloadBackupFile(backup: EncryptedVaultBackup, filename?: string): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? backupFileName(new Date(backup.createdAt));
  a.click();
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<EncryptedVaultBackup> {
  const text = await file.text();
  const parsed = JSON.parse(text) as EncryptedVaultBackup;
  if (!parsed.app || !parsed.ciphertext) {
    throw new Error('Invalid backup file.');
  }
  return parsed;
}

export function serializeBackup(backup: EncryptedVaultBackup): string {
  return JSON.stringify(backup);
}

export function parseBackupJson(text: string): EncryptedVaultBackup {
  const parsed = JSON.parse(text) as EncryptedVaultBackup;
  if (!parsed.app || !parsed.ciphertext) {
    throw new Error('Invalid backup file.');
  }
  return parsed;
}
