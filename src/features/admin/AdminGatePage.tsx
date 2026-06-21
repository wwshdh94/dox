import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Logo } from '@/components/Logo';
import {
  adminLogin,
  isAdminAuthenticated,
  isAdminConfigured,
  isAdminOwnerEmail,
  isDevAdminBypass,
} from '@/lib/adminAuth';
import { useVaultStore } from '@/store/useVaultStore';

export function AdminGatePage() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const user = useVaultStore((s) => s.user);

  useEffect(() => {
    if (isAdminAuthenticated(user?.email)) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate, user?.email]);

  if (isAdminAuthenticated(user?.email)) {
    return null;
  }

  if (!isAdminConfigured()) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm space-y-4 text-center">
          <Logo size="md" className="mx-auto" />
          <h1 className="font-display text-2xl text-text">Admin</h1>
          <p className="text-sm text-muted">
            Set <code className="text-accent-ink">VITE_ADMIN_OWNER_EMAIL</code> and{' '}
            <code className="text-accent-ink">VITE_ADMIN_DASHBOARD_KEY</code> in .env to enable admin.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm space-y-4 text-center">
          <Logo size="md" className="mx-auto" />
          <h1 className="font-display text-2xl text-text">Admin</h1>
          <p className="text-sm text-muted">Sign in to your PreVault account first.</p>
          <Link to="/login" className="text-sm text-accent-ink">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdminOwnerEmail(user.email)) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm space-y-4 text-center">
          <Logo size="md" className="mx-auto" />
          <h1 className="font-display text-2xl text-text">Not authorized</h1>
          <p className="text-sm text-muted">
            This account is not authorized for admin access. Sign in with the owner account configured
            in the app environment.
          </p>
          <Link to="/" className="text-sm text-accent-ink">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminLogin(passcode, user.email)) {
      navigate('/admin/dashboard');
    } else {
      setError('Invalid passcode.');
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <form onSubmit={submit} className="mx-auto w-full max-w-sm space-y-6">
        <div className="text-center">
          <Logo size="md" className="mx-auto mb-4" />
          <h1 className="font-display text-2xl text-text">PreVault Admin</h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {user.email}. Enter your admin passcode.
          </p>
          {isDevAdminBypass() ? (
            <p className="mt-2 text-xs text-muted">
              Dev mode — no env required. Passcode: <code className="text-accent-ink">7829</code>
            </p>
          ) : null}
        </div>
        <Input
          label="Passcode"
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoComplete="current-password"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>
    </div>
  );
}
