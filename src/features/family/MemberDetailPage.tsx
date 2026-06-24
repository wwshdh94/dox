import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { HomeFab } from '@/components/HomeFab';
import { useVaultStore } from '@/store/useVaultStore';
import { MemberInviteSection } from '@/features/family/MemberInviteSection';
import { MemberVaultView } from '@/features/family/MemberVaultView';

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const members = useVaultStore((s) => s.members);
  const member = useMemo(() => members.find((m) => m.id === id), [members, id]);

  if (!member) {
    return (
      <div className="min-h-full pb-28">
        <Header backFallback="/" />
        <main className="page-main animate-fade-up">
          <p className="text-sm text-muted">Member not found</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28">
      <Header backFallback="/" />
      <main className="page-main animate-fade-up space-y-5">
        <MemberInviteSection member={member} variant="actions" />
        <MemberVaultView memberId={member.id} />
      </main>
      <BottomNav />
      <HomeFab context="family" memberId={member.id} />
    </div>
  );
}
