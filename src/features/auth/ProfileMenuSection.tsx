import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { triggerHaptic } from '@/lib/haptics';

type Accent = 'gold' | 'navy' | 'success' | 'muted';

const accentDot: Record<Accent, string> = {
  gold: 'bg-[var(--gold)]',
  navy: 'bg-accent-ink',
  success: 'bg-success',
  muted: 'bg-muted',
};

export function ProfileMenuSection({
  title,
  accent = 'navy',
  children,
}: {
  title: string;
  accent?: Accent;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${accentDot[accent]}`} aria-hidden />
        <p className="section-label mb-0">{title}</p>
      </div>
      <div className="surface-panel divide-y divide-border-soft overflow-hidden rounded-2xl">
        {children}
      </div>
    </section>
  );
}

export function ProfileMenuRow({
  to,
  icon,
  label,
  subtitle,
  badge,
  hapticsEnabled = true,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  subtitle?: string;
  badge?: ReactNode;
  hapticsEnabled?: boolean;
}) {
  return (
    <Link
      to={to}
      onClick={() => triggerHaptic('selection', { enabled: hapticsEnabled })}
      className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent-soft/30 active:bg-accent-soft/50"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft/60 text-accent-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text">{label}</span>
        {subtitle ? <span className="mt-0.5 block text-xs text-muted">{subtitle}</span> : null}
      </span>
      {badge ? <span className="shrink-0">{badge}</span> : null}
      <span className="shrink-0 text-muted" aria-hidden>
        ›
      </span>
    </Link>
  );
}
