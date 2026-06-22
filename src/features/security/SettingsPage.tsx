import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { RadioGroup } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';
import { canUseCloudAi, canUseEmailReminders } from '@/lib/planLimits';
import { UpgradeHint } from '@/components/UpgradeHint';

type ReminderMode = 'both' | 'push' | 'email' | 'off';
type ExtractionMode = 'privacy' | 'cloud';

function reminderMode(settings: { pushReminders: boolean; emailReminders: boolean }): ReminderMode {
  if (settings.pushReminders && settings.emailReminders) return 'both';
  if (settings.pushReminders) return 'push';
  if (settings.emailReminders) return 'email';
  return 'off';
}

export function SettingsPage() {
  const settings = useVaultStore((s) => s.settings);
  const user = useVaultStore((s) => s.user);
  const setSettings = useVaultStore((s) => s.setSettings);
  const emailAllowed = canUseEmailReminders(user);
  const cloudAllowed = canUseCloudAi(user);

  const applyReminders = (mode: ReminderMode) => {
    if (!emailAllowed && (mode === 'both' || mode === 'email')) {
      setSettings({ pushReminders: mode === 'both', emailReminders: false });
      return;
    }
    setSettings({
      pushReminders: mode === 'both' || mode === 'push',
      emailReminders: mode === 'both' || mode === 'email',
    });
  };

  const applyExtraction = (mode: ExtractionMode) => {
    if (!cloudAllowed && mode === 'cloud') return;
    setSettings({
      privacyMode: mode === 'privacy',
      cloudAiEnabled: mode === 'cloud',
    });
  };

  return (
    <div className="min-h-full pb-8">
      <Header title="Account & reminders" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-6">
        <section className="space-y-3">
          <p className="section-label">Reminders</p>
          <div className="surface-panel p-4">
          <RadioGroup
            label="Expiry reminders"
            name="reminders"
            value={reminderMode(settings)}
            onChange={applyReminders}
            size="compact"
            options={[
              { value: 'both', label: 'Both', disabled: !emailAllowed, hint: 'Push and email reminders' },
              { value: 'push', label: 'Push', hint: 'Push notifications only' },
              { value: 'email', label: 'Email', disabled: !emailAllowed, hint: 'Email reminders only' },
              { value: 'off', label: 'Off', hint: 'No expiry reminders' },
            ]}
          />
          {!emailAllowed && (
            <p className="mt-2 text-xs text-muted">
              Email reminders are a Pro feature.{' '}
              <Link to="/profile/plan" className="text-accent-ink">
                Compare plans
              </Link>
            </p>
          )}
          </div>
        </section>

        <section className="space-y-3">
          <p className="section-label">Document extraction</p>
          <div className="surface-panel p-4">
          <RadioGroup
            label="AI extraction"
            name="extraction"
            value={settings.privacyMode ? 'privacy' : 'cloud'}
            onChange={applyExtraction}
            options={[
              {
                value: 'privacy',
                label: 'On-device',
                hint: 'On-device OCR only — no cloud AI',
              },
              {
                value: 'cloud',
                label: 'Cloud AI',
                hint: 'Pro — higher accuracy on Indian doc layouts',
                disabled: !cloudAllowed,
              },
            ]}
          />
          {!cloudAllowed && <UpgradeHint message="Cloud AI extraction is included with Pro." />}
          </div>
        </section>

        {settings.recoveryCode && (
          <section className="space-y-3">
            <p className="section-label">Recovery</p>
            <div className="surface-panel p-4 text-sm">
            <p className="font-medium">Recovery code</p>
            <p className="mt-1 font-mono text-muted">{settings.recoveryCode}</p>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
