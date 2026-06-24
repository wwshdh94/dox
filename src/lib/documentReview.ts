import type { Document, DocumentReviewStatus } from '@/types';

/** @deprecated Legacy field — use reviewStatus */
export type LegacyVerificationStatus = 'pending' | 'verified';

export const REVIEW_STATUS_LABELS: Record<DocumentReviewStatus, string> = {
  processing: 'Processing',
  under_review: 'Under review',
  pending_details: 'Add details',
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

/** OCR path — extracted fields awaiting verification. */
export function isDocumentUnderReview(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): boolean {
  const status = normalizeReviewStatus(doc);
  return status === 'processing' || status === 'under_review';
}

/** Manual entry path — file saved, fields not filled in yet. */
export function isDocumentPendingDetails(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): boolean {
  return normalizeReviewStatus(doc) === 'pending_details';
}

/** Any non-final document state (blocks upload queue, shows alerts). */
export function isDocumentIncomplete(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): boolean {
  const status = normalizeReviewStatus(doc);
  return status === 'processing' || status === 'under_review' || status === 'pending_details';
}

export function isDocumentRejected(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): boolean {
  return normalizeReviewStatus(doc) === 'rejected';
}

export function countReviewedDocuments(documents: Document[]): number {
  return documents.filter(isDocumentReviewed).length;
}

export function countUnreviewedDocuments(documents: Document[]): number {
  return documents.filter(isDocumentIncomplete).length;
}

export function getDocumentsNeedingReview(documents: Document[]): Document[] {
  return documents.filter(isDocumentIncomplete);
}

export function reviewStatusSortRank(doc: Pick<Document, 'reviewStatus' | 'verificationStatus'>): number {
  switch (normalizeReviewStatus(doc)) {
    case 'processing':
      return 0;
    case 'pending_details':
      return 1;
    case 'under_review':
      return 2;
    case 'rejected':
      return 3;
    case 'reviewed':
      return 4;
    default:
      return 4;
  }
}

export function reviewStatusActionHint(status: DocumentReviewStatus): string {
  switch (status) {
    case 'pending_details':
      return 'Enter document fields to finish adding it to your vault.';
    case 'under_review':
    case 'processing':
      return 'Open the document and mark it reviewed after checking extracted details.';
    default:
      return '';
  }
}
