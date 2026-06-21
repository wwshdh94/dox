import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Header } from '@/components/Header';
import { verifyBiometricCredential } from '@/lib/biometricLock';
import { useVaultStore } from '@/store/useVaultStore';

export function LockPage() {
  const navigate = useNavigate();
  const user = useVaultStore((s) => s.user);
  const settings = useVaultStore((s) => s.settings);
  const unlock = useVaultStore((s) => s.unlock);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prompted = useRef(false);

  const tryUnlock = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyBiometricCredential(user.id);
      if (ok) {
        unlock();
        navigate('/', { replace: true });
        return;
      }
      setError('Biometric verification failed. Try again.');
    } catch {
      setError('Biometric verification was cancelled or failed.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (prompted.current || !settings.biometricLockEnabled || !user) return;
    prompted.current = true;
    void tryUnlock();
  }, [settings.biometricLockEnabled, user?.id]);

  if (!settings.biometricLockEnabled) {
    return <Navigate to="/profile/security" replace />;
  }

  return (
    <div className="min-h-full pb-8">
      <Header title="Unlock" backFallback="/profile/security" />
      <div className="flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="text-4xl">🔒</div>
          <p className="text-sm text-muted">Use your device biometrics to unlock PreVault</p>
          {error && <p className="text-xs text-danger">{error}</p>}
          <Button className="w-full" disabled={busy} onClick={() => void tryUnlock()}>
            {busy ? 'Verifying…' : 'Unlock with biometrics'}
          </Button>
          <Link to="/profile/security" className="block text-xs text-accent-ink">
            Security settings
          </Link>
        </div>
      </div>
    </div>
  );
}
