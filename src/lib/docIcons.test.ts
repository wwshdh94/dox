import { describe, expect, it } from 'vitest';
import { docIconFillScale, docIconSlug, docIconSrc, titleKeywordIconSlug } from '@/lib/docIcons';

describe('docIcons', () => {
  it('maps doc types to icon slugs', () => {
    expect(docIconSlug('passport')).toBe('passport');
    expect(docIconSlug('vehicle_rc')).toBe('vehicle_rc');
    expect(docIconSlug('health_insurance')).toBe('health_insurance');
  });

  it('falls back to category icons for unknown mappings via other type', () => {
    expect(docIconSlug('other')).toBe('other');
    expect(docIconSlug('other', 'legal')).toBe('other');
  });

  it('builds public icon paths', () => {
    expect(docIconSrc('pan')).toBe('/icons/docs/pan.png');
    expect(docIconSrc('other', 'legal')).toBe('/icons/docs/other.png');
  });

  it('picks title keywords for non-standard documents', () => {
    expect(titleKeywordIconSlug('Electricity Bill — March')).toBe('bill');
    expect(titleKeywordIconSlug('Visiting Card')).toBe('card');
    expect(titleKeywordIconSlug('Rent Agreement')).toBe('contract');
    expect(titleKeywordIconSlug('Offer Letter')).toBe('letter');
    expect(titleKeywordIconSlug('GST Invoice')).toBe('invoice');
  });

  it('uses title keyword icons when doc type is other', () => {
    expect(docIconSlug('other', 'other', 'Phone Bill')).toBe('bill');
    expect(docIconSlug('other', 'financial', 'Business Card')).toBe('card');
    expect(docIconSrc('other', 'other', 'Birth Certificate')).toBe('/icons/docs/certificate.png');
  });

  it('keeps mapped doc type icons even when title has keywords', () => {
    expect(docIconSlug('passport', 'identity', 'Passport Copy')).toBe('passport');
    expect(docIconSlug('medical_bill', 'health_medical', 'Hospital Bill')).toBe('medical_bill');
  });

  it('scales small-looking pill icons without changing slug', () => {
    expect(docIconFillScale('passport')).toBe(1.3);
    expect(docIconFillScale('other', 'other', 'Phone Bill')).toBe(1.3);
    expect(docIconFillScale('pan')).toBe(1);
  });
});
