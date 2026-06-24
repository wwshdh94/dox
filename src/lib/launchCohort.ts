import { listPlatformHouseholds } from '@/lib/adminPlatformRegistry';
import { fetchLaunchCohortSignupCount } from '@/lib/supabase/limits';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { User } from '@/types';

/** First N signups eligible for launch Pro + Lifetime Pro tasks. */
export function getLaunchCohortMax(): number {
  const raw = import.meta.env.VITE_LAUNCH_COHORT_MAX_USERS;
  const n = raw ? Number.parseInt(String(raw), 10) : 100;
  return Number.isFinite(n) && n > 0 ? n : 100;
}

export function isLaunchCohortProEnvEnabled(): boolean {
  return import.meta.env.VITE_LAUNCH_COHORT_PRO === 'true';
}

export function countLaunchCohortSignups(): number {
  return listPlatformHouseholds().length;
}

/** Server cohort count when Supabase is configured (null if unavailable). */
export async function countLaunchCohortSignupsAsync(): Promise<number> {
  if (isSupabaseConfigured()) {
    const serverCount = await fetchLaunchCohortSignupCount();
    if (serverCount != null) return serverCount;
  }
  return countLaunchCohortSignups();
}

/** Reserve a cohort slot for a new signup (call before platform registry upsert). */
export function reserveLaunchCohortSlot(): {
  eligible: boolean;
  cohortNumber: number | null;
} {
  const max = getLaunchCohortMax();
  const current = countLaunchCohortSignups();
  if (current >= max) {
    return { eligible: false, cohortNumber: null };
  }
  return { eligible: true, cohortNumber: current + 1 };
}

export function isLaunchCohortMember(user: User | null | undefined): boolean {
  return user?.launchCohort === true;
}

/** Pro features during beta — only first 100 cohort members when env flag is on. */
export function hasLaunchCohortProAccess(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.lifetimePro) return true;
  return isLaunchCohortMember(user) && isLaunchCohortProEnvEnabled();
}

export function launchCohortStatusLabel(user: User | null | undefined): string {
  if (!user) return '';
  if (user.launchCohort && user.launchCohortNumber) {
    return `Launch member #${user.launchCohortNumber} of ${getLaunchCohortMax()}`;
  }
  if (user.launchCohort) return `Launch cohort member (first ${getLaunchCohortMax()})`;
  return `Launch cohort full — Lifetime Pro tasks are for the first ${getLaunchCohortMax()} members only`;
}
