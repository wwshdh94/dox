import { useState, type ReactNode } from 'react';

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="surface-panel overflow-hidden rounded-2xl">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent-soft/20"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-text">{title}</span>
          {subtitle ? <span className="mt-0.5 block text-xs text-muted">{subtitle}</span> : null}
        </span>
        {badge ? (
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[0.625rem] font-semibold text-accent-ink">
            {badge}
          </span>
        ) : null}
        <span
          className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          aria-hidden
        >
          ›
        </span>
      </button>
      {open ? <div className="border-t border-border-soft px-4 py-3">{children}</div> : null}
    </section>
  );
}
