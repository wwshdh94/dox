import type { Document } from '@/types';
import { docsForMemberByDomain } from '@/lib/docTags';
import { getExpiringDocuments } from '@/store/useVaultStore';

export function memberFamilyDocStats(documents: Document[], memberId: string) {
  const docs = docsForMemberByDomain(documents, memberId, 'family');
  const expiring = getExpiringDocuments(docs);
  return { total: docs.length, expiring: expiring.length };
}

export function formatMemberDocStats(total: number, expiring: number): string {
  const docLabel = `${total} document${total === 1 ? '' : 's'}`;
  if (expiring === 0) return docLabel;
  return `${docLabel} · ${expiring} due soon`;
}
