import { beforeEach, describe, expect, it } from 'vitest';
import {
  EXPIRY_SNOOZE_MS,
  isInboxNotificationSnoozed,
  REVIEW_SNOOZE_MS,
  snoozeInboxNotification,
  snoozeRemainingMs,
} from '@/lib/inboxSnooze';

describe('inboxSnooze', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('snoozes until duration elapses', () => {
    const now = 1_700_000_000_000;
    snoozeInboxNotification('review-d1', REVIEW_SNOOZE_MS, now);
    expect(isInboxNotificationSnoozed('review-d1', now + 1000)).toBe(true);
    expect(isInboxNotificationSnoozed('review-d1', now + REVIEW_SNOOZE_MS)).toBe(false);
  });

  it('tracks remaining snooze time', () => {
    const now = 1_700_000_000_000;
    snoozeInboxNotification('expiring-d2', EXPIRY_SNOOZE_MS, now);
    expect(snoozeRemainingMs('expiring-d2', now + 1000)).toBe(EXPIRY_SNOOZE_MS - 1000);
  });
});
