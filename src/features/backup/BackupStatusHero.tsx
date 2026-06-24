import type { AppSettings } from '@/types';
import {
  driveBackupScheduleLabel,
  msUntilDriveBackupDue,
  normalizeDriveBackupSchedule,
} from '@/lib/driveBackupSchedule';
import { formatDate } from '@/lib/format';

function formatDueIn(ms: number | null): string {
  if (ms === null) return '';
  if (ms <= 0) return 'Due now';
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours < 24) return `Next in ~${hours}h`;
  const days = Math.ceil(hours / 24);
  return `Next in ~${days} day${days === 1 ? '' : 's'}`;
}

function backupHealth(settings: AppSettings, backupAllowed: boolean): {
  pill: string;
  pillClass: string;
  barPercent: number;
} {
  if (!backupAllowed) {
    return { pill: 'Pro feature', pillClass: 'bg-bg-subtle text-muted', barPercent: 0 };
  }

  const schedule = normalizeDriveBackupSchedule(settings.driveBackupSchedule);
  const dueMs = msUntilDriveBackupDue(schedule, settings);
  const hasBackup = Boolean(settings.lastBackupAt);

  if (!hasBackup) {
    return { pill: 'Not backed up', pillClass: 'bg-warning/15 text-warning', barPercent: 8 };
  }

  if (schedule !== 'off' && dueMs !== null && dueMs <= 0) {
    return { pill: 'Backup due', pillClass: 'bg-accent-soft text-accent-ink', barPercent: 35 };
  }

  return { pill: 'Protected', pillClass: 'bg-success/15 text-success', barPercent: 100 };
}

export function BackupStatusHero({
  email,
  settings,
  backupAllowed,
}: {
  email?: string;
  settings: AppSettings;
  backupAllowed: boolean;
}) {
  const schedule = normalizeDriveBackupSchedule(settings.driveBackupSchedule);
  const dueIn = formatDueIn(msUntilDriveBackupDue(schedule, settings));
  const health = backupHealth(settings, backupAllowed);

  return (
    <div className="surface-panel-elevated space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-xl">
          🛡️
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-text">Vault backup</p>
          <p className="mt-1 text-xs text-muted">
            Encrypted copies of your documents, family, and settings — safe if you lose this device.
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide ${health.pillClass}`}>
          {health.pill}
        </span>
      </div>

      <div>
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-bg-subtle">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${health.barPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <p>
          <span className="text-muted">Account</span>
          <br />
          <span className="font-medium text-text">{email ?? '—'}</span>
        </p>
        {settings.lastBackupAt ? (
          <p>
            <span className="text-muted">Last backup</span>
            <br />
            <span className="font-medium text-text">
              {formatDate(settings.lastBackupAt.slice(0, 10))}
              {' · '}
              {settings.lastBackupProvider === 'google_drive' ? 'Google Drive' : 'Local file'}
            </span>
          </p>
        ) : (
          <p>
            <span className="text-muted">Last backup</span>
            <br />
            <span className="font-medium text-muted">Never</span>
          </p>
        )}
        {schedule !== 'off' && (
          <p className="sm:col-span-2">
            <span className="text-muted">Auto schedule</span>
            <br />
            <span className="font-medium text-text">
              {driveBackupScheduleLabel(schedule)}
              {dueIn ? ` · ${dueIn}` : ''}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
