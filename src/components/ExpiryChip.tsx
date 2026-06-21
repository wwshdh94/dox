import { expiryStatus, formatDate, daysUntil } from '@/lib/format';

export function ExpiryChip({
  date,
  compact = false,
  tiny = false,
}: {
  date?: string;
  compact?: boolean;
  tiny?: boolean;
}) {
  const status = expiryStatus(date);
  if (!date || status === 'none') return null;
  const days = daysUntil(date);
  const colors = {
    ok: 'bg-success/12 text-success ring-1 ring-success/20',
    expiring: 'bg-warning/12 text-warning ring-1 ring-warning/25',
    expired: 'bg-danger/12 text-danger ring-1 ring-danger/20',
  };
  const label =
    status === 'expired'
      ? 'Expired'
      : status === 'expiring'
        ? `${days}d left`
        : formatDate(date);

  return (
    <span
      className={`rounded-full font-semibold tracking-wide ${
        tiny
          ? 'px-1 py-px text-[0.55rem]'
          : compact
            ? 'px-1.5 py-0.5 text-[0.62rem]'
            : 'px-2.5 py-1 text-[0.68rem]'
      } ${colors[status]}`}
    >
      {label}
    </span>
  );
}

export function ExpiringBanner({
  count,
  onClick,
  onDismiss,
}: {
  count: number;
  onClick?: () => void;
  onDismiss?: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="mb-1 flex items-stretch gap-1 rounded-2xl border border-warning/25 bg-warning/8 shadow-sm">
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 px-4 py-3.5 text-left transition-all hover:bg-warning/12 active:scale-[0.99]"
      >
        <p className="text-sm font-semibold text-warning">Expiring soon</p>
        <p className="mt-0.5 text-xs text-muted">
          {count} document{count === 1 ? '' : 's'} in the next 30 days — tap to review
        </p>
      </button>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss expiring soon banner"
          onClick={onDismiss}
          className="shrink-0 px-3 text-lg leading-none text-muted transition-colors hover:text-text"
        >
          ×
        </button>
      )}
    </div>
  );
}
