import { describe, expect, it } from 'vitest';
import { profileBackupStatusLabel, profileVaultStats } from '@/lib/profileStats';

describe('profileStats', () => {
  it('counts active members and non-archived docs', () => {
    const stats = profileVaultStats(
      [
        { id: 'd1', archivedAt: undefined } as never,
        { id: 'd2', archivedAt: '2026-01-01' } as never,
      ],
      [
        { id: 'm1', status: 'active' } as never,
        { id: 'm2', status: 'disabled' } as never,
      ],
    );
    expect(stats.docs).toBe(1);
    expect(stats.activeMembers).toBe(1);
  });

  it('flags backup due when schedule elapsed', () => {
    const label = profileBackupStatusLabel({
      driveBackupSchedule: 'daily',
      lastBackupAt: '2020-01-01T00:00:00.000Z',
      lastBackupProvider: 'google_drive',
    } as never);
    expect(label.tone).toBe('warn');
    expect(label.label).toBe('Backup due');
  });
});
