const SNOOZE_KEY = 'prevault-inbox-snoozed';

export const REVIEW_SNOOZE_MS = 24 * 60 * 60 * 1000;
export const EXPIRY_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;

type SnoozeStore = Record<string, number>;

function readSnoozes(): SnoozeStore {
  try {
    const raw = localStorage.getItem(SNOOZE_KEY);
    return raw ? (JSON.parse(raw) as SnoozeStore) : {};
  } catch {
    return {};
  }
}

function writeSnoozes(store: SnoozeStore): void {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage errors
  }
}

function pruneExpired(store: SnoozeStore, now: number): SnoozeStore {
  const next: SnoozeStore = {};
  for (const [id, until] of Object.entries(store)) {
    if (until > now) next[id] = until;
  }
  return next;
}

export function snoozeInboxNotification(id: string, durationMs: number, now = Date.now()): void {
  const store = pruneExpired(readSnoozes(), now);
  store[id] = now + durationMs;
  writeSnoozes(store);
}

export function isInboxNotificationSnoozed(id: string, now = Date.now()): boolean {
  const until = readSnoozes()[id];
  return typeof until === 'number' && until > now;
}

export function snoozeRemainingMs(id: string, now = Date.now()): number {
  const until = readSnoozes()[id];
  if (typeof until !== 'number') return 0;
  return Math.max(0, until - now);
}
