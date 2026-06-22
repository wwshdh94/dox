import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MemberAvatar } from '@/components/MemberAvatar';
import { MemberDocStats } from '@/components/MemberDocStats';
import { DocumentPill } from '@/features/family/DocumentPill';
import { canViewDocument } from '@/lib/documentVisibility';
import { isHealthDomainDoc } from '@/lib/docTags';
import { memberFamilyDocStats } from '@/lib/memberStats';
import { useVaultStore } from '@/store/useVaultStore';
import { VaultSearchRow } from '@/features/family/VaultSearchRow';
import { MemberVaultPanel } from '@/features/family/MemberVaultPanel';

export function MemberVaultContent({
  memberId,
  hideMemberHeader = false,
}: {
  memberId: string;
  hideMemberHeader?: boolean;
}) {
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const member = useMemo(() => members.find((m) => m.id === memberId), [members, memberId]);
  const stats = useMemo(() => memberFamilyDocStats(documents, memberId), [documents, memberId]);
  const navigate = useNavigate();

  const openDueDocuments = (id?: string) => {
    navigate(`/expiring?member=${id ?? memberId}`);
  };

  if (!member) return null;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {!hideMemberHeader && (
          <div className="flex w-full items-center gap-3.5 rounded-2xl">
            <MemberAvatar member={member} size="sm" documents={documents} />
            <div className="flex min-w-0 flex-col justify-center gap-0.5 self-stretch py-0.5">
              <p className="font-semibold leading-tight tracking-tight">{member.displayName}</p>
              <p className="text-[0.6875rem] leading-tight text-muted">
                <MemberDocStats
                  total={stats.total}
                  expiring={stats.expiring}
                  memberId={member.id}
                  onDueSoon={openDueDocuments}
                />
              </p>
            </div>
          </div>
        )}
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
  const stats = useMemo(() => memberFamilyDocStats(documents, memberId), [documents, memberId]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const openDueDocuments = (id?: string) => {
    navigate(`/expiring?member=${id ?? memberId}`);
  };

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
      <VaultSearchRow
        search={search}
        onSearchChange={setSearch}
        member={member}
        documents={documents}
        docStats={stats}
        onDueSoon={openDueDocuments}
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
            <DocumentPill
              key={d.id}
              document={d}
              compact
              onOpen={() => navigate(`/documents/${d.id}`)}
            />
          ))}
        </section>
      ) : (
        <MemberVaultContent memberId={memberId} hideMemberHeader />
      )}
    </>
  );
}
