import { useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { LoadingOverlay } from '@/components/LoadingScreen';
import { useVaultStore } from '@/store/useVaultStore';
import {
  decryptVaultBackup,
  downloadBackupFile,
  encryptVaultBackup,
  readBackupFile,
} from '@/lib/vaultBackup';
import {
  downloadLatestBackupFromDrive,
  isGoogleDriveConfigured,
  requestGoogleAccessToken,
  uploadBackupToDrive,
} from '@/lib/googleDrive';
import { canUseGoogleDriveBackup } from '@/lib/planLimits';
import { UpgradeHint } from '@/components/UpgradeHint';
import { formatDate } from '@/lib/format';

export function BackupPage() {
  const user = useVaultStore((s) => s.user);
  const settings = useVaultStore((s) => s.settings);
  const getVaultExportPayload = useVaultStore((s) => s.getVaultExportPayload);
  const restoreVault = useVaultStore((s) => s.restoreVault);
  const recordBackup = useVaultStore((s) => s.recordBackup);

  const [passphrase, setPassphrase] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [restorePass, setRestorePass] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreMode, setRestoreMode] = useState<'file' | 'drive'>('file');
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const driveReady = isGoogleDriveConfigured();
  const driveAllowed = canUseGoogleDriveBackup(user);

  const clearMsgs = () => {
    setMessage('');
    setError('');
  };

  const validatePassphrase = (): boolean => {
    if (passphrase.length < 8) {
      setError('Use at least 8 characters for your backup passphrase.');
      return false;
    }
    if (passphrase !== confirmPass) {
      setError('Passphrases do not match.');
      return false;
    }
    return true;
  };

  const handleDownloadBackup = async () => {
    clearMsgs();
    if (!validatePassphrase()) return;
    setBusy(true);
    try {
      const payload = getVaultExportPayload();
      const backup = await encryptVaultBackup(payload, passphrase);
      downloadBackupFile(backup);
      recordBackup('file');
      setMessage('Backup file downloaded. Store it safely — you need your passphrase to restore.');
      setPassphrase('');
      setConfirmPass('');
    } catch {
      setError('Could not create backup. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDriveBackup = async () => {
    clearMsgs();
    if (!driveAllowed) {
      setError('Google Drive backup is a Pro feature.');
      return;
    }
    if (!driveReady) {
      setError('Google Drive requires VITE_GOOGLE_CLIENT_ID in your .env file.');
      return;
    }
    if (!validatePassphrase()) return;
    setBusy(true);
    try {
      const payload = getVaultExportPayload();
      const backup = await encryptVaultBackup(payload, passphrase);
      const token = await requestGoogleAccessToken();
      const { fileId, fileName } = await uploadBackupToDrive(token, backup);
      recordBackup('google_drive', fileId);
      setMessage(`Uploaded to Google Drive as ${fileName}.`);
      setPassphrase('');
      setConfirmPass('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google Drive backup failed.');
    } finally {
      setBusy(false);
    }
  };

  const openDriveRestore = () => {
    clearMsgs();
    if (!driveAllowed) {
      setError('Google Drive restore is a Pro feature.');
      return;
    }
    setRestoreMode('drive');
    setRestorePass('');
    setPendingFile(null);
    setRestoreOpen(true);
  };

  const onFilePicked = (file: File | null) => {
    if (!file) return;
    clearMsgs();
    setRestoreMode('file');
    setPendingFile(file);
    setRestorePass('');
    setRestoreOpen(true);
  };

  const handleRestore = async () => {
    if (restorePass.length < 8) {
      setError('Enter the backup passphrase.');
      return;
    }
    setBusy(true);
    clearMsgs();
    try {
      let backup;
      if (restoreMode === 'drive') {
        if (!driveReady) throw new Error('Google Drive not configured.');
        const token = await requestGoogleAccessToken();
        backup = await downloadLatestBackupFromDrive(token);
      } else {
        if (!pendingFile) return;
        backup = await readBackupFile(pendingFile);
      }
      const payload = await decryptVaultBackup(backup, restorePass);
      restoreVault(payload);
      setRestoreOpen(false);
      setRestorePass('');
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setMessage(
        restoreMode === 'drive'
          ? 'Vault restored from Google Drive.'
          : 'Vault restored from backup file.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed. Check passphrase and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full pb-8">
      <Header title="Backup & restore" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <p className="text-sm text-muted">
          Create an encrypted backup of your vault — documents, family, bundles, and settings. If you
          lose your phone, restore on a new device with your backup file and passphrase.
        </p>

        <div className="surface-panel space-y-1 p-4 text-sm">
          <p>
            <span className="text-muted">Account:</span> {user?.email}
          </p>
          {settings.lastBackupAt && (
            <p>
              <span className="text-muted">Last backup:</span>{' '}
              {formatDate(settings.lastBackupAt.slice(0, 10))} via{' '}
              {settings.lastBackupProvider === 'google_drive' ? 'Google Drive' : 'file'}
            </p>
          )}
        </div>

        {message && <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">{message}</p>}
        {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <section className="surface-panel space-y-3 p-4">
          <p className="section-label">Create backup</p>
          <p className="text-xs text-muted">
            Choose a strong passphrase — PreVault cannot recover it if you forget. Encrypted with
            AES-256-GCM before upload or download.
          </p>
          <Input
            label="Backup passphrase"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Confirm passphrase"
            type="password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            autoComplete="new-password"
          />
          <Button className="w-full" disabled={busy} onClick={() => void handleDownloadBackup()}>
            Download backup file (.prevaultbackup)
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy || !driveReady || !driveAllowed}
            onClick={() => void handleDriveBackup()}
          >
            Backup to Google Drive
          </Button>
          {!driveAllowed && (
            <UpgradeHint message="Google Drive sync is included with Pro. Free plan supports encrypted file download." />
          )}
          {!driveReady && (
            <p className="text-xs text-muted">
              Google Drive: set VITE_GOOGLE_CLIENT_ID in .env (see .env.example).
            </p>
          )}
        </section>

        <section className="surface-panel space-y-3 p-4">
          <p className="section-label">Restore vault</p>
          <p className="text-xs text-muted">
            Replaces current vault data on this device. You will need the backup passphrase.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".prevaultbackup,application/json"
            className="hidden"
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />
          <Button variant="secondary" className="w-full" onClick={() => fileRef.current?.click()}>
            Restore from backup file
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            disabled={!driveReady}
            onClick={openDriveRestore}
          >
            Restore from Google Drive
          </Button>
        </section>

      </main>

      <Modal
        open={restoreOpen}
        onClose={() => {
          setRestoreOpen(false);
          setPendingFile(null);
          setRestorePass('');
        }}
        title={restoreMode === 'drive' ? 'Restore from Google Drive' : 'Restore from file'}
      >
        <p className="mb-3 text-sm text-muted">
          {restoreMode === 'drive'
            ? 'Downloads your latest PreVault backup from Google Drive and restores it here.'
            : pendingFile
              ? `File: ${pendingFile.name}`
              : 'Select a backup file.'}
        </p>
        <Input
          label="Backup passphrase"
          type="password"
          value={restorePass}
          onChange={(e) => setRestorePass(e.target.value)}
          autoComplete="current-password"
        />
        <Button className="mt-4 w-full" disabled={busy} onClick={() => void handleRestore()}>
          Restore vault
        </Button>
      </Modal>
      <LoadingOverlay open={busy} label="Working on backup…" />
    </div>
  );
}
