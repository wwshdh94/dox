import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { biometricSupported } from '@/lib/biometricLock';
import { useVaultStore } from '@/store/useVaultStore';

export function SecurityPage() {
  const settings = useVaultStore((s) => s.settings);
  const locked = useVaultStore((s) => s.locked);
  const enableBiometricLock = useVaultStore((s) => s.enableBiometricLock);
  const disableBiometricLock = useVaultStore((s) => s.disableBiometricLock);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supported = biometricSupported();
  const enabled = Boolean(settings.biometricLockEnabled);

  const setBiometric = async (mode: 'off' | 'on') => {
    setError(null);
    if (mode === 'off') {
      disableBiometricLock();
      return;
    }
    if (mode === 'on' && !enabled) {
      setBusy(true);
      const result = await enableBiometricLock();
      setBusy(false);
      if (!result.ok) setError(result.error ?? 'Could not enable biometric unlock.');
    }
  };

  return (
    <div className="min-h-full pb-8">
      <Header title="Security Center" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        <div className="surface-panel space-y-2 p-4 text-sm">
          <StatusRow label="Vault" value="Encrypted — AES-256-GCM" ok />
          <StatusRow label="In transit" value="TLS 1.3" ok />
          <StatusRow label="Data location" value="India (demo — local device)" ok />
          <StatusRow
            label="App lock"
            value={
              enabled
                ? locked
                  ? 'Locked — biometrics'
                  : 'Biometrics enabled'
                : 'Off'
            }
            ok={enabled}
          />
        </div>

        <div className="surface-panel space-y-3 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted">Biometric unlock</p>
          <p className="text-xs text-muted">
            Require fingerprint or face unlock when opening PreVault on this device.
          </p>
          {!supported && (
            <p className="text-xs text-warning">
              Biometric unlock is not available in this browser. Use a supported mobile browser or
              installed PWA.
            </p>
          )}
          <SegmentedControl
            size="dense"
            aria-label="Biometric unlock"
            value={enabled ? 'on' : 'off'}
            onChange={(v) => void setBiometric(v as 'off' | 'on')}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'on', label: 'On', disabled: !supported || busy },
            ]}
          />
          {error && <p className="text-xs text-danger">{error}</p>}
          {enabled && (
            <Link to="/lock">
              <Button variant="secondary" className="w-full" disabled={busy}>
                Test lock screen
              </Button>
            </Link>
          )}
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
