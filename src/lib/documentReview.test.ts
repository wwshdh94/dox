import { describe, expect, it } from 'vitest';
import {
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
  });

  it('detects review states', () => {
    expect(isDocumentUnderReview({ ...base, reviewStatus: 'under_review' })).toBe(true);
    expect(isDocumentReviewed({ ...base, reviewStatus: 'reviewed' })).toBe(true);
    expect(isDocumentReviewed({ ...base, reviewStatus: 'rejected' })).toBe(false);
  });

  it('sorts under-review documents first', () => {
    expect(reviewStatusSortRank({ ...base, reviewStatus: 'under_review' })).toBeLessThan(
      reviewStatusSortRank({ ...base, reviewStatus: 'reviewed' }),
    );
  });
});
