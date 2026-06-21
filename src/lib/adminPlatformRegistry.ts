import type { Asset, Document, FamilyMember, TempShareLink, User } from '@/types';
import { membersAtDocumentCap } from '@/lib/documentLimits';
import { countUnverifiedDocuments, countVerifiedDocuments } from '@/lib/verificationQueue';

const REGISTRY_KEY = 'prevault-admin-platform-households';

export interface PlatformHousehold {
  userId: string;
  email: string;
  name: string;
  plan: User['plan'];
  memberCount: number;
  documentCount: number;
  verifiedDocuments: number;
  pendingDocuments: number;
  assetCount: number;
  bundleCount: number;
  activeTempLinks: number;
  membersAtCap: number;
  referralCode?: string;
  referredBy?: string;
  referralQualified: boolean;
  createdAt: string;
  updatedAt: string;
}

function readRegistry(): PlatformHousehold[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as PlatformHousehold[]) : [];
  } catch {
    return [];
  }
}

function writeRegistry(rows: PlatformHousehold[]): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(rows));
}

export function listPlatformHouseholds(): PlatformHousehold[] {
  return readRegistry().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function updateHouseholdPlan(userId: string, plan: User['plan']): void {
  const rows = readRegistry();
  const idx = rows.findIndex((r) => r.userId === userId);
  if (idx < 0) return;
  rows[idx] = { ...rows[idx], plan, updatedAt: new Date().toISOString() };
  writeRegistry(rows);
}

export function upsertPlatformHousehold(row: PlatformHousehold): void {
  const rows = readRegistry();
  const idx = rows.findIndex((r) => r.userId === row.userId);
  if (idx >= 0) {
    rows[idx] = { ...rows[idx], ...row, createdAt: rows[idx].createdAt };
  } else {
    rows.unshift(row);
  }
  writeRegistry(rows);
}

export function clearPlatformHouseholds(): void {
  localStorage.removeItem(REGISTRY_KEY);
}

/** Sync current browser vault into the platform registry (demo stand-in for server metrics). */
export function syncPlatformHouseholdFromVault(input: {
  user: User | null;
  members: FamilyMember[];
  documents: Document[];
  assets: Asset[];
  bundles: unknown[];
  tempLinks: TempShareLink[];
}): void {
  const { user, members, documents, assets, bundles, tempLinks } = input;
  if (!user) return;

  const activeMembers = members.filter((m) => m.status !== 'disabled');
  const atCap = membersAtDocumentCap(documents, assets, members);
  const now = new Date().toISOString();
  const existing = readRegistry().find((r) => r.userId === user.id);

  upsertPlatformHousehold({
    userId: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    memberCount: activeMembers.length,
    documentCount: documents.length,
    verifiedDocuments: countVerifiedDocuments(documents),
    pendingDocuments: countUnverifiedDocuments(documents),
    assetCount: assets.length,
    bundleCount: bundles.length,
    activeTempLinks: tempLinks.filter((l) => l.status === 'active').length,
    membersAtCap: atCap.length,
    referralCode: user.referralCode,
    referredBy: user.referredBy,
    referralQualified: user.referralQualified ?? false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

export function signupsByDay(days = 14): { date: string; count: number }[] {
  const rows = readRegistry();
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    if (buckets.has(day)) {
      buckets.set(day, (buckets.get(day) ?? 0) + 1);
    }
  }
  return [...buckets.entries()].map(([date, count]) => ({ date, count }));
}

export function seedDemoPlatformHouseholds(): void {
  const now = Date.now();
  const demos: PlatformHousehold[] = [
    {
      userId: 'demo-h1',
      email: 'rahul@gmail.com',
      name: 'Rahul Sharma',
      plan: 'free',
      memberCount: 3,
      documentCount: 18,
      verifiedDocuments: 16,
      pendingDocuments: 2,
      assetCount: 2,
      bundleCount: 1,
      activeTempLinks: 1,
      membersAtCap: 0,
      referralCode: 'RAHUL01',
      referralQualified: true,
      createdAt: new Date(now - 12 * 86400000).toISOString(),
      updatedAt: new Date(now - 1 * 86400000).toISOString(),
    },
    {
      userId: 'demo-h2',
      email: 'priya@gmail.com',
      name: 'Priya Sharma',
      plan: 'pro',
      memberCount: 4,
      documentCount: 42,
      verifiedDocuments: 40,
      pendingDocuments: 2,
      assetCount: 5,
      bundleCount: 3,
      activeTempLinks: 2,
      membersAtCap: 0,
      referralCode: 'PRIYA02',
      referredBy: 'RAHUL01',
      referralQualified: true,
      createdAt: new Date(now - 8 * 86400000).toISOString(),
      updatedAt: new Date(now - 2 * 3600000).toISOString(),
    },
    {
      userId: 'demo-h3',
      email: 'amit@gmail.com',
      name: 'Amit Patel',
      plan: 'free',
      memberCount: 2,
      documentCount: 50,
      verifiedDocuments: 48,
      pendingDocuments: 2,
      assetCount: 1,
      bundleCount: 0,
      activeTempLinks: 0,
      membersAtCap: 1,
      referralCode: 'AMIT03',
      referralQualified: false,
      createdAt: new Date(now - 5 * 86400000).toISOString(),
      updatedAt: new Date(now - 30 * 60000).toISOString(),
    },
  ];
  for (const row of demos) {
    upsertPlatformHousehold(row);
  }
}

export function countPlans(rows: PlatformHousehold[]): { free: number; pro: number; family: number } {
  let free = 0;
  let pro = 0;
  let family = 0;
  for (const row of rows) {
    if (row.plan === 'family') family += 1;
    else if (row.plan === 'pro') pro += 1;
    else free += 1;
  }
  return { free, pro, family };
}
