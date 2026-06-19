import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { useVaultStore } from '@/store/useVaultStore';
import { MemberVaultPanel } from '@/features/family/MemberVaultPanel';
import { MemberInviteSection } from '@/features/family/MemberInviteSection';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const members = useVaultStore((s) => s.members);
  const member = useMemo(() => members.find((m) => m.id === id), [members, id]);

  if (!member) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Member" backFallback="/" />
        <main className="page-main">
          <p className="text-sm text-muted">Member not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28">
      <Header title={member.displayName} backFallback="/" />
      <main className="page-main animate-fade-up space-y-4">
        <MemberInviteSection member={member} />
        <MemberVaultPanel memberId={member.id} />
      </main>
      <BottomNav />
    </div>
  );
}
