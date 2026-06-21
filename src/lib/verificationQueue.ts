import type { Document, User } from '@/types';
import {
  countReviewedDocuments,
  countUnreviewedDocuments,
  getDocumentsNeedingReview,
  isDocumentReviewed,
} from '@/lib/documentReview';
import { isProUser } from '@/lib/planLimits';

/** Max unreviewed documents before new uploads are blocked — all plans. */
export const MAX_UNVERIFIED_DOCS_FREE = 5;
export const MAX_UNVERIFIED_DOCS_PRO = 10;

export function maxUnverifiedDocuments(user: User | null): number {
  return isProUser(user) ? MAX_UNVERIFIED_DOCS_PRO : MAX_UNVERIFIED_DOCS_FREE;
}

export function isDocumentVerified(doc: Document): boolean {
  return isDocumentReviewed(doc);
}

export function countVerifiedDocuments(documents: Document[]): number {
  return countReviewedDocuments(documents);
}

export function countUnverifiedDocuments(documents: Document[]): number {
  return countUnreviewedDocuments(documents);
}

export function getUnverifiedDocuments(documents: Document[]): Document[] {
  return getDocumentsNeedingReview(documents);
}

/** Whether user can start another upload (review queue not full). */
export function canStageDocument(user: User | null, documents: Document[]): boolean {
  return countUnreviewedDocuments(documents) < maxUnverifiedDocuments(user);
}

export function remainingVerificationSlots(user: User | null, documents: Document[]): number {
  return Math.max(0, maxUnverifiedDocuments(user) - countUnreviewedDocuments(documents));
}
