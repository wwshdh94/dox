import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ExpiryChip } from '@/components/ExpiryChip';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { HomeFab } from '@/components/HomeFab';
import { getExpiringDocuments, getHealthDocuments, useVaultStore } from '@/store/useVaultStore';
import { memberAvatarGradient } from '@/lib/avatar';
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
  const expiringInsurance = useMemo(
    () => {
      const insurance = healthDocs.filter((d) => d.docType === 'health_insurance');
      const scoped =
        familyHomeView === 'me' && owner
          ? insurance.filter((d) => d.memberId === owner.id)
          : insurance;
      return getExpiringDocuments(scoped, 60);
    },
    [healthDocs, familyHomeView, owner],
  );
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
        {expiringInsurance.length > 0 && (
          <button
            type="button"
            onClick={() => navigate(`/documents/${expiringInsurance[0]!.id}`)}
            className="w-full rounded-2xl border border-warning/25 bg-warning/8 px-4 py-3.5 text-left shadow-sm transition-all hover:bg-warning/12 active:scale-[0.99]"
          >
            <p className="text-sm font-semibold text-warning">Insurance renewal due</p>
            <p className="mt-0.5 text-xs text-muted">
              {expiringInsurance.length} health polic{expiringInsurance.length === 1 ? 'y' : 'ies'} expiring within 60 days
            </p>
          </button>
        )}

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
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${memberAvatarGradient(member.displayName)} text-lg font-semibold text-white shadow-sm`}
                  >
                    {member.displayName.charAt(0)}
                  </div>
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
