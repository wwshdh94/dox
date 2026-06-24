import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import {
  deleteHouseholdVaultOnServer,
  deleteOwnerAccountOnServer,
  fetchHouseholdTransferCandidates,
  mergeTransferCandidates,
  type TransferCandidate,
} from '@/lib/accountLifecycle';
import { canManageFamilyAccess } from '@/lib/family';
import { isSupabaseConfigured } from '@/lib/supabase/auth';
import { useVaultStore } from '@/store/useVaultStore';

const DELETE_VAULT_PHRASE = 'DELETE VAULT';
const DELETE_ACCOUNT_PHRASE = 'DELETE ACCOUNT';

export function AccountPage() {
  const navigate = useNavigate();
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const signOut = useVaultStore((s) => s.signOut);
  const purgeVaultData = useVaultStore((s) => s.purgeVaultData);
  const transferOwnershipLocally = useVaultStore((s) => s.transferOwnershipLocally);
  const signOutLocal = useVaultStore((s) => s.signOutLocal);

  const isOwner = canManageFamilyAccess(members, user);
  const supabaseEnabled = isSupabaseConfigured();

  const [signOutOpen, setSignOutOpen] = useState(false);

  const [candidates, setCandidates] = useState<TransferCandidate[]>([]);
  const [candidatesError, setCandidatesError] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [deleteVaultOpen, setDeleteVaultOpen] = useState(false);
  const [deleteVaultPhrase, setDeleteVaultPhrase] = useState('');
  const [deleteVaultBusy, setDeleteVaultBusy] = useState(false);
  const [deleteVaultError, setDeleteVaultError] = useState('');

  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [deleteAccountPhrase, setDeleteAccountPhrase] = useState('');
  const [successorUserId, setSuccessorUserId] = useState('');
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState('');

  useEffect(() => {
    if (!isOwner) return;

    let cancelled = false;
    void (async () => {
      setLoadingCandidates(true);
      setCandidatesError('');

      if (!supabaseEnabled) {
        const local = mergeTransferCandidates(members, []);
        if (!cancelled) {
          setCandidates(
            local.length > 0
              ? local
              : members
                  .filter((m) => m.role !== 'owner' && m.status === 'active' && m.joinedAt)
                  .map((m) => ({
                    userId: m.id,
                    email: m.email ?? '',
                    displayName: m.displayName,
                    memberId: m.id,
                  })),
          );
          setLoadingCandidates(false);
        }
        return;
      }

      const res = await fetchHouseholdTransferCandidates();
      if (cancelled) return;
      if (!res.ok) {
        setCandidatesError(res.error);
        setCandidates([]);
        setLoadingCandidates(false);
        return;
      }

      setCandidates(mergeTransferCandidates(members, res.candidates));
      setLoadingCandidates(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOwner, members, supabaseEnabled]);

  const selectedSuccessor = useMemo(
    () => candidates.find((c) => c.userId === successorUserId),
    [candidates, successorUserId],
  );

  if (!user || user.isGuestPreview) {
    return <Navigate to="/login" replace />;
  }

  const runDeleteVault = async () => {
    if (deleteVaultPhrase.trim() !== DELETE_VAULT_PHRASE) {
      setDeleteVaultError(`Type ${DELETE_VAULT_PHRASE} to confirm.`);
      return;
    }

    setDeleteVaultBusy(true);
    setDeleteVaultError('');

    if (supabaseEnabled) {
      const res = await deleteHouseholdVaultOnServer();
      if (!res.ok) {
        setDeleteVaultBusy(false);
        setDeleteVaultError(res.error);
        return;
      }
    }

    purgeVaultData();
    setDeleteVaultOpen(false);
    setDeleteVaultBusy(false);
    navigate('/', { replace: true });
  };

  const runDeleteAccount = async () => {
    if (!selectedSuccessor) {
      setDeleteAccountError('Choose a family member to receive vault ownership.');
      return;
    }
    if (deleteAccountPhrase.trim() !== DELETE_ACCOUNT_PHRASE) {
      setDeleteAccountError(`Type ${DELETE_ACCOUNT_PHRASE} to confirm.`);
      return;
    }

    setDeleteAccountBusy(true);
    setDeleteAccountError('');

    if (supabaseEnabled) {
      const res = await deleteOwnerAccountOnServer(selectedSuccessor.userId);
      if (!res.ok) {
        setDeleteAccountBusy(false);
        setDeleteAccountError(res.error);
        return;
      }
      signOutLocal();
      navigate('/login', { replace: true });
      return;
    }

    if (selectedSuccessor.memberId) {
      transferOwnershipLocally(selectedSuccessor.memberId);
    }
    signOutLocal();
    setDeleteAccountOpen(false);
    setDeleteAccountBusy(false);
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-full pb-8">
      <Header title="Account" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-5">
        <div className="surface-panel-elevated p-4">
          <p className="font-display text-lg text-text">{user.name}</p>
          <p className="mt-1 text-sm text-muted">{user.email}</p>
        </div>

        <section className="rounded-2xl border-2 border-danger/25 bg-danger/5 p-4">
          <p className="section-label text-danger">Session</p>
          <p className="mt-1 text-xs text-muted">
            Sign out of PreVault on this device. Your documents stay encrypted on the server.
          </p>
          <Button
            variant="danger"
            className="mt-3 w-full border border-danger/30"
            onClick={() => setSignOutOpen(true)}
          >
            Sign out
          </Button>
        </section>

        {isOwner && (
          <>
            <p className="text-sm text-muted">
              These actions are permanent. Only the vault owner can delete the household vault or
              delete their account after transferring ownership.
            </p>

            <section className="rounded-2xl border-2 border-danger/25 bg-danger/5 space-y-3 p-4">
              <p className="section-label text-danger">Delete entire vault</p>
              <p className="text-xs text-muted">
                Permanently removes all documents, encrypted files, family members, share links, and
                household metadata from PreVault. Your Google account stays — you can start a new
                vault after signing in again.
              </p>
              <Button
                variant="danger"
                className="w-full border border-danger/30"
                onClick={() => {
                  setDeleteVaultPhrase('');
                  setDeleteVaultError('');
                  setDeleteVaultOpen(true);
                }}
              >
                Delete vault
              </Button>
            </section>

            <section className="rounded-2xl border-2 border-danger/25 bg-danger/5 space-y-3 p-4">
              <p className="section-label text-danger">Delete my account</p>
              <p className="text-xs text-muted">
                Transfer vault ownership to a family member who has joined PreVault, then delete
                your PreVault account. Your documents remain encrypted under the new owner&apos;s
                login.
              </p>
              {loadingCandidates ? (
                <p className="text-xs text-muted">Loading eligible family members…</p>
              ) : candidates.length === 0 ? (
                <p className="text-xs text-warning">
                  Invite a family member and have them join with Google before you can delete your
                  account. Or delete the entire vault instead.
                </p>
              ) : (
                <p className="text-xs text-muted">
                  {candidates.length} family member{candidates.length === 1 ? '' : 's'} can receive
                  ownership.
                </p>
              )}
              {candidatesError && <p className="text-xs text-danger">{candidatesError}</p>}
              <Button
                variant="danger"
                className="w-full border border-danger/30"
                disabled={loadingCandidates || candidates.length === 0}
                onClick={() => {
                  setSuccessorUserId(candidates[0]?.userId ?? '');
                  setDeleteAccountPhrase('');
                  setDeleteAccountError('');
                  setDeleteAccountOpen(true);
                }}
              >
                Delete account
              </Button>
            </section>
          </>
        )}
      </main>

      <Modal open={signOutOpen} onClose={() => setSignOutOpen(false)} title="Sign out?">
        <p className="mb-4 text-sm text-muted">
          You will need to sign in with Google again to access your vault on this device.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => setSignOutOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => {
              setSignOutOpen(false);
              void signOut();
            }}
          >
            Sign out
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteVaultOpen}
        onClose={() => !deleteVaultBusy && setDeleteVaultOpen(false)}
        title="Delete entire vault?"
      >
        <p className="mb-3 text-sm text-muted">
          This cannot be undone. All documents, members, and metadata will be permanently deleted.
        </p>
        <label className="mb-4 block space-y-1.5">
          <span className="text-xs font-medium text-muted">
            Type <span className="font-mono text-text">{DELETE_VAULT_PHRASE}</span> to confirm
          </span>
          <input
            className="min-h-11 w-full rounded-2xl border border-border bg-surface-elevated px-4 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent-soft"
            value={deleteVaultPhrase}
            onChange={(e) => setDeleteVaultPhrase(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {deleteVaultError && <p className="mb-3 text-xs text-danger">{deleteVaultError}</p>}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={deleteVaultBusy}
            onClick={() => setDeleteVaultOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteVaultBusy}
            onClick={() => void runDeleteVault()}
          >
            {deleteVaultBusy ? 'Deleting…' : 'Delete vault'}
          </Button>
        </div>
      </Modal>

      <Modal
        open={deleteAccountOpen}
        onClose={() => !deleteAccountBusy && setDeleteAccountOpen(false)}
        title="Delete your account?"
      >
        <p className="mb-3 text-sm text-muted">
          Ownership moves to the person you select. Your PreVault profile and access will be
          removed.
        </p>
        <label className="mb-3 block space-y-1.5">
          <span className="text-xs font-medium text-muted">New vault owner</span>
          <select
            className="w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text"
            value={successorUserId}
            onChange={(e) => setSuccessorUserId(e.target.value)}
          >
            {candidates.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.displayName} ({c.email})
              </option>
            ))}
          </select>
        </label>
        <label className="mb-4 block space-y-1.5">
          <span className="text-xs font-medium text-muted">
            Type <span className="font-mono text-text">{DELETE_ACCOUNT_PHRASE}</span> to confirm
          </span>
          <input
            className="min-h-11 w-full rounded-2xl border border-border bg-surface-elevated px-4 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent-soft"
            value={deleteAccountPhrase}
            onChange={(e) => setDeleteAccountPhrase(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {deleteAccountError && <p className="mb-3 text-xs text-danger">{deleteAccountError}</p>}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={deleteAccountBusy}
            onClick={() => setDeleteAccountOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            disabled={deleteAccountBusy}
            onClick={() => void runDeleteAccount()}
          >
            {deleteAccountBusy ? 'Deleting…' : 'Delete account'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
