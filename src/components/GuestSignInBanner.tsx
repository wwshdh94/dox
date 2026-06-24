import { Link } from 'react-router-dom';
import { useVaultStore } from '@/store/useVaultStore';
import { isGuestExplore } from '@/lib/guestExplore';

export function GuestSignInBanner() {
  const settings = useVaultStore((s) => s.settings);
  const completeWelcome = useVaultStore((s) => s.completeWelcome);

  if (!isGuestExplore(settings)) return null;

  return (
    <div className="safe-top sticky top-0 z-50 border-b border-accent-muted/50 bg-accent/95 px-4 py-2.5 text-accent-fg backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
        <p className="text-xs leading-snug">
          <span className="font-semibold">Preview mode</span> — sign in with Google to save your vault.
        </p>
        <Link
          to="/login"
          onClick={() => completeWelcome()}
          className="shrink-0 rounded-full bg-surface-elevated px-3 py-1.5 text-xs font-semibold text-accent-ink shadow-sm"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
