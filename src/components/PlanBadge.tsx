import type { User } from '@/types';

function planLabel(plan: User['plan']): string {
  if (plan === 'pro') return 'Pro';
  if (plan === 'family') return 'Family';
  return 'Free';
}

export function PlanBadge({
  plan,
  className = '',
}: {
  plan: User['plan'];
  className?: string;
}) {
  const tier = plan === 'pro' || plan === 'family' ? 'premium' : 'free';

  return (
    <span className={`plan-badge plan-badge--${tier} ${className}`.trim()}>
      {planLabel(plan)}
    </span>
  );
}
