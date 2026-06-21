import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/Card';
import { ExpiringBanner, ExpiryChip } from '@/components/ExpiryChip';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberDocStats } from '@/components/MemberDocStats';
import { PendingVerificationBanner } from '@/components/PendingVerificationBanner';
import { dismissExpiringBanner, isExpiringBannerDismissed } from '@/lib/expiringBanner';
import { canViewDocument } from '@/lib/documentVisibility';
import { isHealthDomainDoc } from '@/lib/docTags';
import { memberFamilyDocStats } from '@/lib/memberStats';
import { getExpiringDocuments, useVaultStore } from '@/store/useVaultStore';
import { MemberVaultPanel } from '@/features/family/MemberVaultPanel';

export function MemberVaultContent({ memberId }: { memberId: string }) {
  const user = useVaultStore((s) => s.user);
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const member = useMemo(() => members.find((m) => m.id === memberId), [members, memberId]);
  const stats = useMemo(() => memberFamilyDocStats(documents, memberId), [documents, memberId]);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const navigate = useNavigate();

  const memberDocs = useMemo(
    () => documents.filter((d) => !d.archivedAt && !isHealthDomainDoc(d) && d.memberId === memberId),
    [documents, memberId],
  );

  const visibleMemberDocs = useMemo(
    () => memberDocs.filter((d) => canViewDocument(d, members, user, shareGrants, documents)),
    [memberDocs, members, user, shareGrants],
  );

  const expiringDocs = useMemo(
    () => getExpiringDocuments(visibleMemberDocs),
    [visibleMemberDocs],
  );

  useEffect(() => {
    setBannerDismissed(isExpiringBannerDismissed());
  }, []);

  useEffect(() => {
    setBannerDismissed(isExpiringBannerDismissed());
  }, [memberId]);

  const dismissExpiringBannerHandler = () => {
    setBannerDismissed(true);
    dismissExpiringBanner();
  };

  const openDueDocuments = (id?: string) => {
    navigate(`/expiring?member=${id ?? memberId}`);
  };

  if (!member) return null;

  return (
    <div className="space-y-5">
      <PendingVerificationBanner />
      {!bannerDismissed && expiringDocs.length > 0 && (
        <ExpiringBanner
          count={expiringDocs.length}
          onClick={openDueDocuments}
          onDismiss={dismissExpiringBannerHandler}
        />
      )}

      <div className="space-y-3">
        <div className="flex w-full items-center gap-3.5 rounded-2xl">
          <MemberAvatar member={member} size="sm" documents={documents} />
          <div>
            <p className="font-semibold tracking-tight">{member.displayName}</p>
            <p className="text-xs text-muted">
              <MemberDocStats
                total={stats.total}
                expiring={stats.expiring}
                memberId={member.id}
                onDueSoon={openDueDocuments}
              />
            </p>
          </div>
        </div>
        <MemberVaultPanel memberId={member.id} showRelationship={false} />
      </div>
    </div>
  );
}

export function MemberVaultView({ memberId }: { memberId: string }) {
  const user = useVaultStore((s) => s.user);
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const member = useMemo(() => members.find((m) => m.id === memberId), [members, memberId]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const memberDocs = useMemo(
    () =>
      documents.filter(
        (d) =>
          !d.archivedAt &&
          !isHealthDomainDoc(d) &&
          d.memberId === memberId &&
          canViewDocument(d, members, user, shareGrants, documents),
      ),
    [documents, memberId, members, user, shareGrants],
  );

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return memberDocs.filter((d) => {
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
  }, [search, memberDocs, member]);

  useEffect(() => {
    setSearch('');
  }, [memberId]);

  if (!member) return null;

  const searching = search.trim().length > 0;

  return (
    <>
      <input
        type="search"
        placeholder="Search passport, PAN, insurance…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search documents"
        className="min-h-11 w-full rounded-2xl border border-border bg-surface-elevated px-4 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />

      {searching ? (
        <section className="space-y-2">
          <p className="section-label">
            {searchResults.length} result{searchResults.length === 1 ? '' : 's'}
          </p>
          {searchResults.length === 0 && (
            <p className="text-sm text-muted">No documents match &ldquo;{search.trim()}&rdquo;.</p>
          )}
          {searchResults.map((d) => (
            <Card key={d.id} onClick={() => navigate(`/documents/${d.id}`)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{d.title}</p>
                  <p className="text-xs text-muted">{d.docType.replace(/_/g, ' ')}</p>
                </div>
                <ExpiryChip date={d.expiryDate} />
              </div>
            </Card>
          ))}
        </section>
      ) : (
        <MemberVaultContent memberId={memberId} />
      )}
    </>
  );
}
