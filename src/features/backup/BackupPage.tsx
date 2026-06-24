import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { RadioGroup } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { GoogleDriveIcon } from '@/components/icons/GoogleDriveIcon';
import { useVaultStore } from '@/store/useVaultStore';
import { BackupDestinationCard } from '@/features/backup/BackupDestinationCard';
import { BackupProgressPanel } from '@/features/backup/BackupProgressPanel';
import { BackupStatusHero } from '@/features/backup/BackupStatusHero';
import {
  backupProgressPercent,
  backupStepsForMode,
  restoreProgressPercent,
  restoreReportFromPayload,
  restoreSteps,
  runDriveBackup,
  runFileBackup,
  runRestoreFromDrive,
  runRestoreFromFile,
  type BackupPhase,
  type RestorePhase,
  type RestoreReport,
} from '@/features/backup/backupOperation';
import {
  driveBackupScheduleLabel,
  normalizeDriveBackupSchedule,
  type DriveBackupSchedule,
} from '@/lib/driveBackupSchedule';
import { isGoogleDriveConfigured } from '@/lib/googleDrive';
import { canUseVaultBackup } from '@/lib/planLimits';
import { triggerHaptic } from '@/lib/haptics';
import { UpgradeHint } from '@/components/UpgradeHint';
import { formatDate } from '@/lib/format';

export function BackupPage() {
  const navigate = useNavigate();
  const user = useVaultStore((s) => s.user);
  const settings = useVaultStore((s) => s.settings);
  const setSettings = useVaultStore((s) => s.setSettings);
  const getVaultExportPayload = useVaultStore((s) => s.getVaultExportPayload);
  const restoreVault = useVaultStore((s) => s.restoreVault);
  const recordBackup = useVaultStore((s) => s.recordBackup);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'file' | 'drive'>('file');
  const [restoreReport, setRestoreReport] = useState<RestoreReport | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [backupPhase, setBackupPhase] = useState<BackupPhase>('idle');
  const [backupMode, setBackupMode] = useState<'drive' | 'file' | null>(null);
  const [restorePhase, setRestorePhase] = useState<RestorePhase>('idle');
  const [progressError, setProgressError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const driveReady = isGoogleDriveConfigured();
  const backupAllowed = canUseVaultBackup(user);
  const schedule = normalizeDriveBackupSchedule(settings.driveBackupSchedule);
  const busy = backupPhase !== 'idle' && backupPhase !== 'done' && backupPhase !== 'error';
  const restoring =
    restorePhase !== 'idle' && restorePhase !== 'done' && restorePhase !== 'error';

  const clearMsgs = () => {
    setMessage('');
    setError('');
  };

  const requireUser = (): string | null => {
    if (!user || user.isGuestPreview) {
      setError('Sign in with Google to back up or restore.');
      return null;
    }
    return user.id;
  };

  const handleDownloadBackup = async () => {
    clearMsgs();
    setProgressError('');
    const userId = requireUser();
    if (!userId) return;
    if (!backupAllowed) {
      setError('Backup & restore is a Pro feature.');
      return;
    }

    setBackupMode('file');
    setBackupPhase('preparing');
    try {
      await runFileBackup({
        userId,
        getPayload: getVaultExportPayload,
        onPhase: setBackupPhase,
      });
      recordBackup('file');
      triggerHaptic('success');
      setMessage('Backup file downloaded. Restore it while signed in with the same Google account.');
    } catch {
      setBackupPhase('error');
      setProgressError('Could not create backup. Try again.');
      triggerHaptic('error');
    } finally {
      window.setTimeout(() => {
        setBackupPhase('idle');
        setBackupMode(null);
      }, 1200);
    }
  };

  const handleDriveBackup = async () => {
    clearMsgs();
    setProgressError('');
    const userId = requireUser();
    if (!userId) return;
    if (!backupAllowed) {
      setError('Backup & restore is a Pro feature.');
      return;
    }
    if (!driveReady) {
      setError('Google Drive requires VITE_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }

    setBackupMode('drive');
    setBackupPhase('preparing');
    try {
      const { fileId, fileName } = await runDriveBackup({
        userId,
        getPayload: getVaultExportPayload,
        onPhase: setBackupPhase,
      });
      recordBackup('google_drive', fileId);
      triggerHaptic('success');
      setMessage(`Uploaded to Google Drive as ${fileName}.`);
    } catch (e) {
      setBackupPhase('error');
      setProgressError(e instanceof Error ? e.message : 'Google Drive backup failed.');
      triggerHaptic('error');
    } finally {
      window.setTimeout(() => {
        setBackupPhase('idle');
        setBackupMode(null);
      }, 1200);
    }
  };

  const applySchedule = (next: DriveBackupSchedule) => {
    clearMsgs();
    if (!backupAllowed) {
      setError('Backup & restore is a Pro feature.');
      return;
    }
    if (!driveReady) {
      setError('Google Drive requires VITE_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }
    if (next === 'off') {
      setSettings({ driveBackupSchedule: 'off' });
      setMessage('Automatic Google Drive backup turned off.');
      return;
    }
    setSettings({ driveBackupSchedule: next });
    setMessage(`Automatic Google Drive backup set to ${driveBackupScheduleLabel(next).toLowerCase()}.`);
  };

  const openDriveRestore = () => {
    clearMsgs();
    if (!backupAllowed) {
      setError('Backup & restore is a Pro feature.');
      return;
    }
    setRestoreMode('drive');
    setRestoreReport(null);
    setPendingFile(null);
    setRestorePhase('idle');
    setRestoreConfirmOpen(true);
  };

  const onFilePicked = (file: File | null) => {
    if (!file) return;
    clearMsgs();
    if (!backupAllowed) {
      setError('Backup & restore is a Pro feature.');
      return;
    }
    setRestoreMode('file');
    setPendingFile(file);
    setRestoreReport(null);
    setRestorePhase('idle');
    setRestoreConfirmOpen(true);
  };

  const closeRestoreModal = () => {
    setRestoreOpen(false);
    setRestoreConfirmOpen(false);
    setPendingFile(null);
    setRestoreReport(null);
    setRestorePhase('idle');
    setProgressError('');
  };

  const startRestore = async () => {
    const userId = requireUser();
    if (!userId) return;

    clearMsgs();
    setProgressError('');
    setRestoreConfirmOpen(false);
    setRestoreOpen(true);
    setRestorePhase('fetching');

    try {
      let result;
      let sourceLabel: string;
      if (restoreMode === 'drive') {
        if (!driveReady) throw new Error('Google Drive not configured.');
        result = await runRestoreFromDrive({ userId, onPhase: setRestorePhase });
        sourceLabel = 'Google Drive';
      } else {
        if (!pendingFile) return;
        result = await runRestoreFromFile({
          file: pendingFile,
          userId,
          onPhase: setRestorePhase,
        });
        sourceLabel = pendingFile.name;
      }

      restoreVault(result.payload);
      setRestoreReport(restoreReportFromPayload(result.payload, result.backup, sourceLabel));
      triggerHaptic('success');
      if (fileRef.current) fileRef.current.value = '';
    } catch (e) {
      setRestorePhase('error');
      setProgressError(e instanceof Error ? e.message : 'Restore failed. Try again.');
      triggerHaptic('error');
    }
  };

  const showBackupProgress = backupMode !== null && backupPhase !== 'idle';
  const showRestoreProgress = restoring || restorePhase === 'error';

  return (
    <div className="min-h-full pb-8">
      <Header title="Backup & restore" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <BackupStatusHero email={user?.email} settings={settings} backupAllowed={backupAllowed} />

        {message && (
          <p className="rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        {!backupAllowed && (
          <UpgradeHint message="Encrypted backup and restore (file or Google Drive) is included with Pro." />
        )}

        <p className="text-xs text-muted">
          Backups are encrypted with your Google account key (AES-256-GCM). Restore on any device
          while signed in as <strong className="text-text">{user?.email ?? 'your Google account'}</strong>.
        </p>

        <BackupDestinationCard
          icon={<GoogleDriveIcon className="h-6 w-6" />}
          title="Google Drive"
          subtitle={
            driveReady
              ? `Backup to ${user?.email ?? 'your Google account'}. Encrypted before upload.`
              : 'Set VITE_GOOGLE_CLIENT_ID in .env (same OAuth client as sign-in).'
          }
          badge={
            driveReady ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[0.65rem] font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Ready
              </span>
            ) : (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[0.65rem] font-semibold text-warning">
                Not configured
              </span>
            )
          }
          className={!backupAllowed ? 'opacity-60' : ''}
        >
          <RadioGroup
            label="Automatic schedule"
            name="drive-schedule"
            value={schedule}
            onChange={(v) => applySchedule(v as DriveBackupSchedule)}
            options={[
              { value: 'off', label: 'Off' },
              {
                value: 'daily',
                label: 'Daily',
                hint: 'Every 24 hours after the last Drive backup',
                disabled: !backupAllowed || !driveReady,
              },
              {
                value: 'weekly',
                label: 'Weekly',
                hint: 'Every 7 days after the last Drive backup',
                disabled: !backupAllowed || !driveReady,
              },
            ]}
          />
          <Button
            className="flex w-full items-center justify-center gap-2"
            disabled={busy || !backupAllowed || !driveReady}
            onClick={() => void handleDriveBackup()}
          >
            <GoogleDriveIcon className="h-5 w-5" />
            Backup to Google Drive now
          </Button>
        </BackupDestinationCard>

        <BackupDestinationCard
          icon={
            <svg className="h-6 w-6 text-accent-ink" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
                stroke="currentColor"
                strokeWidth="1.75"
              />
              <path d="M14 2v6h6M10 13h4M10 17h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          }
          title="Local backup file"
          subtitle="Download a .prevaultbackup file. Same Google sign-in required to restore."
          className={!backupAllowed ? 'opacity-60' : ''}
        >
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy || !backupAllowed}
            onClick={() => void handleDownloadBackup()}
          >
            Download encrypted backup
          </Button>
        </BackupDestinationCard>

        <BackupDestinationCard
          icon={
            <svg className="h-6 w-6 text-warning" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          }
          title="Restore vault"
          subtitle="Replaces all vault data on this device. Sign in with the same Google account that created the backup."
          className={`border border-warning/20 ${!backupAllowed ? 'opacity-60' : ''}`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".prevaultbackup,application/json"
            className="hidden"
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              disabled={!backupAllowed}
              onClick={() => fileRef.current?.click()}
            >
              From backup file
            </Button>
            <Button
              variant="secondary"
              className="flex items-center justify-center gap-2"
              disabled={!backupAllowed || !driveReady}
              onClick={openDriveRestore}
            >
              <GoogleDriveIcon className="h-5 w-5" />
              From Google Drive
            </Button>
          </div>
        </BackupDestinationCard>
      </main>

      {showBackupProgress && backupMode && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-text/25 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-busy="true"
        >
          <div className="surface-panel-elevated mx-0 w-full max-w-md animate-fade-up p-6 sm:mx-4 sm:rounded-2xl">
            <BackupProgressPanel
              title={backupMode === 'drive' ? 'Backing up to Google Drive' : 'Creating backup file'}
              steps={backupStepsForMode(backupMode, backupPhase)}
              percent={backupProgressPercent(backupMode, backupPhase)}
              error={progressError}
            />
          </div>
        </div>
      )}

      <Modal
        open={restoreConfirmOpen}
        onClose={closeRestoreModal}
        title={restoreMode === 'drive' ? 'Restore from Google Drive' : 'Restore from file'}
      >
        <p className="mb-4 text-sm text-muted">
          {restoreMode === 'drive'
            ? 'Downloads your latest PreVault backup from Google Drive and replaces this device’s vault.'
            : pendingFile
              ? `Restore from ${pendingFile.name}? This replaces your current vault.`
              : 'Select a backup file.'}
        </p>
        <p className="mb-4 text-xs text-warning">
          This cannot be undone. Make sure you are signed in as {user?.email ?? 'the backup owner'}.
        </p>
        <Button className="w-full" onClick={() => void startRestore()}>
          Restore vault
        </Button>
      </Modal>

      <Modal
        open={restoreOpen}
        onClose={() => {
          if (restoring) return;
          closeRestoreModal();
        }}
        title={
          restoreReport
            ? 'Restore complete'
            : restoreMode === 'drive'
              ? 'Restoring from Google Drive'
              : 'Restoring from file'
        }
      >
        {restoreReport ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">
              Your vault was restored from <strong className="text-text">{restoreReport.sourceLabel}</strong>.
            </p>
            <dl className="surface-panel grid grid-cols-2 gap-3 p-4 text-sm">
              <div>
                <dt className="text-xs text-muted">Backup date</dt>
                <dd className="font-medium text-text">{formatDate(restoreReport.backupDate.slice(0, 10))}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Documents</dt>
                <dd className="font-medium text-text">{restoreReport.documents}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Family members</dt>
                <dd className="font-medium text-text">{restoreReport.members}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Assets</dt>
                <dd className="font-medium text-text">{restoreReport.assets}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-muted">Bundles</dt>
                <dd className="font-medium text-text">{restoreReport.bundles}</dd>
              </div>
            </dl>
            <Button
              className="w-full"
              onClick={() => {
                closeRestoreModal();
                navigate('/');
              }}
            >
              Done — go to vault
            </Button>
          </div>
        ) : (
          <BackupProgressPanel
            title={restoreMode === 'drive' ? 'Restoring from Google Drive' : 'Restoring from file'}
            steps={restoreSteps(restorePhase)}
            percent={restoreProgressPercent(restorePhase)}
            error={progressError}
          />
        )}
      </Modal>
    </div>
  );
}
