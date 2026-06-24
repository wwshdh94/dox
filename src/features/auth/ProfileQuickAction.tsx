import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { triggerHaptic } from '@/lib/haptics';

type Tone = 'navy' | 'gold' | 'success' | 'muted';

const toneClass: Record<Tone, string> = {
  navy: 'bg-accent-soft/80 border-accent-muted/40',
  gold: 'bg-[color-mix(in_srgb,var(--gold)_12%,var(--surface))] border-[color-mix(in_srgb,var(--gold-border)_35%,transparent)]',
  success: 'bg-success/10 border-success/25',
  muted: 'bg-bg-subtle border-border-soft',
};

export function ProfileQuickAction({
  to,
  icon,
  label,
  subtitle,
  badge,
  tone = 'navy',
  hapticsEnabled = true,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  subtitle?: string;
  badge?: ReactNode;
  tone?: Tone;
  hapticsEnabled?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={() => triggerHaptic('selection', { enabled: hapticsEnabled })}
      className={`surface-panel flex items-center gap-2.5 rounded-xl border px-2.5 py-2 transition-all hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.98] ${toneClass[tone]}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-elevated/80">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate text-xs font-semibold text-text">{label}</p>
          {badge ? <span className="shrink-0">{badge}</span> : null}
        </div>
        {subtitle ? <p className="truncate text-[0.6rem] leading-tight text-muted">{subtitle}</p> : null}
      </div>
    </Link>
  );
}
