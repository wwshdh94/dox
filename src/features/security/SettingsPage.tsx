import { Header } from '@/components/Header';
import { RadioGroup } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';
import { canUseCloudAi } from '@/lib/planLimits';
import { isDocumentProcessingEnabled } from '@/lib/documentProcessing';
import { UpgradeHint } from '@/components/UpgradeHint';

type ReminderMode = 'push' | 'off';
type ExtractionMode = 'privacy' | 'cloud';
type ProcessingMode = 'automatic' | 'manual';

function reminderMode(settings: { pushReminders: boolean }): ReminderMode {
  return settings.pushReminders ? 'push' : 'off';
}

export function SettingsPage() {
  const settings = useVaultStore((s) => s.settings);
  const user = useVaultStore((s) => s.user);
  const setSettings = useVaultStore((s) => s.setSettings);
  const cloudAllowed = canUseCloudAi(user);
  const processingEnabled = isDocumentProcessingEnabled(settings);

  const applyReminders = (mode: ReminderMode) => {
    setSettings({ pushReminders: mode === 'push' });
  };

  const applyExtraction = (mode: ExtractionMode) => {
    if (!processingEnabled || (!cloudAllowed && mode === 'cloud')) return;
    setSettings({
      privacyMode: mode === 'privacy',
      cloudAiEnabled: mode === 'cloud',
    });
  };

  const applyProcessing = (mode: ProcessingMode) => {
    setSettings({ documentProcessingEnabled: mode === 'automatic' });
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
                { value: 'push', label: 'Push', hint: 'Push notifications when documents expire soon' },
                { value: 'off', label: 'Off', hint: 'No expiry reminders' },
              ]}
            />
          </div>
        </section>

        <section className="space-y-3">
          <p className="section-label">Document processing</p>
          <div className="surface-panel space-y-4 p-4">
            <RadioGroup
              label="After upload"
              name="processing"
              value={processingEnabled ? 'automatic' : 'manual'}
              onChange={applyProcessing}
              options={[
                {
                  value: 'automatic',
                  label: 'Extract fields',
                  hint: 'OCR reads names, numbers, and dates from your upload',
                },
                {
                  value: 'manual',
                  label: 'Manual entry',
                  hint: 'No scanning — enter document details yourself right after upload',
                },
              ]}
            />
            {processingEnabled && (
              <>
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
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
