import { describe, expect, it } from 'vitest';
import { documentBackPath, uploadBackPath } from './navigation';
import type { Document } from '@/types';

describe('navigation', () => {
  it('resolves document back paths', () => {
    expect(
      documentBackPath({
        docType: 'health_insurance',
        memberId: 'm1',
        domain: 'health',
        category: 'health_medical',
      } as Document),
    ).toBe('/health/m1');
    expect(
      documentBackPath({
        docType: 'passport',
        memberId: 'm1',
        domain: 'family',
        category: 'identity',
      } as Document),
    ).toBe('/family/m1');
    expect(
      documentBackPath({
        docType: 'vehicle_rc',
        assetId: 'a1',
      } as Document),
    ).toBe('/assets/a1');
  });

  it('resolves upload back paths', () => {
    expect(uploadBackPath(new URLSearchParams('context=health&member=m1'))).toBe('/health/m1');
    expect(uploadBackPath(new URLSearchParams('member=m1'))).toBe('/family/m1');
    expect(uploadBackPath(new URLSearchParams('type=purchase'))).toBe('/assets');
  });
});
