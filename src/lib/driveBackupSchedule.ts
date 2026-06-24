import type { AppSettings } from '@/types';

export type DriveBackupSchedule = 'off' | 'daily' | 'weekly';

export const DRIVE_BACKUP_INTERVAL_MS: Record<Exclude<DriveBackupSchedule, 'off'>, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

export function normalizeDriveBackupSchedule(
  schedule: DriveBackupSchedule | undefined,
): DriveBackupSchedule {
  return schedule ?? 'off';
}

export function lastDriveBackupAt(
  settings: Pick<AppSettings, 'lastBackupAt' | 'lastBackupProvider'>,
): string | undefined {
  return settings.lastBackupProvider === 'google_drive' ? settings.lastBackupAt : undefined;
}

export function isDriveBackupDue(
  schedule: DriveBackupSchedule | undefined,
  settings: Pick<AppSettings, 'lastBackupAt' | 'lastBackupProvider'>,
  now = Date.now(),
): boolean {
  const normalized = normalizeDriveBackupSchedule(schedule);
  if (normalized === 'off') return false;

  const anchor = lastDriveBackupAt(settings);
  if (!anchor) return true;

  const elapsed = now - new Date(anchor).getTime();
  return elapsed >= DRIVE_BACKUP_INTERVAL_MS[normalized];
}

export function msUntilDriveBackupDue(
  schedule: DriveBackupSchedule | undefined,
  settings: Pick<AppSettings, 'lastBackupAt' | 'lastBackupProvider'>,
  now = Date.now(),
): number | null {
  const normalized = normalizeDriveBackupSchedule(schedule);
  if (normalized === 'off') return null;

  const anchor = lastDriveBackupAt(settings);
  if (!anchor) return 0;

  const remaining = DRIVE_BACKUP_INTERVAL_MS[normalized] - (now - new Date(anchor).getTime());
  return Math.max(0, remaining);
}

export function driveBackupScheduleLabel(schedule: DriveBackupSchedule): string {
  switch (schedule) {
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    default:
      return 'Off';
  }
}
