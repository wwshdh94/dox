import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DocumentCategoryFilter } from '@/components/DocumentCategoryFilter';
import { DocumentPill } from '@/features/family/DocumentPill';
import {
  activeFamilyDocFilters,
  filterFamilyDocs,
  type FamilyDocFilterId,
} from '@/lib/docCategoryFilter';
import { docsForMemberByDomain } from '@/lib/docTags';
import { useVaultStore } from '@/store/useVaultStore';

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
        {familyDocs.length === 0 && <p className="text-sm text-muted">No family documents yet.</p>}
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
