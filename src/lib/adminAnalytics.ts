import { eventsByDay, listAdminEvents } from '@/lib/adminEvents';
import {
  countPlans,
  listPlatformHouseholds,
  signupsByDay,
  type PlatformHousehold,
} from '@/lib/adminPlatformRegistry';
import { readReferralLedger } from '@/lib/referrals';

export interface PlatformAdminSnapshot {
  generatedAt: string;
  totals: {
    households: number;
    freePlans: number;
    proPlans: number;
    familyPlans: number;
    totalDocuments: number;
    verifiedDocuments: number;
    pendingDocuments: number;
    totalMembers: number;
    totalAssets: number;
    totalBundles: number;
    activeTempLinks: number;
    householdsAtCap: number;
    limitEvents: number;
  };
  plans: {
    free: number;
    pro: number;
    family: number;
  };
  referralStats: {
    totalReferralCodes: number;
    totalSuccessfulReferrals: number;
    totalBonusDocsGranted: number;
  };
  signupTrend: { date: string; count: number }[];
  activityTrend: { date: string; count: number }[];
  households: PlatformHousehold[];
  recentEvents: ReturnType<typeof listAdminEvents>;
}

export function buildPlatformAdminSnapshot(): PlatformAdminSnapshot {
  const households = listPlatformHouseholds();
  const adminEvents = listAdminEvents(100);
  const limitEvents = adminEvents.filter((e) => e.type === 'member_doc_limit_reached').length;
  const plans = countPlans(households);
  const referralLedger = readReferralLedger();

  let totalSuccessfulReferrals = 0;
  let totalBonusDocsGranted = 0;
  for (const entry of Object.values(referralLedger)) {
    totalSuccessfulReferrals += entry.successfulReferrals;
    totalBonusDocsGranted += entry.bonusDocsEarned;
  }

  const totals = households.reduce(
    (acc, h) => ({
      totalDocuments: acc.totalDocuments + h.documentCount,
      verifiedDocuments: acc.verifiedDocuments + h.verifiedDocuments,
      pendingDocuments: acc.pendingDocuments + h.pendingDocuments,
      totalMembers: acc.totalMembers + h.memberCount,
      totalAssets: acc.totalAssets + h.assetCount,
      totalBundles: acc.totalBundles + h.bundleCount,
      activeTempLinks: acc.activeTempLinks + h.activeTempLinks,
      householdsAtCap: acc.householdsAtCap + (h.membersAtCap > 0 ? 1 : 0),
    }),
    {
      totalDocuments: 0,
      verifiedDocuments: 0,
      pendingDocuments: 0,
      totalMembers: 0,
      totalAssets: 0,
      totalBundles: 0,
      activeTempLinks: 0,
      householdsAtCap: 0,
    },
  );

  return {
    generatedAt: new Date().toISOString(),
    totals: {
      households: households.length,
      freePlans: plans.free,
      proPlans: plans.pro,
      familyPlans: plans.family,
      ...totals,
      limitEvents,
    },
    plans,
    referralStats: {
      totalReferralCodes: Object.keys(referralLedger).length,
      totalSuccessfulReferrals,
      totalBonusDocsGranted,
    },
    signupTrend: signupsByDay(14),
    activityTrend: eventsByDay(14),
    households,
    recentEvents: adminEvents.slice(0, 25),
  };
}
