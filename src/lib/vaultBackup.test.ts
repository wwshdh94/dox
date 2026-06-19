import { describe, expect, it } from 'vitest';
import {
  BACKUP_VERSION,
  decryptVaultBackup,
  encryptVaultBackup,
  parseBackupJson,
  type VaultExportPayload,
} from './vaultBackup';

const samplePayload: VaultExportPayload = {
  user: { id: 'u1', email: 'a@b.com', name: 'Test', plan: 'pro', referralCode: 'TEST1234', referralUploads: 0, referralQualified: false },
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
  it('encrypts and decrypts vault payload', async () => {
    const backup = await encryptVaultBackup(samplePayload, 'test-passphrase-123');
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.app).toBe('dox');

    const restored = await decryptVaultBackup(backup, 'test-passphrase-123');
    expect(restored.documents[0]?.title).toBe('Passport');
    expect(restored.user?.email).toBe('a@b.com');
  });

  it('rejects wrong passphrase', async () => {
    const backup = await encryptVaultBackup(samplePayload, 'correct-pass');
    await expect(decryptVaultBackup(backup, 'wrong-pass')).rejects.toThrow();
  });

  it('parses backup json', () => {
    const json = JSON.stringify({ version: 1, app: 'dox', createdAt: '', salt: 'a', iv: 'b', ciphertext: 'c' });
    expect(parseBackupJson(json).app).toBe('dox');
  });
});
