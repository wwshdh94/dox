import { expiryStatus, formatDate, daysUntil } from '@/lib/format';

export function ExpiryChip({ date }: { date?: string }) {
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
    <span className={`rounded-full px-2.5 py-1 text-[0.68rem] font-semibold tracking-wide ${colors[status]}`}>
      {label}
    </span>
  );
}

export function ExpiringBanner({ count, onClick }: { count: number; onClick?: () => void }) {
  if (count === 0) return null;
  return (
    <button
      onClick={onClick}
      className="mb-1 w-full rounded-2xl border border-warning/25 bg-warning/8 px-4 py-3.5 text-left shadow-sm transition-all hover:bg-warning/12 active:scale-[0.99]"
    >
      <p className="text-sm font-semibold text-warning">Expiring soon</p>
      <p className="mt-0.5 text-xs text-muted">
        {count} document{count === 1 ? '' : 's'} in the next 30 days — tap to review
      </p>
    </button>
  );
}
