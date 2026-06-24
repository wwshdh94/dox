import type { AppSettings, User } from '@/types';
import { debug } from '@/lib/debug';
import {
  isDriveBackupDue,
  normalizeDriveBackupSchedule,
  type DriveBackupSchedule,
} from '@/lib/driveBackupSchedule';
import { getGoogleDriveAccessToken, isGoogleDriveConfigured, uploadBackupToDrive } from '@/lib/googleDrive';
import { canUseGoogleDriveBackup } from '@/lib/planLimits';
import { encryptVaultBackup, type VaultExportPayload } from '@/lib/vaultBackup';

export type ScheduledDriveBackupResult =
  | { status: 'skipped'; reason: string }
  | { status: 'success'; fileName: string; fileId: string }
  | { status: 'error'; message: string };

let running = false;

export async function runScheduledDriveBackup(opts: {
  user: User | null;
  settings: AppSettings;
  getVaultExportPayload: () => VaultExportPayload;
  recordBackup: (provider: 'google_drive', driveFileId?: string) => void;
}): Promise<ScheduledDriveBackupResult> {
  const { user, settings, getVaultExportPayload, recordBackup } = opts;

  const schedule = normalizeDriveBackupSchedule(settings.driveBackupSchedule);
  if (schedule === 'off') return { status: 'skipped', reason: 'schedule_off' };
  if (!user || user.isGuestPreview) return { status: 'skipped', reason: 'no_user' };
  if (!canUseGoogleDriveBackup(user)) return { status: 'skipped', reason: 'plan' };
  if (!isGoogleDriveConfigured()) return { status: 'skipped', reason: 'drive_not_configured' };
  if (!isDriveBackupDue(schedule, settings)) return { status: 'skipped', reason: 'not_due' };

  if (running) return { status: 'skipped', reason: 'already_running' };
  running = true;

  try {
    const payload = getVaultExportPayload();
    const backup = await encryptVaultBackup(payload, user.id);
    const token = await getGoogleDriveAccessToken();
    const { fileId, fileName } = await uploadBackupToDrive(token, backup);
    recordBackup('google_drive', fileId);
    debug('scheduledDriveBackup', 'success', { fileName, schedule });
    return { status: 'success', fileName, fileId };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Scheduled backup failed';
    debug('scheduledDriveBackup', 'error', message);
    return { status: 'error', message };
  } finally {
    running = false;
  }
}

export function isScheduledDriveBackupEnabled(
  schedule: DriveBackupSchedule | undefined,
): boolean {
  return normalizeDriveBackupSchedule(schedule) !== 'off';
}
