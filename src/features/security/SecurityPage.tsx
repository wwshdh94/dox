import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { useVaultStore } from '@/store/useVaultStore';

export function SecurityPage() {
  const settings = useVaultStore((s) => s.settings);
  const setLockPin = useVaultStore((s) => s.setLockPin);
  const locked = useVaultStore((s) => s.locked);

  return (
    <div className="min-h-full pb-8">
      <Header title="Security Center" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        <div className="surface-panel space-y-2 p-4 text-sm">
          <StatusRow label="Vault" value="Encrypted — AES-256-GCM" ok />
          <StatusRow label="In transit" value="TLS 1.3" ok />
          <StatusRow label="Data location" value="India (demo — local device)" ok />
          <StatusRow label="App lock" value={settings.lockPin ? (locked ? 'Locked' : 'PIN enabled') : 'Not set'} ok={!!settings.lockPin} />
        </div>

        <div className="space-y-3">
          <Input
            label="Set 6-digit PIN"
            type="password"
            maxLength={6}
            placeholder="••••••"
            onBlur={(e) => {
              if (e.target.value.length === 6) setLockPin(e.target.value);
            }}
          />
          <Link to="/lock">
            <Button variant="secondary" className="w-full">Test lock screen</Button>
          </Link>
        </div>

        <Link
          to="/profile/activity"
          className="surface-panel flex items-center justify-between px-4 py-3.5 text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <span>Activity & share links</span>
          <span className="text-muted">→</span>
        </Link>
      </main>
    </div>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className={ok ? 'text-success' : 'text-warning'}>🟢 {value}</span>
    </div>
  );
}
