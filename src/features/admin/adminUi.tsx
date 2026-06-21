import { useEffect, useMemo } from 'react';
import type { PlatformAdminSnapshot } from '@/lib/adminAnalytics';
import { buildPlatformAdminSnapshot } from '@/lib/adminAnalytics';
import { useVaultStore } from '@/store/useVaultStore';

export function useAdminSnapshot(): PlatformAdminSnapshot {
  const user = useVaultStore((s) => s.user);
  const members = useVaultStore((s) => s.members);
  const documents = useVaultStore((s) => s.documents);
  const assets = useVaultStore((s) => s.assets);
  const bundles = useVaultStore((s) => s.bundles);
  const tempLinks = useVaultStore((s) => s.tempLinks);
  const syncPlatformMetrics = useVaultStore((s) => s.syncPlatformMetrics);

  useEffect(() => {
    syncPlatformMetrics();
  }, [syncPlatformMetrics, user?.id, members.length, documents.length, assets.length, bundles.length, tempLinks.length]);

  return useMemo(() => buildPlatformAdminSnapshot(), [user, members, documents, assets, bundles, tempLinks]);
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'accent' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-accent/25 bg-accent-soft/40'
      : tone === 'warning'
        ? 'border-warning/30 bg-warning/10'
        : tone === 'danger'
          ? 'border-danger/30 bg-danger/10'
          : 'border-border bg-surface-elevated';

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-text">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function formatTrendLabel(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TrendChart({
  title,
  points,
  colorClass = 'bg-accent',
}: {
  title: string;
  points: { date: string; count: number }[];
  colorClass?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.count));

  return (
    <section className="rounded-2xl border border-border bg-surface-elevated p-4 shadow-sm">
      <p className="section-label">{title}</p>
      <div className="mt-4 flex h-36 items-end gap-2">
        {points.map((point) => {
          const height = `${Math.max(8, (point.count / max) * 100)}%`;
          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center">
                <div
                  className={`w-full max-w-8 rounded-t-md ${colorClass}`}
                  style={{ height }}
                  title={`${formatTrendLabel(point.date)}: ${point.count}`}
                />
              </div>
              <span className="truncate text-[0.65rem] text-muted">{formatTrendLabel(point.date)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
