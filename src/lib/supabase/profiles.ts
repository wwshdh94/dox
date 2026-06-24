import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { User } from '@/types';
import { reserveLaunchCohortSlot } from '@/lib/launchCohort';
import { consumePendingReferral, generateReferralCode } from '@/lib/referrals';
import { getSupabase } from '@/lib/supabase/client';
import { ensureHouseholdForUser } from '@/lib/supabase/households';
import { syncHouseholdVaultFromServer } from '@/lib/supabase/vaultSync';
import { defaultDevUserPlan, withDevUserPlan } from '@/lib/devDefaults';

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'family';
  referral_code: string;
  referred_by: string | null;
  launch_cohort: boolean;
  launch_cohort_number: number | null;
  lifetime_pro: boolean;
  referral_uploads: number;
  referral_qualified: boolean;
}

function mapProfileToUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.display_name ?? row.email.split('@')[0] ?? 'User',
    avatarUrl: row.avatar_url ?? undefined,
    plan: row.plan,
    referralCode: row.referral_code,
    referredBy: row.referred_by ?? undefined,
    referralUploads: row.referral_uploads,
    referralQualified: row.referral_qualified,
    launchCohort: row.launch_cohort,
    launchCohortNumber: row.launch_cohort_number ?? undefined,
    lifetimePro: row.lifetime_pro,
  };
}

function userFromAuthOnly(authUser: SupabaseUser, referredBy?: string): User {
  const meta = authUser.user_metadata as Record<string, unknown>;
  const cohort = reserveLaunchCohortSlot();
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    name:
      (typeof meta.full_name === 'string' && meta.full_name) ||
      (typeof meta.name === 'string' && meta.name) ||
      authUser.email?.split('@')[0] ||
      'User',
    avatarUrl: typeof meta.avatar_url === 'string' ? meta.avatar_url : undefined,
    plan: defaultDevUserPlan(),
    referralCode: generateReferralCode(),
    referredBy,
    referralUploads: 0,
    referralQualified: false,
    launchCohort: cohort.eligible,
    launchCohortNumber: cohort.cohortNumber ?? undefined,
  };
}

/** Immediate user from OAuth metadata — no network. Used while profile loads. */
export function userFromAuthSession(authUser: SupabaseUser): User {
  return withDevUserPlan(userFromAuthOnly(authUser, consumePendingReferral()));
}

/** Load or create profile row for authenticated user. */
export async function ensureProfileForAuthUser(authUser: SupabaseUser): Promise<User> {
  const supabase = getSupabase();
  if (!supabase) return userFromAuthOnly(authUser);

  const { data: existing, error: readError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (readError) {
    console.warn('[prevault] profiles read failed — using auth metadata', readError.message);
    return userFromAuthOnly(authUser, consumePendingReferral());
  }

  if (existing) {
    void ensureHouseholdForUser(authUser.id);
    void syncHouseholdVaultFromServer();
    return withDevUserPlan(mapProfileToUser(existing as ProfileRow));
  }

  const referredBy = consumePendingReferral();
  const draft = userFromAuthOnly(authUser, referredBy);

  const insertRow = {
    id: draft.id,
    email: draft.email,
    display_name: draft.name,
    avatar_url: draft.avatarUrl ?? null,
    plan: draft.plan,
    referral_code: draft.referralCode,
    referred_by: referredBy ?? null,
    lifetime_pro: false,
    referral_uploads: 0,
    referral_qualified: false,
  };

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert(insertRow)
    .select('*')
    .single();

  if (insertError || !created) {
    console.warn('[prevault] profiles insert failed — using auth metadata', insertError?.message);
    return draft;
  }

  void ensureHouseholdForUser(authUser.id);
  void syncHouseholdVaultFromServer();
  return withDevUserPlan(mapProfileToUser(created as ProfileRow));
}
