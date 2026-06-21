const DISMISS_KEY = 'prevault-expiring-banner-dismissed-at';
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

export function isExpiringBannerDismissed(now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return now - dismissedAt < DISMISS_MS;
  } catch {
    return false;
  }
}

export function dismissExpiringBanner(now = Date.now()): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(now));
  } catch {
    // ignore storage errors
  }
}

export function expiringBannerDismissRemainingMs(now = Date.now()): number {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return 0;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return 0;
    return Math.max(0, DISMISS_MS - (now - dismissedAt));
  } catch {
    return 0;
  }
}
