import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Button } from '@/components/Button';
import { acceptHouseholdInvite } from '@/lib/supabase/households';
import { useVaultStore } from '@/store/useVaultStore';

export function JoinHouseholdPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useVaultStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const token = useMemo(() => params.get('token')?.trim() ?? '', [params]);
  const memberId = useMemo(() => params.get('member')?.trim() ?? '', [params]);

  useEffect(() => {
    if (!token) {
      setError('Invite token missing.');
      return;
    }
    if (!user || user.isGuestPreview) {
      setError('Sign in first, then open this invite link again.');
      return;
    }

    let cancelled = false;
    void (async () => {
      const res = await acceptHouseholdInvite(token, memberId || undefined);
      if (cancelled) return;
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, memberId, user]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-danger whitespace-pre-line">{error}</p>
        <Button variant="secondary" onClick={() => navigate('/profile/family', { replace: true })}>
          Back to family
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-text">Joined household successfully.</p>
        <Button onClick={() => navigate('/', { replace: true })}>Go to Family</Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingScreen label="Joining household…" />
    </div>
  );
}

