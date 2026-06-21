import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { getUserBlock } from '@/lib/userModeration';
import { useVaultStore } from '@/store/useVaultStore';

export function BlockedAccountPage() {
  const user = useVaultStore((s) => s.user);
  const signOut = useVaultStore((s) => s.signOut);
  const block = user ? getUserBlock(user.id, user.email) : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <Header title="Account suspended" />
      <main className="page-main flex flex-1 flex-col justify-center space-y-4 text-center">
        <div className="surface-panel-elevated mx-auto max-w-md space-y-3 p-6">
          <p className="font-display text-2xl text-text">Access restricted</p>
          <p className="text-sm text-muted">
            This PreVault account has been suspended. If you believe this is a mistake, contact
            support from the email on your account.
          </p>
          {block?.reason ? (
            <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
              Reason: {block.reason}
            </p>
          ) : null}
          <Button variant="secondary" className="w-full" onClick={() => signOut()}>
            Sign out
          </Button>
        </div>
      </main>
    </div>
  );
}
