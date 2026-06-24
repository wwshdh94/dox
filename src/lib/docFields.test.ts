import { describe, expect, it } from 'vitest';
import { primaryFieldKeys, secondaryFieldKeys } from '@/lib/docFields';

describe('primaryFieldKeys', () => {
  it('prioritizes id and name fields for PAN', () => {
    expect(primaryFieldKeys('pan')).toEqual(['panNumber', 'fullName']);
  });

  it('keeps secondary keys out of primary set', () => {
    const primary = new Set(primaryFieldKeys('passport'));
    for (const key of secondaryFieldKeys('passport')) {
      expect(primary.has(key)).toBe(false);
    }
  });
});
