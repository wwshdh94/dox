import type { Document, User } from '@/types';
import { isProUser } from '@/lib/planLimits';

/** Max pending (unverified) documents before new uploads are blocked — all plans. */
export const MAX_UNVERIFIED_DOCS_FREE = 5;
export const MAX_UNVERIFIED_DOCS_PRO = 10;

export function maxUnverifiedDocuments(user: User | null): number {
  return isProUser(user) ? MAX_UNVERIFIED_DOCS_PRO : MAX_UNVERIFIED_DOCS_FREE;
}

export function isDocumentVerified(doc: Document): boolean {
  return doc.verificationStatus !== 'pending';
}

export function countVerifiedDocuments(documents: Document[]): number {
  return documents.filter(isDocumentVerified).length;
}

export function countUnverifiedDocuments(documents: Document[]): number {
  return documents.filter((d) => d.verificationStatus === 'pending').length;
}

export function getUnverifiedDocuments(documents: Document[]): Document[] {
  return documents.filter((d) => d.verificationStatus === 'pending');
}

/** Whether user can start another upload / extraction (pending queue not full). */
export function canStageDocument(user: User | null, documents: Document[]): boolean {
  return countUnverifiedDocuments(documents) < maxUnverifiedDocuments(user);
}

export function remainingVerificationSlots(user: User | null, documents: Document[]): number {
  return Math.max(0, maxUnverifiedDocuments(user) - countUnverifiedDocuments(documents));
}
