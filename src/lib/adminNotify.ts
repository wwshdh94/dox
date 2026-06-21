import type { FamilyMember, User } from '@/types';
import { appendAdminEvent } from '@/lib/adminEvents';
import { PRODUCTION_MAX_DOCS_PER_MEMBER } from '@/lib/documentLimits';

const DEDUPE_KEY = 'prevault-admin-limit-alerts';

interface LimitAlertRecord {
  at: string;
  count: number;
}

type LimitAlertLedger = Record<string, LimitAlertRecord>;

export interface MemberLimitReachedPayload {
  user: User | null;
  member: FamilyMember;
  documentCount: number;
}

function readLedger(): LimitAlertLedger {
  try {
    const raw = localStorage.getItem(DEDUPE_KEY);
    return raw ? (JSON.parse(raw) as LimitAlertLedger) : {};
  } catch {
    return {};
  }
}

function writeLedger(ledger: LimitAlertLedger): void {
  localStorage.setItem(DEDUPE_KEY, JSON.stringify(ledger));
}

/** Fire once per member when they hit the production doc cap. */
export async function notifyMemberDocLimitReached(
  payload: MemberLimitReachedPayload,
): Promise<void> {
  const { member, documentCount, user } = payload;
  if (documentCount < PRODUCTION_MAX_DOCS_PER_MEMBER) return;

  const ledger = readLedger();
  const prev = ledger[member.id];
  if (prev && prev.count >= PRODUCTION_MAX_DOCS_PER_MEMBER) return;

  const body = {
    event: 'member_doc_limit_reached',
    at: new Date().toISOString(),
    householdUserId: user?.id,
    householdEmail: user?.email,
    memberId: member.id,
    memberName: member.displayName,
    documentCount,
    cap: PRODUCTION_MAX_DOCS_PER_MEMBER,
  };

  const webhook = import.meta.env.VITE_ADMIN_NOTIFY_WEBHOOK as string | undefined;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    } catch {
      // Never block user flows on notify failure
    }
  }

  if (import.meta.env.DEV) {
    console.info('[PreVault admin] member_doc_limit_reached', body);
  }

  ledger[member.id] = { at: body.at, count: documentCount };
  writeLedger(ledger);

  appendAdminEvent({
    type: 'member_doc_limit_reached',
    at: body.at,
    householdUserId: user?.id,
    householdEmail: user?.email,
    memberId: member.id,
    memberName: member.displayName,
    meta: { documentCount, cap: PRODUCTION_MAX_DOCS_PER_MEMBER },
  });
}

/** Scan vault after restore — alert for any member already at cap. */
export async function notifyMembersAtCap(
  user: User | null,
  members: FamilyMember[],
  atCap: { memberId: string; count: number }[],
): Promise<void> {
  for (const { memberId, count } of atCap) {
    const member = members.find((m) => m.id === memberId);
    if (member) {
      await notifyMemberDocLimitReached({ user, member, documentCount: count });
    }
  }
}
