import { beforeEach, describe, expect, it } from 'vitest';
import {
  dismissExpiringBanner,
  expiringBannerDismissRemainingMs,
  isExpiringBannerDismissed,
} from '@/lib/expiringBanner';

describe('expiringBanner', () => {
  const key = 'prevault-expiring-banner-dismissed-at';

  beforeEach(() => {
    localStorage.removeItem(key);
  });

  it('is not dismissed by default', () => {
    expect(isExpiringBannerDismissed()).toBe(false);
  });

  it('stays dismissed for 3 days', () => {
    const now = Date.UTC(2026, 5, 21, 12, 0, 0);
    dismissExpiringBanner(now);
    expect(isExpiringBannerDismissed(now + 2 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(isExpiringBannerDismissed(now + 3 * 24 * 60 * 60 * 1000)).toBe(false);
  });

  it('reports remaining dismiss time', () => {
    const now = 1_000_000;
    dismissExpiringBanner(now);
    expect(expiringBannerDismissRemainingMs(now + 1_000)).toBe(3 * 24 * 60 * 60 * 1000 - 1_000);
  });
});
