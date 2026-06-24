import { describe, expect, it } from 'vitest';
import {
  BACKUP_VERSION,
  decryptLegacyVaultBackup,
  decryptVaultBackup,
  encryptVaultBackup,
  parseBackupJson,
  type VaultExportPayload,
} from './vaultBackup';

const userId = 'google-user-abc123';

const samplePayload: VaultExportPayload = {
  user: { id: userId, email: 'a@b.com', name: 'Test', plan: 'pro', referralCode: 'TEST1234', referralUploads: 0, referralQualified: false },
  members: [],
  assets: [],
  documents: [{ id: 'd1', title: 'Passport', docType: 'passport', fields: {}, createdAt: '', updatedAt: '' }],
  activities: [],
  shareGrants: [],
  tempLinks: [],
  bundles: [],
  bundleShareLinks: [],
  visitingCard: null,
  settings: {
    theme: 'system',
    pushReminders: true,
    emailReminders: true,
    cloudAiEnabled: false,
    privacyMode: true,
    onboardingComplete: true,
  },
};

describe('vaultBackup', () => {
  it('encrypts and decrypts vault payload with account key', async () => {
    const backup = await encryptVaultBackup(samplePayload, userId);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.app).toBe('prevault');
    expect(backup.ownerId).toBe(userId);

    const restored = await decryptVaultBackup(backup, userId);
    expect(restored.documents[0]?.title).toBe('Passport');
    expect(restored.user?.email).toBe('a@b.com');
  });

  it('rejects restore from a different account', async () => {
    const backup = await encryptVaultBackup(samplePayload, userId);
    await expect(decryptVaultBackup(backup, 'other-user')).rejects.toThrow(/different Google account/);
  });

  it('rejects v1 passphrase backups in main decrypt path', async () => {
    const legacy = {
      version: 1,
      app: 'prevault' as const,
      createdAt: '',
      salt: btoa('0123456789abcdef'),
      iv: btoa('012345678901'),
      ciphertext: 'invalid',
    };
    await expect(decryptVaultBackup(legacy, userId)).rejects.toThrow(/older passphrase/);
  });

  it('decrypts legacy dox backup files with legacy helper', async () => {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey('raw', enc.encode('legacy-pass'), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(JSON.stringify(samplePayload)),
    );
    const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
    const legacy = {
      version: 1,
      app: 'dox' as const,
      createdAt: new Date().toISOString(),
      salt: toB64(salt),
      iv: toB64(iv),
      ciphertext: toB64(new Uint8Array(encrypted)),
    };
    const restored = await decryptLegacyVaultBackup(legacy, 'legacy-pass');
    expect(restored.documents[0]?.title).toBe('Passport');
  });

  it('parses backup json', () => {
    const json = JSON.stringify({ version: 2, app: 'prevault', createdAt: '', salt: '', iv: 'b', ciphertext: 'c' });
    expect(parseBackupJson(json).app).toBe('prevault');
  });
});
