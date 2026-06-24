import { Header } from '@/components/Header';
import { Select } from '@/components/Input';
import { isHapticSupported, hapticLabelForPlatform } from '@/lib/haptics';
import { useVaultStore } from '@/store/useVaultStore';
import type { ThemeMode } from '@/types';

export function AppearanceSettingsPage() {
  const settings = useVaultStore((s) => s.settings);
  const setSettings = useVaultStore((s) => s.setSettings);
  const hapticSupported = isHapticSupported();

  return (
    <div className="min-h-full pb-8">
      <Header title="Appearance" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-6">
        <section className="space-y-3">
          <p className="section-label">Display</p>
          <Select
            label="Theme"
            value={settings.theme}
            onChange={(e) => setSettings({ theme: e.target.value as ThemeMode })}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </section>

        {hapticSupported && (
          <section className="space-y-3">
            <p className="section-label">Feedback</p>
            <label className="surface-panel flex cursor-pointer items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-text">Haptic feedback</p>
                <p className="mt-1 text-xs text-muted">{hapticLabelForPlatform()}</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-5 accent-accent"
                checked={settings.hapticFeedback !== false}
                onChange={(e) => setSettings({ hapticFeedback: e.target.checked })}
              />
            </label>
          </section>
        )}
      </main>
    </div>
  );
}
