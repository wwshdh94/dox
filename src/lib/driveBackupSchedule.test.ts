import { describe, expect, it } from 'vitest';
import {
  isDriveBackupDue,
  msUntilDriveBackupDue,
  normalizeDriveBackupSchedule,
} from '@/lib/driveBackupSchedule';

describe('driveBackupSchedule', () => {
  it('defaults schedule to off', () => {
    expect(normalizeDriveBackupSchedule(undefined)).toBe('off');
  });

  it('is due when no prior drive backup exists', () => {
    expect(isDriveBackupDue('daily', {}, Date.now())).toBe(true);
  });

  it('is not due after a recent drive backup', () => {
    const now = Date.parse('2026-06-24T12:00:00.000Z');
    expect(
      isDriveBackupDue(
        'daily',
        {
          lastBackupAt: '2026-06-24T10:00:00.000Z',
          lastBackupProvider: 'google_drive',
        },
        now,
      ),
    ).toBe(false);
  });

  it('ignores file backups when checking drive schedule', () => {
    const now = Date.parse('2026-06-24T12:00:00.000Z');
    expect(
      isDriveBackupDue(
        'weekly',
        {
          lastBackupAt: '2026-06-20T10:00:00.000Z',
          lastBackupProvider: 'file',
        },
        now,
      ),
    ).toBe(true);
  });

  it('reports ms until next backup', () => {
    const now = Date.parse('2026-06-24T12:00:00.000Z');
    const ms = msUntilDriveBackupDue(
      'daily',
      {
        lastBackupAt: '2026-06-24T10:00:00.000Z',
        lastBackupProvider: 'google_drive',
      },
      now,
    );
    expect(ms).toBe(22 * 60 * 60 * 1000);
  });
});
