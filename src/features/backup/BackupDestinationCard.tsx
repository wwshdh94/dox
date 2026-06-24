import type { ReactNode } from 'react';

export function BackupDestinationCard({
  icon,
  title,
  subtitle,
  badge,
  children,
  className = '',
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`surface-panel space-y-4 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-subtle">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-text">{title}</p>
            {badge}
          </div>
          {subtitle ? <p className="mt-1 text-xs leading-relaxed text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}
