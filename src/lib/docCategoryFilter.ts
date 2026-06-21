import { resolveDocTags } from '@/lib/docTags';
import { getExpiringDocuments } from '@/store/useVaultStore';
import type { Document } from '@/types';

/** Quick filters for the family Documents section. */
export type FamilyDocFilterId = 'all' | 'due_soon' | 'id' | 'travel' | 'vehicle' | 'insurance';

export const FAMILY_DOC_FILTERS: { id: FamilyDocFilterId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'due_soon', label: 'Due soon' },
  { id: 'id', label: 'ID' },
  { id: 'travel', label: 'Travel' },
  { id: 'vehicle', label: 'Vehicle' },
  { id: 'insurance', label: 'Insurance' },
];

const TRAVEL_TITLE =
  /\b(visa|e-?visa|ticket|boarding|itinerary|travel\s+pass|immigration|foreign\s+travel)\b/i;

export function isTravelDocument(doc: Document): boolean {
  if (doc.docType === 'passport') return true;
  return TRAVEL_TITLE.test(doc.title);
}

export function isIdDocument(doc: Document): boolean {
  const { category } = resolveDocTags(doc);
  if (category !== 'identity') return false;
  return doc.docType !== 'passport';
}

export function matchesFamilyDocFilter(doc: Document, filter: FamilyDocFilterId): boolean {
  if (filter === 'all' || filter === 'due_soon') return true;
  const { category } = resolveDocTags(doc);
  switch (filter) {
    case 'id':
      return isIdDocument(doc);
    case 'travel':
      return isTravelDocument(doc);
    case 'vehicle':
      return category === 'vehicle';
    case 'insurance':
      return category === 'financial' || doc.docType === 'insurance';
    default:
      return true;
  }
}

export function filterFamilyDocs(docs: Document[], filter: FamilyDocFilterId): Document[] {
  if (filter === 'all') return docs;
  if (filter === 'due_soon') {
    const expiringIds = new Set(getExpiringDocuments(docs).map((d) => d.id));
    return docs.filter((d) => expiringIds.has(d.id));
  }
  return docs.filter((d) => matchesFamilyDocFilter(d, filter));
}

/** Filters that have at least one matching document; always includes `all`. */
export function activeFamilyDocFilters(docs: Document[]): FamilyDocFilterId[] {
  const active: FamilyDocFilterId[] = ['all'];
  if (getExpiringDocuments(docs).length > 0) active.push('due_soon');
  for (const { id } of FAMILY_DOC_FILTERS) {
    if (id === 'all' || id === 'due_soon') continue;
    if (docs.some((d) => matchesFamilyDocFilter(d, id))) active.push(id);
  }
  return active;
}
