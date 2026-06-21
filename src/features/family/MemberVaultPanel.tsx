import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentPill } from '@/features/family/DocumentPill';
import { useVaultStore } from '@/store/useVaultStore';
import { docsForMemberByDomain } from '@/lib/docTags';

export function MemberVaultPanel({
  memberId,
  showRelationship = true,
}: {
  memberId: string;
  showRelationship?: boolean;
}) {
  const members = useVaultStore((s) => s.members);
  const allDocuments = useVaultStore((s) => s.documents);
  const member = useMemo(() => members.find((m) => m.id === memberId), [members, memberId]);
  const familyDocs = useMemo(
    () => docsForMemberByDomain(allDocuments, memberId, 'family'),
    [allDocuments, memberId],
  );
  const navigate = useNavigate();

  if (!member) return null;

  return (
    <div className="space-y-4">
      {showRelationship && <p className="text-sm text-muted">{member.relationship}</p>}

      <div className="space-y-2">
        <p className="section-label">Documents</p>
        {familyDocs.length === 0 && <p className="text-sm text-muted">No family documents yet.</p>}
        {familyDocs.map((d) => (
          <DocumentPill
            key={d.id}
            document={d}
            compact
            onOpen={() => navigate(`/documents/${d.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
