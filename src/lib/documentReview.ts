import type { Document, DocumentReviewStatus } from '@/types';

/** @deprecated Legacy field — use reviewStatus */
export type LegacyVerificationStatus = 'pending' | 'verified';

export const REVIEW_STATUS_LABELS: Record<DocumentReviewStatus, string> = {
  processing: 'Processing',
  under_review: 'Under review',
  reviewed: 'Reviewed',
  rejected: 'Rejected',
};

export function normalizeReviewStatus(
  doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>,
): DocumentReviewStatus {
  if (doc.reviewStatus) return doc.reviewStatus;
  if (doc.verificationStatus === 'pending') return 'under_review';
  if (doc.verificationStatus === 'verified') return 'reviewed';
  return 'reviewed';
}

export function isDocumentReviewed(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): boolean {
  return normalizeReviewStatus(doc) === 'reviewed';
}

export function isDocumentUnderReview(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): boolean {
  const status = normalizeReviewStatus(doc);
  return status === 'processing' || status === 'under_review';
}

export function isDocumentRejected(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): boolean {
  return normalizeReviewStatus(doc) === 'rejected';
}

export function countReviewedDocuments(documents: Document[]): number {
  return documents.filter(isDocumentReviewed).length;
}

export function countUnreviewedDocuments(documents: Document[]): number {
  return documents.filter(isDocumentUnderReview).length;
}

export function getDocumentsNeedingReview(documents: Document[]): Document[] {
  return documents.filter(isDocumentUnderReview);
}

export function reviewStatusSortRank(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): number {
  switch (normalizeReviewStatus(doc)) {
    case 'processing':
      return 0;
    case 'under_review':
      return 1;
    case 'rejected':
      return 2;
    case 'reviewed':
      return 3;
    default:
      return 3;
  }
}
