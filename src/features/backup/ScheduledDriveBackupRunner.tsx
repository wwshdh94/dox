import { useEffect } from 'react';
import { useStoreHydration } from '@/hooks/useStoreHydration';
import { runScheduledDriveBackup } from '@/lib/scheduledDriveBackup';
import { useVaultStore } from '@/store/useVaultStore';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Runs encrypted Google Drive backups on daily/weekly schedule while the app is open. */
export function ScheduledDriveBackupRunner() {
  const hydrated = useStoreHydration();
  const user = useVaultStore((s) => s.user);
  const settings = useVaultStore((s) => s.settings);
  const locked = useVaultStore((s) => s.locked);
  const getVaultExportPayload = useVaultStore((s) => s.getVaultExportPayload);
  const recordBackup = useVaultStore((s) => s.recordBackup);

  useEffect(() => {
    if (!hydrated || !user || user.isGuestPreview || locked) return;
    if (settings.driveBackupSchedule === 'off' || !settings.driveBackupSchedule) return;

    const run = () => {
      void runScheduledDriveBackup({
        user,
        settings: useVaultStore.getState().settings,
        getVaultExportPayload,
        recordBackup,
      });
    };

    run();
    const id = window.setInterval(run, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [
    hydrated,
    user?.id,
    user?.isGuestPreview,
    locked,
    settings.driveBackupSchedule,
    getVaultExportPayload,
    recordBackup,
  ]);

  return null;
}
