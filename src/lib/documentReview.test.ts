import { describe, expect, it } from 'vitest';
import {
  isDocumentIncomplete,
  isDocumentPendingDetails,
  isDocumentReviewed,
  isDocumentUnderReview,
  normalizeReviewStatus,
  reviewStatusSortRank,
} from '@/lib/documentReview';
import type { Document } from '@/types';

const base = {
  id: '1',
  title: 'Test',
  docType: 'passport' as const,
  fields: {},
  createdAt: '',
  updatedAt: '',
} satisfies Document;

describe('documentReview', () => {
  it('normalizes legacy verification status', () => {
    expect(normalizeReviewStatus({ ...base, verificationStatus: 'pending' })).toBe('under_review');
    expect(normalizeReviewStatus({ ...base, verificationStatus: 'verified' })).toBe('reviewed');
    expect(normalizeReviewStatus({ ...base, reviewStatus: 'processing' })).toBe('processing');
    expect(normalizeReviewStatus({ ...base, reviewStatus: 'pending_details' })).toBe('pending_details');
  });

  it('detects review states', () => {
    expect(isDocumentUnderReview({ ...base, reviewStatus: 'under_review' })).toBe(true);
    expect(isDocumentPendingDetails({ ...base, reviewStatus: 'pending_details' })).toBe(true);
    expect(isDocumentIncomplete({ ...base, reviewStatus: 'pending_details' })).toBe(true);
    expect(isDocumentUnderReview({ ...base, reviewStatus: 'pending_details' })).toBe(false);
    expect(isDocumentReviewed({ ...base, reviewStatus: 'reviewed' })).toBe(true);
    expect(isDocumentReviewed({ ...base, reviewStatus: 'rejected' })).toBe(false);
  });

  it('sorts incomplete documents before reviewed', () => {
    expect(reviewStatusSortRank({ ...base, reviewStatus: 'pending_details' })).toBeLessThan(
      reviewStatusSortRank({ ...base, reviewStatus: 'reviewed' }),
    );
    expect(reviewStatusSortRank({ ...base, reviewStatus: 'under_review' })).toBeLessThan(
      reviewStatusSortRank({ ...base, reviewStatus: 'reviewed' }),
    );
  });
});
