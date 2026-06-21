import { describe, expect, it } from 'vitest';
import {
  inferDocTags,
  domainsForDocType,
  categoriesForDocType,
  coerceDomainForDocType,
  isFamilyDomainDoc,
  isHealthDomainDoc,
  isAssetsDomainDoc,
  docsForMemberByDomain,
} from './docTags';
import type { Document } from '@/types';

const base = { id: '1', title: 'T', fields: {}, createdAt: '', updatedAt: '' } as Document;

describe('docTags', () => {
  it('infers health domain', () => {
    expect(inferDocTags('lab_report', { memberId: 'm1' })).toEqual({
      domain: 'health',
      category: 'health_medical',
    });
  });

  it('infers family identity', () => {
    expect(inferDocTags('passport', { memberId: 'm1' })).toEqual({
      domain: 'family',
      category: 'identity',
    });
  });

  it('infers assets vehicle', () => {
    expect(inferDocTags('vehicle_rc', { assetId: 'a1' })).toEqual({
      domain: 'assets',
      category: 'vehicle',
    });
  });

  it('limits tab and category options by document type', () => {
    expect(domainsForDocType('passport')).toEqual(['family']);
    expect(domainsForDocType('lab_report')).toEqual(['health']);
    expect(domainsForDocType('vehicle_rc')).toEqual(['family', 'assets']);
    expect(categoriesForDocType('passport')).toEqual(['identity']);
    expect(categoriesForDocType('vehicle_rc')).toEqual(['vehicle']);
    expect(coerceDomainForDocType('passport', 'health')).toBe('family');
  });

  it('filters member docs by domain', () => {
    const docs: Document[] = [
      { ...base, docType: 'passport', memberId: 'm1', domain: 'family', category: 'identity' },
      { ...base, docType: 'lab_report', memberId: 'm1', domain: 'health', category: 'health_medical' },
    ];
    expect(docsForMemberByDomain(docs, 'm1', 'family')).toHaveLength(1);
    expect(isHealthDomainDoc(docs[1]!)).toBe(true);
    expect(isFamilyDomainDoc(docs[0]!)).toBe(true);
    expect(isAssetsDomainDoc({ ...base, docType: 'vehicle_rc', assetId: 'a', domain: 'assets', category: 'vehicle' })).toBe(true);
  });
});
