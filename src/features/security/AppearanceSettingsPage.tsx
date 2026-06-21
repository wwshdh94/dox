import { Header } from '@/components/Header';
import { Select } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';
import type { ThemeMode } from '@/types';

export function AppearanceSettingsPage() {
  const settings = useVaultStore((s) => s.settings);
  const setSettings = useVaultStore((s) => s.setSettings);

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
      </main>
    </div>
  );
}
