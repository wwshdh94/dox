import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ExpiringBanner, ExpiryChip } from '@/components/ExpiryChip';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { HomeFab } from '@/components/HomeFab';
import { Input } from '@/components/Input';
import { getExpiringDocuments, useVaultStore } from '@/store/useVaultStore';
import { daysUntil } from '@/lib/format';
import { memberAvatarGradient } from '@/lib/avatar';
import { docsForMemberByDomain, isHealthDomainDoc } from '@/lib/docTags';
import { getOwnerMember, getOtherFamilyMembers } from '@/lib/family';
import { memberHasJoined, memberLastActiveLabel } from '@/lib/memberActivity';
import { MemberVaultPanel } from '@/features/family/MemberVaultPanel';
import { PendingVerificationBanner } from '@/components/PendingVerificationBanner';
import { debug } from '@/lib/debug';

export function FamilyPage() {
  const allMembers = useVaultStore((s) => s.members);
  const members = useMemo(
    () => allMembers.filter((m) => m.status !== 'disabled'),
    [allMembers],
  );
  const documents = useVaultStore((s) => s.documents);
  const familyHomeView = useVaultStore((s) => s.settings.familyHomeView ?? 'me');
  const owner = useMemo(() => getOwnerMember(members), [members]);
  const otherMembers = useMemo(() => getOtherFamilyMembers(members), [members]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return documents.filter((d) => {
      if (d.archivedAt) return false;
      if (isHealthDomainDoc(d)) return false;
      const member = members.find((m) => m.id === d.memberId);
      const haystack = [
        d.title,
        d.docType.replace(/_/g, ' '),
        d.notes ?? '',
        member?.displayName ?? '',
        member?.relationship ?? '',
        ...Object.values(d.fields).map(String),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [search, documents, members]);

  const searching = search.trim().length > 0;

  const expiringDocs = useMemo(() => {
    const nonHealth = documents.filter((d) => !isHealthDomainDoc(d));
    if (familyHomeView === 'me' && owner) {
      return getExpiringDocuments(nonHealth.filter((d) => d.memberId === owner.id));
    }
    return getExpiringDocuments(nonHealth);
  }, [documents, familyHomeView, owner]);

  useEffect(() => {
    debug('FamilyPage', 'mounted', { members: members.length, documents: documents.length, view: familyHomeView });
  }, [members.length, documents.length, familyHomeView]);

  const memberStats = otherMembers.map((m) => {
    const familyDocs = docsForMemberByDomain(documents, m.id, 'family');
    const healthCount = docsForMemberByDomain(documents, m.id, 'health').length;
    const nearest = familyDocs
      .filter((d) => d.expiryDate && !d.renewedAt)
      .sort((a, b) => daysUntil(a.expiryDate!) - daysUntil(b.expiryDate!))[0];
    return { member: m, count: familyDocs.length, healthCount, nearest };
  });

  return (
    <div className="min-h-full pb-28">
      <Header />
      <main className="page-main animate-fade-up space-y-5">
        <Input
          label="Search"
          type="search"
          placeholder="Passport, PAN, insurance…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search documents"
        />

        {searching ? (
          <section className="space-y-2">
            <p className="section-label">
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
            </p>
            {searchResults.length === 0 && (
              <p className="text-sm text-muted">No documents match &ldquo;{search.trim()}&rdquo;.</p>
            )}
            {searchResults.map((d) => {
              const member = members.find((m) => m.id === d.memberId);
              return (
                <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{d.title}</p>
                      <p className="text-xs text-muted">
                        {member?.displayName ?? 'Household'} · {d.docType.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <ExpiryChip date={d.expiryDate} />
                  </div>
                </Card>
              );
            })}
          </section>
        ) : (
          <>
        <PendingVerificationBanner />
        <ExpiringBanner count={expiringDocs.length} onClick={() => navigate('/expiring')} />

        {familyHomeView === 'me' ? (
          owner ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate(`/family/${owner.id}`)}
                className="flex w-full items-center gap-3.5 rounded-2xl text-left transition-colors hover:bg-accent-soft/30"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${memberAvatarGradient(owner.displayName)} text-lg font-semibold text-white shadow-sm`}
                >
                  {owner.avatarUrl ? (
                    <img src={owner.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                  ) : (
                    owner.displayName.charAt(0)
                  )}
                </div>
                <div>
                  <p className="font-semibold tracking-tight">{owner.displayName}</p>
                  <p className="text-xs text-accent-ink">My documents</p>
                </div>
              </button>
              <MemberVaultPanel memberId={owner.id} showRelationship={false} />
            </div>
          ) : (
            <p className="text-sm text-muted">Add yourself during onboarding to see your vault.</p>
          )
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="section-label">Family members</p>
              <Link to="/profile/family" className="text-xs font-medium text-accent-ink">
                Manage →
              </Link>
            </div>
            {memberStats.length === 0 && (
              <p className="text-sm text-muted">
                No other family members yet.{' '}
                <Link to="/profile/family" className="text-accent-ink">
                  Add in Profile
                </Link>
              </p>
            )}
            {memberStats.map(({ member, count, healthCount, nearest }) => (
              <Card key={member.id} onClick={() => navigate(`/family/${member.id}`)}>
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
                        {member.relationship} · {count} doc{count === 1 ? '' : 's'}
                        {healthCount > 0 && ` · ${healthCount} in Health`}
                      </p>
                      {memberHasJoined(member) ? (
                        <p className="text-xs text-accent-ink">{memberLastActiveLabel(member)}</p>
                      ) : (
                        <p className="text-xs text-muted">Invite pending</p>
                      )}
                    </div>
                  </div>
                  {nearest?.expiryDate && <ExpiryChip date={nearest.expiryDate} />}
                </div>
              </Card>
            ))}
          </div>
        )}
          </>
        )}
      </main>
      <BottomNav />
      <HomeFab context="family" memberId={owner?.id} />
    </div>
  );
}

export function ExpiringPage() {
  const documents = useVaultStore((s) => s.documents);
  const members = useVaultStore((s) => s.members);
  const assets = useVaultStore((s) => s.assets);
  const expiring = getExpiringDocuments(documents);
  const navigate = useNavigate();

  return (
    <div className="min-h-full pb-28">
      <Header title="Expiring soon" backFallback="/" />
      <main className="page-main animate-fade-up space-y-3">
        {expiring.length === 0 && <p className="text-sm text-muted">Nothing expiring in 30 days.</p>}
        {expiring.map((d) => {
          const member = members.find((m) => m.id === d.memberId);
          const asset = assets.find((a) => a.id === d.assetId);
          return (
            <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-muted">{member?.displayName ?? asset?.label}</p>
                </div>
                <ExpiryChip date={d.expiryDate} />
              </div>
            </Card>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
}
