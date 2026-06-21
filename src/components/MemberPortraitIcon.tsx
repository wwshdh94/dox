import type { ReactNode } from 'react';
import type { MemberPortraitKind } from '@/lib/memberPortrait';

const NAVY = 'var(--accent-ink, #002040)';
const GOLD = 'var(--gold, #8a6d38)';
const SKIN = '#e8c9a8';
const HAIR = NAVY;
const SILVER = '#9aa8b8';

function PortraitFrame({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      {children}
    </svg>
  );
}

function BoyIcon({ className }: { className?: string }) {
  return (
    <PortraitFrame className={className}>
      <circle cx="32" cy="24" r="11" fill={SKIN} />
      <path d="M18 58c2-12 9-18 14-18s12 6 14 18" fill={NAVY} />
      <path d="M22 20c2-4 6-6 10-6s8 2 10 6" stroke={HAIR} strokeWidth="3" strokeLinecap="round" />
    </PortraitFrame>
  );
}

function GirlIcon({ className }: { className?: string }) {
  return (
    <PortraitFrame className={className}>
      <circle cx="32" cy="24" r="11" fill={SKIN} />
      <path d="M18 58c2-12 9-18 14-18s12 6 14 18" fill={GOLD} />
      <path
        d="M18 24c2-8 7-12 14-12s12 4 14 12c-4-3-8-4-14-4s-10 1-14 4Z"
        fill={HAIR}
      />
      <path d="M18 30c0 6 6 10 14 10s14-4 14-10" stroke={HAIR} strokeWidth="2.5" />
    </PortraitFrame>
  );
}

function ManIcon({ className }: { className?: string }) {
  return (
    <PortraitFrame className={className}>
      <circle cx="32" cy="23" r="12" fill={SKIN} />
      <path d="M16 58c2-11 9-17 16-17s14 6 16 17" fill={NAVY} />
      <path d="M21 18c2-3 6-5 11-5s9 2 11 5" stroke={HAIR} strokeWidth="3.5" strokeLinecap="round" />
    </PortraitFrame>
  );
}

function WomanIcon({ className }: { className?: string }) {
  return (
    <PortraitFrame className={className}>
      <circle cx="32" cy="23" r="12" fill={SKIN} />
      <path d="M16 58c2-11 9-17 16-17s14 6 16 17" fill={GOLD} />
      <path
        d="M17 24c2-9 7-13 15-13s13 4 15 13c-5-4-9-5-15-5s-10 1-15 5Z"
        fill={HAIR}
      />
      <path d="M17 31c0 7 7 11 15 11s15-4 15-11" stroke={HAIR} strokeWidth="2.5" />
    </PortraitFrame>
  );
}

function OldManIcon({ className }: { className?: string }) {
  return (
    <PortraitFrame className={className}>
      <circle cx="32" cy="23" r="12" fill={SKIN} />
      <path d="M16 58c2-11 9-17 16-17s14 6 16 17" fill={NAVY} />
      <path d="M20 17c2-2 6-4 12-4s10 2 12 4" stroke={SILVER} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M24 30c2 2 4 3 8 3s6-1 8-3" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    </PortraitFrame>
  );
}

function OldWomanIcon({ className }: { className?: string }) {
  return (
    <PortraitFrame className={className}>
      <circle cx="32" cy="23" r="12" fill={SKIN} />
      <path d="M16 58c2-11 9-17 16-17s14 6 16 17" fill={GOLD} />
      <path
        d="M17 24c2-8 7-12 15-12s13 4 15 12c-5-3-9-4-15-4s-10 1-15 4Z"
        fill={SILVER}
      />
      <path d="M17 31c0 6 7 10 15 10s15-4 15-10" stroke={SILVER} strokeWidth="2.5" />
    </PortraitFrame>
  );
}

const ICONS: Record<MemberPortraitKind, (props: { className?: string }) => ReactNode> = {
  boy: BoyIcon,
  girl: GirlIcon,
  man: ManIcon,
  woman: WomanIcon,
  old_man: OldManIcon,
  old_woman: OldWomanIcon,
};

export function MemberPortraitIcon({
  kind,
  className = '',
}: {
  kind: MemberPortraitKind;
  className?: string;
}) {
  const Icon = ICONS[kind];
  return <Icon className={className} />;
}
