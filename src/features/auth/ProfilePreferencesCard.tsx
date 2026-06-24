import { Link } from 'react-router-dom';
import { SegmentedControl } from '@/components/SegmentedControl';
import { isDocumentProcessingEnabled } from '@/lib/documentProcessing';
import { canUseCloudAi } from '@/lib/planLimits';
import type { ThemeMode, User } from '@/types';

export function ProfilePreferencesCard({
  user,
  settings,
  onTheme,
  onReminders,
  onOcrMode,
}: {
  user: User | null;
  settings: {
    theme: ThemeMode;
    pushReminders: boolean;
    privacyMode: boolean;
    cloudAiEnabled: boolean;
    documentProcessingEnabled?: boolean;
  };
  onTheme: (theme: ThemeMode) => void;
  onReminders: (mode: 'off' | 'push') => void;
  onOcrMode: (mode: 'device' | 'cloud' | 'manual') => void;
}) {
  const cloudAllowed = canUseCloudAi(user);
  const reminderQuick = settings.pushReminders ? 'push' : 'off';
  const ocrMode = !isDocumentProcessingEnabled(settings)
    ? 'manual'
    : settings.privacyMode || !settings.cloudAiEnabled
      ? 'device'
      : 'cloud';

  return (
    <section className="surface-panel space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft/70 text-sm" aria-hidden>
            ⚙️
          </span>
          <p className="font-medium text-text">Preferences</p>
        </div>
        <Link to="/profile/settings" className="text-xs font-medium text-accent-ink">
          All settings →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="min-w-0 space-y-1.5">
          <p className="text-[0.65rem] font-medium text-muted">Theme</p>
          <SegmentedControl
            size="dense"
            aria-label="Theme"
            value={settings.theme}
            onChange={(v) => onTheme(v as ThemeMode)}
            options={[
              { value: 'system', label: 'Auto' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <p className="text-[0.65rem] font-medium text-muted">Expiry reminders</p>
          <SegmentedControl
            size="dense"
            aria-label="Expiry reminders"
            value={reminderQuick}
            onChange={(v) => onReminders(v as 'off' | 'push')}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'push', label: 'Push' },
            ]}
          />
        </div>

        <div className="min-w-0 space-y-1.5 sm:col-span-2">
          <p className="text-[0.65rem] font-medium text-muted">Document processing</p>
          <SegmentedControl
            size="dense"
            aria-label="OCR extraction"
            value={ocrMode}
            onChange={(v) => onOcrMode(v as 'device' | 'cloud' | 'manual')}
            options={[
              { value: 'manual', label: 'Manual' },
              { value: 'device', label: 'On-device' },
              { value: 'cloud', label: 'Cloud', disabled: !cloudAllowed },
            ]}
          />
        </div>
      </div>

      {!cloudAllowed && (
        <p className="text-[0.65rem] text-muted">
          Cloud OCR on Pro.{' '}
          <Link to="/profile/plan" className="text-accent-ink">
            Upgrade
          </Link>
        </p>
      )}
    </section>
  );
}
