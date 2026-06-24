import type { AppSettings, Document, FamilyMember } from '@/types';
import { isDriveBackupDue, normalizeDriveBackupSchedule } from '@/lib/driveBackupSchedule';
import { formatDate } from '@/lib/format';
import { countVerifiedDocuments } from '@/lib/verificationQueue';

export function profileVaultStats(documents: Document[], members: FamilyMember[]) {
  const activeMembers = members.filter((m) => m.status !== 'disabled').length;
  const docs = documents.filter((d) => !d.archivedAt).length;
  const verified = countVerifiedDocuments(documents);
  return { activeMembers, docs, verified };
}

export function profileBackupStatusLabel(settings: AppSettings): {
  label: string;
  tone: 'ok' | 'warn' | 'muted';
} {
  const schedule = normalizeDriveBackupSchedule(settings.driveBackupSchedule);
  if (!settings.lastBackupAt) {
    return { label: 'No backup yet', tone: 'warn' };
  }
  if (schedule !== 'off' && isDriveBackupDue(schedule, settings)) {
    return { label: 'Backup due', tone: 'warn' };
  }
  const date = formatDate(settings.lastBackupAt.slice(0, 10));
  const via = settings.lastBackupProvider === 'google_drive' ? 'Drive' : 'File';
  return { label: `${date} · ${via}`, tone: 'ok' };
}
