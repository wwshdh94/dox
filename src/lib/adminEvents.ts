/** Admin event log — local demo store; prod replaces with Postgres / analytics pipeline. */

export type AdminEventType =
  | 'member_doc_limit_reached'
  | 'signup'
  | 'plan_change'
  | 'backup_created'
  | 'referral_rewarded'
  | 'bundle_shared';

export interface AdminEvent {
  id: string;
  type: AdminEventType;
  at: string;
  householdUserId?: string;
  householdEmail?: string;
  memberId?: string;
  memberName?: string;
  plan?: string;
  meta?: Record<string, string | number | boolean>;
}

const EVENTS_KEY = 'prevault-admin-events';
const MAX_EVENTS = 500;

function readEvents(): AdminEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? (JSON.parse(raw) as AdminEvent[]) : [];
  } catch {
    return [];
  }
}

function writeEvents(events: AdminEvent[]): void {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
}

export function appendAdminEvent(
  event: Omit<AdminEvent, 'id' | 'at'> & { at?: string },
): void {
  const entry: AdminEvent = {
    ...event,
    id: crypto.randomUUID(),
    at: event.at ?? new Date().toISOString(),
  };
  writeEvents([entry, ...readEvents()]);
}

export function listAdminEvents(limit = 50): AdminEvent[] {
  return readEvents().slice(0, limit);
}

export function clearAdminEvents(): void {
  localStorage.removeItem(EVENTS_KEY);
}

/** Events grouped by day for trend charts (last N days). */
export function eventsByDay(days = 14): { date: string; count: number }[] {
  const events = readEvents();
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const e of events) {
    const day = e.at.slice(0, 10);
    if (buckets.has(day)) {
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}
