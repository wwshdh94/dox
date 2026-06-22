import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ExpiryChip } from '@/components/ExpiryChip';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { HomeFab } from '@/components/HomeFab';
import { getHealthDocuments, useVaultStore } from '@/store/useVaultStore';
import { MemberAvatar } from '@/components/MemberAvatar';
import { getOwnerMember } from '@/lib/family';
import { hasEmergencyInfo } from '@/lib/health';

export function HealthPage() {
  const allMembers = useVaultStore((s) => s.members);
  const allDocuments = useVaultStore((s) => s.documents);
  const familyHomeView = useVaultStore((s) => s.settings.familyHomeView ?? 'me');
  const activeMembers = useMemo(
    () => allMembers.filter((m) => m.status !== 'disabled'),
    [allMembers],
  );
  const owner = useMemo(() => getOwnerMember(activeMembers), [activeMembers]);
  const members = useMemo(() => {
    if (familyHomeView === 'me' && owner) {
      return activeMembers.filter((m) => m.id === owner.id);
    }
    return activeMembers;
  }, [activeMembers, familyHomeView, owner]);
  const healthDocs = useMemo(() => getHealthDocuments(allDocuments), [allDocuments]);
  const navigate = useNavigate();

  const memberStats = members.map((m) => {
    const docs = healthDocs.filter((d) => d.memberId === m.id);
    const insurance = docs.find((d) => d.docType === 'health_insurance');
    return { member: m, count: docs.length, insurance };
  });

  return (
    <div className="min-h-full pb-28">
      <Header />
      <main className="page-main animate-fade-up space-y-5">
        <section className="surface-panel p-4 text-sm">
          <p className="font-semibold">Emergency-ready vault</p>
          <p className="mt-1 text-muted">
            Keep blood group, allergies, and an emergency contact on each profile — quick to show at clinics or hospitals.
          </p>
        </section>

        <div className="space-y-3">
          <p className="section-label">{familyHomeView === 'me' ? 'My health' : 'Family health'}</p>
          {memberStats.map(({ member, count, insurance }) => (
            <Card key={member.id} onClick={() => navigate(`/health/${member.id}`)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <MemberAvatar member={member} size="sm" documents={allDocuments} />
                  <div>
                    <p className="font-semibold tracking-tight">{member.displayName}</p>
                    <p className="text-xs text-muted">
                      {count} record{count === 1 ? '' : 's'}
                      {hasEmergencyInfo(member.healthSummary) ? ' · Emergency card set' : ''}
                    </p>
                  </div>
                </div>
                {insurance?.expiryDate && <ExpiryChip date={insurance.expiryDate} />}
              </div>
            </Card>
          ))}
        </div>

        {healthDocs.length === 0 && (
          <p className="text-center text-sm text-muted">
            No health records yet. Tap + to add insurance, lab reports, or prescriptions.
          </p>
        )}
      </main>
      <BottomNav />
      <HomeFab context="health" />
    </div>
  );
}
