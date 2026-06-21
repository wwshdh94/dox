import { describe, expect, it } from 'vitest';
import { resolveMemberPortraitKind } from '@/lib/memberPortrait';

describe('memberPortrait', () => {
  it('maps gender and age band to portrait icons', () => {
    expect(resolveMemberPortraitKind('male', 'child')).toBe('boy');
    expect(resolveMemberPortraitKind('female', 'child')).toBe('girl');
    expect(resolveMemberPortraitKind('male', 'adult')).toBe('man');
    expect(resolveMemberPortraitKind('female', 'adult')).toBe('woman');
    expect(resolveMemberPortraitKind('male', 'senior')).toBe('old_man');
    expect(resolveMemberPortraitKind('female', 'senior')).toBe('old_woman');
  });

  it('defaults to adult when age is unknown', () => {
    expect(resolveMemberPortraitKind('male', undefined)).toBe('man');
    expect(resolveMemberPortraitKind('female', undefined)).toBe('woman');
  });

  it('returns undefined without gender', () => {
    expect(resolveMemberPortraitKind(undefined, 'adult')).toBeUndefined();
  });
});
