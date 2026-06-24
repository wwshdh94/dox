import type { ReactElement, ReactNode } from 'react';
import type { AssetVisualClass } from '@/lib/assetClass';

type IconProps = { className?: string };

function IconSvg({ className = 'h-7 w-7', children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function CarIcon({ className }: IconProps) {
  return (
    <IconSvg className={className}>
      <path d="M5 17h14" />
      <path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </IconSvg>
  );
}

function LaptopIcon({ className }: IconProps) {
  return (
    <IconSvg className={className}>
      <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8H4V6Z" />
      <path d="M2 18h20" />
    </IconSvg>
  );
}

function FridgeIcon({ className }: IconProps) {
  return (
    <IconSvg className={className}>
      <rect x="6" y="2" width="12" height="20" rx="2" />
      <path d="M6 10h12" />
      <path d="M9 6.5v1" />
      <path d="M9 13.5v1" />
    </IconSvg>
  );
}

function HomeIcon({ className }: IconProps) {
  return (
    <IconSvg className={className}>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </IconSvg>
  );
}

function SubscriptionIcon({ className }: IconProps) {
  return (
    <IconSvg className={className}>
      <path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
      <path d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
      <path d="M8 11h8" />
      <path d="M8 15h5" />
    </IconSvg>
  );
}

function PurchaseIcon({ className }: IconProps) {
  return (
    <IconSvg className={className}>
      <path d="M12 2 2 7l10 5 10-5-10-5Z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </IconSvg>
  );
}

const ICONS: Record<AssetVisualClass, (props: IconProps) => ReactElement> = {
  car: CarIcon,
  laptop: LaptopIcon,
  fridge: FridgeIcon,
  home: HomeIcon,
  subscription: SubscriptionIcon,
  purchase: PurchaseIcon,
};

export function AssetClassIcon({
  visualClass,
  className,
}: {
  visualClass: AssetVisualClass;
  className?: string;
}) {
  const Icon = ICONS[visualClass];
  return <Icon className={className} />;
}
