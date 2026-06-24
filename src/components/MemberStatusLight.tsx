import { resolveMemberStatusLight } from '@/lib/memberActivity';
import type { FamilyMember } from '@/types';

function StatusDot({
  className,
  pulse,
}: {
  className: string;
  pulse?: boolean;
}) {
  return <span className={`rounded-full ${className} ${pulse ? 'animate-pulse' : ''}`} aria-hidden="true" />;
}

export function MemberStatusLight({
  member,
  compact = false,
  detailed = false,
}: {
  member: FamilyMember;
  compact?: boolean;
  detailed?: boolean;
}) {
  const light = resolveMemberStatusLight(member);
  const dotSize = compact ? 'h-2 w-2' : 'h-2.5 w-2.5';

  if (!detailed) {
    return (
      <span
        className="inline-flex shrink-0 self-center"
        title={light.label}
        aria-label={light.label}
        role="status"
      >
        <StatusDot className={`${dotSize} ${light.dot}`} pulse={light.pulse} />
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${compact ? 'text-xs' : 'text-sm'}`}
      role="status"
      aria-label={light.label}
      title={light.label}
    >
      <StatusDot className={`${dotSize} ${light.dot}`} pulse={light.pulse} />
      <span className={light.textClass ?? 'text-text'}>{light.label}</span>
    </div>
  );
}

const LEGEND: Array<{ label: string; dot: string }> = [
  { label: 'On app', dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.65)]' },
  { label: 'Invite pending', dot: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.65)]' },
  { label: 'Disabled', dot: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.65)]' },
];

export function MemberStatusLegend({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-muted ${className}`}>
      {LEGEND.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1">
          <StatusDot className={`h-1.5 w-1.5 ${item.dot}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}
