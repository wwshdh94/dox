import { describe, expect, it } from 'vitest';
import { canBrowseWithoutAuth, shouldShowWelcome } from '@/lib/guestExplore';

describe('guestExplore', () => {
  it('shows welcome for first-time visitors', () => {
    expect(shouldShowWelcome({ welcomeSeen: false, guestExplore: false })).toBe(true);
    expect(shouldShowWelcome({ welcomeSeen: true, guestExplore: false })).toBe(false);
  });

  it('allows browse with guest explore', () => {
    expect(canBrowseWithoutAuth(null, { guestExplore: true })).toBe(true);
    expect(canBrowseWithoutAuth(null, { guestExplore: false })).toBe(false);
  });
});
