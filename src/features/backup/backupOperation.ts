import {
  decryptVaultBackup,
  downloadBackupFile,
  encryptVaultBackup,
  readBackupFile,
  type EncryptedVaultBackup,
  type VaultExportPayload,
} from '@/lib/vaultBackup';
import {
  downloadLatestBackupFromDrive,
  getGoogleDriveAccessToken,
  uploadBackupToDrive,
} from '@/lib/googleDrive';

export type BackupPhase =
  | 'idle'
  | 'preparing'
  | 'encrypting'
  | 'connecting'
  | 'uploading'
  | 'downloading'
  | 'finishing'
  | 'done'
  | 'error';

export type RestorePhase = 'idle' | 'fetching' | 'decrypting' | 'merging' | 'done' | 'error';

export type ProgressStepStatus = 'pending' | 'active' | 'done' | 'error';

export type ProgressStep = {
  id: string;
  label: string;
  status: ProgressStepStatus;
};

export type RestoreReport = {
  sourceLabel: string;
  backupDate: string;
  documents: number;
  members: number;
  assets: number;
  bundles: number;
};

const BACKUP_DRIVE_PHASES: BackupPhase[] = [
  'preparing',
  'encrypting',
  'connecting',
  'uploading',
  'finishing',
  'done',
];

const BACKUP_FILE_PHASES: BackupPhase[] = [
  'preparing',
  'encrypting',
  'downloading',
  'finishing',
  'done',
];

const RESTORE_PHASES: RestorePhase[] = ['fetching', 'decrypting', 'merging', 'done'];

const BACKUP_LABELS: Record<Exclude<BackupPhase, 'idle' | 'error'>, string> = {
  preparing: 'Collecting vault data',
  encrypting: 'Encrypting with AES-256',
  connecting: 'Connecting to Google Drive',
  uploading: 'Uploading backup',
  downloading: 'Preparing download',
  finishing: 'Saving backup record',
  done: 'Backup complete',
};

const RESTORE_LABELS: Record<Exclude<RestorePhase, 'idle' | 'error'>, string> = {
  fetching: 'Reading backup file',
  decrypting: 'Decrypting backup',
  merging: 'Restoring vault',
  done: 'Restore complete',
};

export function backupStepsForMode(mode: 'drive' | 'file', phase: BackupPhase): ProgressStep[] {
  const order = mode === 'drive' ? BACKUP_DRIVE_PHASES : BACKUP_FILE_PHASES;
  const activeIdx = phase === 'idle' || phase === 'error' ? -1 : order.indexOf(phase);
  const errored = phase === 'error';

  return order.slice(0, -1).map((id, idx) => {
    let status: ProgressStepStatus = 'pending';
    if (errored && idx === activeIdx) status = 'error';
    else if (activeIdx >= 0 && idx < activeIdx) status = 'done';
    else if (idx === activeIdx) status = 'active';
    return { id, label: BACKUP_LABELS[id], status };
  });
}

export function restoreSteps(phase: RestorePhase): ProgressStep[] {
  const activeIdx = phase === 'idle' || phase === 'error' ? -1 : RESTORE_PHASES.indexOf(phase);
  const errored = phase === 'error';

  return RESTORE_PHASES.slice(0, -1).map((id, idx) => {
    let status: ProgressStepStatus = 'pending';
    if (errored && idx === activeIdx) status = 'error';
    else if (activeIdx >= 0 && idx < activeIdx) status = 'done';
    else if (idx === activeIdx) status = 'active';
    return { id, label: RESTORE_LABELS[id], status };
  });
}

export function backupProgressPercent(mode: 'drive' | 'file', phase: BackupPhase): number {
  const order = mode === 'drive' ? BACKUP_DRIVE_PHASES : BACKUP_FILE_PHASES;
  const idx = order.indexOf(phase as (typeof order)[number]);
  if (idx < 0) return phase === 'done' ? 100 : 0;
  return Math.round(((idx + 1) / order.length) * 100);
}

export function restoreProgressPercent(phase: RestorePhase): number {
  const idx = RESTORE_PHASES.indexOf(phase);
  if (idx < 0) return phase === 'done' ? 100 : 0;
  return Math.round(((idx + 1) / RESTORE_PHASES.length) * 100);
}

export function restoreReportFromPayload(
  payload: VaultExportPayload,
  backup: EncryptedVaultBackup,
  sourceLabel: string,
): RestoreReport {
  return {
    sourceLabel,
    backupDate: backup.createdAt,
    documents: payload.documents.length,
    members: payload.members.length,
    assets: payload.assets.length,
    bundles: payload.bundles.length,
  };
}

export async function runFileBackup(opts: {
  userId: string;
  getPayload: () => VaultExportPayload;
  onPhase: (phase: BackupPhase) => void;
}): Promise<void> {
  const { userId, getPayload, onPhase } = opts;
  onPhase('preparing');
  const payload = getPayload();
  onPhase('encrypting');
  const backup = await encryptVaultBackup(payload, userId);
  onPhase('downloading');
  downloadBackupFile(backup);
  onPhase('finishing');
  onPhase('done');
}

export async function runDriveBackup(opts: {
  userId: string;
  getPayload: () => VaultExportPayload;
  onPhase: (phase: BackupPhase) => void;
}): Promise<{ fileId: string; fileName: string }> {
  const { userId, getPayload, onPhase } = opts;
  onPhase('preparing');
  const payload = getPayload();
  onPhase('encrypting');
  const backup = await encryptVaultBackup(payload, userId);
  onPhase('connecting');
  const token = await getGoogleDriveAccessToken();
  onPhase('uploading');
  const result = await uploadBackupToDrive(token, backup);
  onPhase('finishing');
  onPhase('done');
  return result;
}

export async function runRestoreFromFile(opts: {
  file: File;
  userId: string;
  onPhase: (phase: RestorePhase) => void;
}): Promise<{ payload: VaultExportPayload; backup: EncryptedVaultBackup }> {
  const { file, userId, onPhase } = opts;
  onPhase('fetching');
  const backup = await readBackupFile(file);
  onPhase('decrypting');
  const payload = await decryptVaultBackup(backup, userId);
  onPhase('merging');
  onPhase('done');
  return { payload, backup };
}

export async function runRestoreFromDrive(opts: {
  userId: string;
  onPhase: (phase: RestorePhase) => void;
}): Promise<{ payload: VaultExportPayload; backup: EncryptedVaultBackup }> {
  const { userId, onPhase } = opts;
  onPhase('fetching');
  const token = await getGoogleDriveAccessToken();
  const backup = await downloadLatestBackupFromDrive(token);
  onPhase('decrypting');
  const payload = await decryptVaultBackup(backup, userId);
  onPhase('merging');
  onPhase('done');
  return { payload, backup };
}
