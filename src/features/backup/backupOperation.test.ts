import { describe, expect, it } from 'vitest';
import {
  backupProgressPercent,
  backupStepsForMode,
  restoreProgressPercent,
  restoreReportFromPayload,
  restoreSteps,
} from '@/features/backup/backupOperation';

describe('backupOperation', () => {
  it('builds drive backup steps with active phase', () => {
    const steps = backupStepsForMode('drive', 'encrypting');
    expect(steps.find((s) => s.id === 'preparing')?.status).toBe('done');
    expect(steps.find((s) => s.id === 'encrypting')?.status).toBe('active');
    expect(steps.find((s) => s.id === 'uploading')?.status).toBe('pending');
  });

  it('computes backup progress percent', () => {
    expect(backupProgressPercent('drive', 'done')).toBe(100);
    expect(backupProgressPercent('file', 'encrypting')).toBeGreaterThan(0);
  });

  it('builds restore steps', () => {
    const steps = restoreSteps('decrypting');
    expect(steps.find((s) => s.id === 'fetching')?.status).toBe('done');
    expect(steps.find((s) => s.id === 'decrypting')?.status).toBe('active');
    expect(restoreProgressPercent('decrypting')).toBeGreaterThan(0);
  });

  it('summarizes restore report', () => {
    const report = restoreReportFromPayload(
      {
        user: null,
        members: [{ id: '1' } as never],
        assets: [],
        documents: [{ id: 'd1' } as never, { id: 'd2' } as never],
        activities: [],
        shareGrants: [],
        tempLinks: [],
        bundles: [],
        bundleShareLinks: [],
        visitingCard: null,
        settings: { theme: 'system', pushReminders: true, emailReminders: false, cloudAiEnabled: false, privacyMode: true, onboardingComplete: true },
      },
      { version: 1, app: 'prevault', createdAt: '2026-06-01T00:00:00.000Z', salt: 'a', iv: 'b', ciphertext: 'c' },
      'backup.prevaultbackup',
    );
    expect(report.documents).toBe(2);
    expect(report.members).toBe(1);
    expect(report.sourceLabel).toBe('backup.prevaultbackup');
  });
});
