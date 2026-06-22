import { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ExpiryChip } from '@/components/ExpiryChip';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { HomeFab } from '@/components/HomeFab';
import { DocumentPill } from '@/features/family/DocumentPill';
import { getExpiringDocuments, useVaultStore } from '@/store/useVaultStore';
import { daysUntil } from '@/lib/format';
import { MemberAvatar } from '@/components/MemberAvatar';
import { docsForMemberByDomain, isHealthDomainDoc } from '@/lib/docTags';
import { canViewDocument } from '@/lib/documentVisibility';
import { MemberDocStats } from '@/components/MemberDocStats';
import { getOwnerMember, getOtherFamilyMembers } from '@/lib/family';
import { memberHasJoined, memberLastActiveLabel } from '@/lib/memberActivity';
import { MemberVaultContent } from '@/features/family/MemberVaultView';
import { VaultSearchRow, vaultSearchInputClassName } from '@/features/family/VaultSearchRow';
import { memberFamilyDocStats } from '@/lib/memberStats';
import { debug } from '@/lib/debug';

export function FamilyPage() {
  const allMembers = useVaultStore((s) => s.members);
  const members = useMemo(
    () => allMembers.filter((m) => m.status !== 'disabled'),
    [allMembers],
  );
  const documents = useVaultStore((s) => s.documents);
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const user = useVaultStore((s) => s.user);
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
      if (!canViewDocument(d, members, user, shareGrants, documents)) return false;
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
  }, [search, documents, members, user, shareGrants]);

  const searching = search.trim().length > 0;

  const openDueDocuments = (memberId?: string) => {
    if (memberId) {
      navigate(`/expiring?member=${memberId}`);
      return;
    }
    navigate('/expiring');
  };

  useEffect(() => {
    debug('FamilyPage', 'mounted', { members: members.length, documents: documents.length, view: familyHomeView });
  }, [members.length, documents.length, familyHomeView]);

  const memberStats = otherMembers.map((m) => {
    const stats = memberFamilyDocStats(documents, m.id);
    const familyDocs = docsForMemberByDomain(documents, m.id, 'family');
    const nearest = familyDocs
      .filter((d) => d.expiryDate && !d.renewedAt)
      .sort((a, b) => daysUntil(a.expiryDate!) - daysUntil(b.expiryDate!))[0];
    return { member: m, stats, nearest };
  });

  const ownerStats = useMemo(
    () => (owner ? memberFamilyDocStats(documents, owner.id) : null),
    [documents, owner],
  );

  return (
    <div className="min-h-full pb-28">
      <Header />
      <main className="page-main animate-fade-up space-y-5">
        {familyHomeView === 'me' && owner ? (
          <VaultSearchRow
            search={search}
            onSearchChange={setSearch}
            member={owner}
            documents={documents}
            docStats={ownerStats ?? undefined}
            onDueSoon={openDueDocuments}
          />
        ) : (
          <input
            type="search"
            placeholder="Search passport, PAN, insurance…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search documents"
            className={vaultSearchInputClassName}
          />
        )}

        {searching ? (
          <section className="space-y-2">
            <p className="section-label">
              {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
            </p>
            {searchResults.length === 0 && (
              <p className="text-sm text-muted">No documents match &ldquo;{search.trim()}&rdquo;.</p>
            )}
            {searchResults.map((d) => (
              <DocumentPill
                key={d.id}
                document={d}
                compact
                onOpen={() => navigate(`/documents/${d.id}`)}
              />
            ))}
          </section>
        ) : familyHomeView === 'me' ? (
          owner ? (
            <MemberVaultContent memberId={owner.id} hideMemberHeader />
          ) : (
            <p className="text-sm text-muted">Add yourself during onboarding to see your vault.</p>
          )
        ) : (
          <>
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
              {memberStats.map(({ member, stats, nearest }) => (
                <Card key={member.id} onClick={() => navigate(`/family/${member.id}`)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <MemberAvatar member={member} size="sm" documents={documents} />
                      <div>
                        <p className="font-semibold tracking-tight">{member.displayName}</p>
                        <p className="text-xs text-muted">
                          {member.relationship} ·{' '}
                          <MemberDocStats
                            total={stats.total}
                            expiring={stats.expiring}
                            memberId={member.id}
                            onDueSoon={openDueDocuments}
                          />
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
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('member') ?? undefined;
  const navigate = useNavigate();

  const filterMember = memberId ? members.find((m) => m.id === memberId) : undefined;

  const expiring = useMemo(() => {
    const all = getExpiringDocuments(documents.filter((d) => !isHealthDomainDoc(d))).filter((d) =>
      canViewDocument(d, members, user, shareGrants, documents),
    );
    if (!memberId) return all;
    return all.filter((d) => d.memberId === memberId);
  }, [documents, memberId, members, user, shareGrants]);

  return (
    <div className="min-h-full pb-28">
      <Header
        title={filterMember ? `${filterMember.displayName} — due soon` : 'Expiring soon'}
        backFallback="/"
      />
      <main className="page-main animate-fade-up space-y-3">
        {expiring.length === 0 && <p className="text-sm text-muted">Nothing expiring in 30 days.</p>}
        {expiring.map((d) => (
          <DocumentPill
            key={d.id}
            document={d}
            compact
            onOpen={() => navigate(`/documents/${d.id}`)}
          />
        ))}
      </main>
      <BottomNav />
    </div>
  );
}
