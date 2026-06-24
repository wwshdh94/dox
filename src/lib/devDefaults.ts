import type { User } from '@/types';

/** Plan for local dev / demo sign-in — Pro by default so features are testable. */
export function defaultDevUserPlan(): User['plan'] {
  if (!import.meta.env.DEV) return 'free';

  const configured = (import.meta.env.VITE_DEV_USER_PLAN as string | undefined)?.trim().toLowerCase();
  if (configured === 'free') return 'free';
  if (configured === 'family') return 'family';
  return 'pro';
}

export function withDevUserPlan(user: User): User {
  if (!import.meta.env.DEV) return user;
  const plan = defaultDevUserPlan();
  return user.plan === plan ? user : { ...user, plan };
}
