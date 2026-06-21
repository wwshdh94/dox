import { describe, expect, it } from 'vitest';
import {
  activeFamilyDocFilters,
  filterFamilyDocs,
  isIdDocument,
  isTravelDocument,
  matchesFamilyDocFilter,
} from '@/lib/docCategoryFilter';
import type { Document } from '@/types';

function doc(partial: Partial<Document> & Pick<Document, 'id' | 'title' | 'docType'>): Document {
  return {
    memberId: 'm1',
    fields: {},
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    ...partial,
  };
}

describe('docCategoryFilter', () => {
  it('classifies passport as travel, not ID', () => {
    const passport = doc({ id: '1', title: 'Passport', docType: 'passport', category: 'identity' });
    expect(isTravelDocument(passport)).toBe(true);
    expect(isIdDocument(passport)).toBe(false);
    expect(matchesFamilyDocFilter(passport, 'travel')).toBe(true);
    expect(matchesFamilyDocFilter(passport, 'id')).toBe(false);
  });

  it('classifies PAN and Aadhaar as ID', () => {
    const pan = doc({ id: '2', title: 'PAN', docType: 'pan', category: 'identity' });
    const aadhaar = doc({ id: '3', title: 'Aadhaar', docType: 'aadhaar', category: 'identity' });
    expect(isIdDocument(pan)).toBe(true);
    expect(isIdDocument(aadhaar)).toBe(true);
  });

  it('matches travel by title keywords', () => {
    const visa = doc({ id: '4', title: 'Schengen visa', docType: 'other', category: 'other' });
    expect(isTravelDocument(visa)).toBe(true);
    expect(matchesFamilyDocFilter(visa, 'travel')).toBe(true);
  });

  it('filters vehicle and insurance categories', () => {
    const rc = doc({ id: '5', title: 'RC', docType: 'vehicle_rc', category: 'vehicle' });
    const policy = doc({ id: '6', title: 'Life policy', docType: 'insurance', category: 'financial' });
    expect(matchesFamilyDocFilter(rc, 'vehicle')).toBe(true);
    expect(matchesFamilyDocFilter(policy, 'insurance')).toBe(true);
  });

  it('returns only filters with matching docs', () => {
    const docs = [
      doc({ id: '1', title: 'PAN', docType: 'pan', category: 'identity' }),
      doc({ id: '2', title: 'Passport', docType: 'passport', category: 'identity' }),
    ];
    expect(activeFamilyDocFilters(docs)).toEqual(['all', 'id', 'travel']);
    expect(filterFamilyDocs(docs, 'id')).toHaveLength(1);
    expect(filterFamilyDocs(docs, 'travel')).toHaveLength(1);
  });

  it('includes due soon filter when documents expire within 30 days', () => {
    const soon = new Date();
    soon.setDate(soon.getDate() + 14);
    const expiry = soon.toISOString().slice(0, 10);
    const docs = [
      doc({
        id: '1',
        title: 'Passport',
        docType: 'passport',
        category: 'identity',
        expiryDate: expiry,
      }),
      doc({ id: '2', title: 'PAN', docType: 'pan', category: 'identity' }),
    ];
    expect(activeFamilyDocFilters(docs)).toContain('due_soon');
    expect(filterFamilyDocs(docs, 'due_soon')).toHaveLength(1);
    expect(filterFamilyDocs(docs, 'due_soon')[0]?.id).toBe('1');
  });
});
