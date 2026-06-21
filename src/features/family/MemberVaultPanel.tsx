import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentCategoryFilter } from '@/components/DocumentCategoryFilter';
import { DocumentPill } from '@/features/family/DocumentPill';
import {
  activeFamilyDocFilters,
  filterFamilyDocs,
  type FamilyDocFilterId,
} from '@/lib/docCategoryFilter';
import { getSessionMember } from '@/lib/family';
import { visibleMemberFamilyDocs } from '@/lib/documentVisibility';
import { useVaultStore } from '@/store/useVaultStore';

export function MemberVaultPanel({
  memberId,
  showRelationship = true,
}: {
  memberId: string;
  showRelationship?: boolean;
}) {
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const shareGrants = useVaultStore((s) => s.shareGrants);
  const allDocuments = useVaultStore((s) => s.documents);
  const member = useMemo(() => members.find((m) => m.id === memberId), [members, memberId]);
  const sessionMember = useMemo(() => getSessionMember(members, user), [members, user]);
  const familyDocs = useMemo(
    () => visibleMemberFamilyDocs(allDocuments, memberId, members, user, shareGrants),
    [allDocuments, memberId, members, user, shareGrants],
  );
  const availableFilters = useMemo(() => activeFamilyDocFilters(familyDocs), [familyDocs]);
  const [categoryFilter, setCategoryFilter] = useState<FamilyDocFilterId>('all');
  const filteredDocs = useMemo(
    () => filterFamilyDocs(familyDocs, categoryFilter),
    [familyDocs, categoryFilter],
  );
  const navigate = useNavigate();

  useEffect(() => {
    setCategoryFilter('all');
  }, [memberId]);

  useEffect(() => {
    if (!availableFilters.includes(categoryFilter)) {
      setCategoryFilter('all');
    }
  }, [availableFilters, categoryFilter]);

  if (!member) return null;

  const viewingOwnVault = sessionMember?.id === memberId;

  return (
    <div className="space-y-4">
      {showRelationship && <p className="text-sm text-muted">{member.relationship}</p>}

      <div className="space-y-2">
        <p className="section-label">Documents</p>
        <DocumentCategoryFilter
          value={categoryFilter}
          onChange={setCategoryFilter}
          availableFilters={availableFilters}
        />
        {familyDocs.length === 0 && viewingOwnVault && (
          <p className="text-sm text-muted">No family documents yet.</p>
        )}
        {familyDocs.length === 0 && !viewingOwnVault && (
          <p className="text-sm text-muted">No documents shared with you.</p>
        )}
        {familyDocs.length > 0 && filteredDocs.length === 0 && (
          <p className="text-sm text-muted">No documents in this category.</p>
        )}
        {filteredDocs.map((d) => (
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
