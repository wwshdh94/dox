/**
 * Ops & Finance analytics — demo estimates from platform registry + event log.
 * Production replaces with billing (Razorpay/Stripe) + warehouse metrics.
 */

import { listAdminEvents, type AdminEventType } from '@/lib/adminEvents';
import { listPlatformHouseholds, signupsByDay } from '@/lib/adminPlatformRegistry';
import { readReferralLedger } from '@/lib/referrals';
import { __adminReadBlocks, __adminReadDiscounts } from '@/lib/userModeration';

/** Annual list prices (INR) — align with Plan page demo pricing. */
export const PRO_ANNUAL_INR = 499;
export const FAMILY_ANNUAL_INR = 799;

const MS_DAY = 86_400_000;

function annualToMrr(annualInr: number): number {
  return Math.round((annualInr / 12) * 100) / 100;
}

function householdsActiveWithin(days: number): number {
  const cutoff = Date.now() - days * MS_DAY;
  return listPlatformHouseholds().filter((h) => new Date(h.updatedAt).getTime() >= cutoff).length;
}

function eventsSince(days: number): ReturnType<typeof listAdminEvents> {
  const cutoff = Date.now() - days * MS_DAY;
  return listAdminEvents(500).filter((e) => new Date(e.at).getTime() >= cutoff);
}

function countEventType(events: ReturnType<typeof listAdminEvents>, type: AdminEventType): number {
  return events.filter((e) => e.type === type).length;
}

export interface OpsFinanceSnapshot {
  generatedAt: string;
  finance: {
    mrrInr: number;
    arrInr: number;
    paidHouseholds: number;
    freeHouseholds: number;
    conversionRatePct: number;
    arpuInr: number;
    grossMrrInr: number;
    discountLeakageInr: number;
    activeDiscounts: number;
    referralBonusDocs: number;
  };
  operations: {
    households: number;
    active7d: number;
    active30d: number;
    active7dPct: number;
    openFeedback: number;
    blockedUsers: number;
    verificationBacklogPct: number;
    limitAlerts: number;
    supportTickets7d: number;
    signups7d: number;
    upgrades7d: number;
    downgrades7d: number;
    docsPerHousehold: number;
    membersPerHousehold: number;
  };
  planMix: { free: number; pro: number; family: number };
  signupTrend: { date: string; count: number }[];
  paidMixTrend: { date: string; pro: number; family: number }[];
  eventMix: { type: AdminEventType; count: number; label: string }[];
}

const EVENT_LABELS: Partial<Record<AdminEventType, string>> = {
  signup: 'Signups',
  plan_change: 'Plan changes',
  member_doc_limit_reached: 'Doc cap alerts',
  feedback_received: 'Feedback received',
  feedback_replied: 'Feedback replied',
  user_blocked: 'Users blocked',
  discount_granted: 'Discounts granted',
  backup_created: 'Backups',
  referral_rewarded: 'Referrals rewarded',
  bundle_shared: 'Bundles shared',
};

export function buildOpsFinanceSnapshot(): OpsFinanceSnapshot {
  const households = listPlatformHouseholds();
  const total = households.length || 1;
  const now = new Date().toISOString();

  let free = 0;
  let pro = 0;
  let family = 0;
  let grossMrr = 0;
  let discountLeakage = 0;

  const discounts = __adminReadDiscounts();
  const nowMs = Date.now();
  const activeDiscounts = discounts.filter(
    (d) => !d.expiresAt || new Date(d.expiresAt).getTime() > nowMs,
  );
  const discountByUser = new Map(
    activeDiscounts.map((d) => [d.userId, d] as const),
  );

  for (const h of households) {
    if (h.plan === 'family') {
      family += 1;
      const base = annualToMrr(FAMILY_ANNUAL_INR);
      grossMrr += base;
      const disc = discountByUser.get(h.userId);
      if (disc) {
        discountLeakage += base * (disc.percentOff / 100);
      }
    } else if (h.plan === 'pro') {
      pro += 1;
      const base = annualToMrr(PRO_ANNUAL_INR);
      grossMrr += base;
      const disc = discountByUser.get(h.userId);
      if (disc) {
        discountLeakage += base * (disc.percentOff / 100);
      }
    } else {
      free += 1;
    }
  }

  const paidHouseholds = pro + family;
  const mrrInr = Math.round((grossMrr - discountLeakage) * 100) / 100;
  const arrInr = Math.round(mrrInr * 12);
  const conversionRatePct = total > 0 ? Math.round((paidHouseholds / total) * 1000) / 10 : 0;
  const arpuInr = total > 0 ? Math.round((mrrInr / total) * 100) / 100 : 0;

  let referralBonusDocs = 0;
  for (const entry of Object.values(readReferralLedger())) {
    referralBonusDocs += entry.bonusDocsEarned;
  }

  let totalDocs = 0;
  let pendingDocs = 0;
  let totalMembers = 0;
  for (const h of households) {
    totalDocs += h.documentCount;
    pendingDocs += h.pendingDocuments;
    totalMembers += h.memberCount;
  }

  const verificationBacklogPct =
    totalDocs > 0 ? Math.round((pendingDocs / totalDocs) * 1000) / 10 : 0;

  const events7d = eventsSince(7);
  const limitAlerts = listAdminEvents(500).filter((e) => e.type === 'member_doc_limit_reached').length;

  let openFeedback = 0;
  try {
    const raw = localStorage.getItem('prevault-user-feedback');
    const feedback = raw ? (JSON.parse(raw) as { status: string }[]) : [];
    openFeedback = feedback.filter((f) => f.status === 'open' || f.status === 'in_progress').length;
  } catch {
    openFeedback = 0;
  }

  const upgrades7d = events7d.filter(
    (e) =>
      e.type === 'plan_change' &&
      (e.plan === 'pro' || e.plan === 'family') &&
      e.meta?.previousPlan === 'free',
  ).length;
  const downgrades7d = events7d.filter(
    (e) => e.type === 'plan_change' && e.plan === 'free',
  ).length;

  const supportTickets7d =
    countEventType(events7d, 'feedback_received') + countEventType(events7d, 'admin_email');

  const active7d = householdsActiveWithin(7);
  const active30d = householdsActiveWithin(30);

  const eventCounts = new Map<AdminEventType, number>();
  for (const e of listAdminEvents(500)) {
    eventCounts.set(e.type, (eventCounts.get(e.type) ?? 0) + 1);
  }
  const eventMix = [...eventCounts.entries()]
    .map(([type, count]) => ({
      type,
      count,
      label: EVENT_LABELS[type] ?? type.replace(/_/g, ' '),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const signupTrend = signupsByDay(14);
  const paidMixTrend = buildPaidMixTrend(households, 14);

  return {
    generatedAt: now,
    finance: {
      mrrInr,
      arrInr,
      paidHouseholds,
      freeHouseholds: free,
      conversionRatePct,
      arpuInr,
      grossMrrInr: Math.round(grossMrr * 100) / 100,
      discountLeakageInr: Math.round(discountLeakage * 100) / 100,
      activeDiscounts: activeDiscounts.length,
      referralBonusDocs,
    },
    operations: {
      households: total,
      active7d,
      active30d,
      active7dPct: total > 0 ? Math.round((active7d / total) * 1000) / 10 : 0,
      openFeedback,
      blockedUsers: __adminReadBlocks().length,
      verificationBacklogPct,
      limitAlerts,
      supportTickets7d,
      signups7d: countEventType(events7d, 'signup'),
      upgrades7d,
      downgrades7d,
      docsPerHousehold: Math.round((totalDocs / total) * 10) / 10,
      membersPerHousehold: Math.round((totalMembers / total) * 10) / 10,
    },
    planMix: { free, pro, family },
    signupTrend,
    paidMixTrend,
    eventMix,
  };
}

/** Cumulative paid households by signup day (demo proxy for revenue mix growth). */
function buildPaidMixTrend(
  households: ReturnType<typeof listPlatformHouseholds>,
  days: number,
): { date: string; pro: number; family: number }[] {
  const buckets = new Map<string, { pro: number; family: number }>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), { pro: 0, family: 0 });
  }

  for (const h of households) {
    const day = h.createdAt.slice(0, 10);
    if (!buckets.has(day)) continue;
    if (h.plan === 'pro') buckets.get(day)!.pro += 1;
    if (h.plan === 'family') buckets.get(day)!.family += 1;
  }

  let runPro = 0;
  let runFamily = 0;
  return [...buckets.entries()].map(([date, counts]) => {
    runPro += counts.pro;
    runFamily += counts.family;
    return { date, pro: runPro, family: runFamily };
  });
}

export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
