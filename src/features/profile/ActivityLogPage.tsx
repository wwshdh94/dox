import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useVaultStore } from '@/store/useVaultStore';
import { ActivityFilterBar } from '@/features/profile/ActivityFilterBar';
import {
  DEFAULT_ACTIVITY_FILTERS,
  documentOptionsForActivityFilter,
  filterActivitiesByCriteria,
  filterShareLinksByCriteria,
  hasActiveActivityFilters,
  memberOptionsForActivityFilter,
  sortActivities,
  sortShareLinks,
  type ActivityListFilters,
  type ActivitySortKey,
  type ShareLinkSortKey,
} from '@/lib/activityFilters';
import { activityLogRetentionDays } from '@/lib/planLimits';
import {
  activityLabel,
  activityTargetLabel,
  buildUnifiedShareLinks,
  filterActivitiesByRetention,
  formatExpiresAt,
  isShareActivity,
  isShareLinkLive,
} from '@/lib/activityLog';

type ActivityFilter = 'active' | 'activity' | 'shares';

const FILTERS: { id: ActivityFilter; label: string }[] = [
  { id: 'active', label: 'Active URLs' },
  { id: 'shares', label: 'Share activity' },
  { id: 'activity', label: 'All activity' },
];

export function ActivityLogPage() {
  const user = useVaultStore((s) => s.user);
  const activities = useVaultStore((s) => s.activities);
  const tempLinks = useVaultStore((s) => s.tempLinks);
  const bundleShareLinks = useVaultStore((s) => s.bundleShareLinks);
  const documents = useVaultStore((s) => s.documents);
  const bundles = useVaultStore((s) => s.bundles);
  const members = useVaultStore((s) => s.members);
  const purgeExpiredShareLinks = useVaultStore((s) => s.purgeExpiredShareLinks);
  const pruneActivityLogs = useVaultStore((s) => s.pruneActivityLogs);
  const revokeTempLink = useVaultStore((s) => s.revokeTempLink);
  const revokeBundleShareLink = useVaultStore((s) => s.revokeBundleShareLink);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<ActivityFilter>('active');
  const [listFilters, setListFilters] = useState<ActivityListFilters>(DEFAULT_ACTIVITY_FILTERS);
  const [activitySort, setActivitySort] = useState<ActivitySortKey>('newest');
  const [shareSort, setShareSort] = useState<ShareLinkSortKey>('expiring');

  useEffect(() => {
    purgeExpiredShareLinks();
    pruneActivityLogs();
  }, [purgeExpiredShareLinks, pruneActivityLogs]);

  const retentionDays = activityLogRetentionDays(user ?? null);

  const allLinks = useMemo(
    () => buildUnifiedShareLinks(tempLinks, bundleShareLinks, documents, bundles, user?.name),
    [tempLinks, bundleShareLinks, documents, bundles, user?.name],
  );

  const filterCtx = useMemo(() => ({ documents, bundles }), [documents, bundles]);

  const activeLinks = useMemo(
    () =>
      sortShareLinks(
        filterShareLinksByCriteria(allLinks.filter(isShareLinkLive), listFilters, filterCtx),
        shareSort,
      ),
    [allLinks, listFilters, filterCtx, shareSort],
  );

  const visibleActivities = useMemo(
    () => filterActivitiesByRetention(activities, retentionDays),
    [activities, retentionDays],
  );

  const shareActivities = useMemo(
    () => visibleActivities.filter((a) => isShareActivity(a.event)),
    [visibleActivities],
  );

  const baseActivities = filter === 'shares' ? shareActivities : visibleActivities;

  const listedActivities = useMemo(
    () =>
      sortActivities(filterActivitiesByCriteria(baseActivities, listFilters, filterCtx), activitySort, {
        documents,
        bundles,
        members,
      }),
    [baseActivities, listFilters, filterCtx, activitySort, documents, bundles, members],
  );

  const memberOptions = useMemo(() => memberOptionsForActivityFilter(members), [members]);

  const documentOptions = useMemo(
    () => documentOptionsForActivityFilter(visibleActivities, allLinks, documents),
    [visibleActivities, allLinks, documents],
  );

  const filtersActive = hasActiveActivityFilters(listFilters);

  const copyLink = (pathPrefix: '/v/' | '/p/', token: string) => {
    const url = `${window.location.origin}${pathPrefix}${token}`;
    void navigator.clipboard.writeText(url);
  };

  return (
    <div className="min-h-full pb-28">
      <Header title="Activity & shares" backFallback="/profile" />
      <main className="page-main animate-fade-up space-y-4">
        <p className="text-sm text-muted">
          Expired links are removed automatically. Activity kept for {retentionDays} days on your plan.
        </p>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === f.id
                  ? 'bg-accent text-accent-fg'
                  : 'border border-border bg-surface-elevated text-muted'
              }`}
            >
              {f.label}
              {f.id === 'active' ? ` (${activeLinks.length})` : ''}
            </button>
          ))}
        </div>

        <ActivityFilterBar
          filters={listFilters}
          onChange={setListFilters}
          memberOptions={memberOptions}
          documentOptions={documentOptions}
          sortMode={filter === 'active' ? 'share' : 'activity'}
          sortKey={filter === 'active' ? shareSort : activitySort}
          onSortChange={(sort) => {
            if (filter === 'active') setShareSort(sort as ShareLinkSortKey);
            else setActivitySort(sort as ActivitySortKey);
          }}
        />

        {filter === 'active' && (
          <section className="space-y-3">
            {activeLinks.length === 0 && (
              <p className="text-sm text-muted">
                {filtersActive
                  ? 'No active share URLs match these filters.'
                  : 'No active share URLs. Create one from a document or bundle.'}
              </p>
            )}
            {activeLinks.map((link) => (
              <Card key={link.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{link.targetName}</p>
                    <p className="mt-1 text-xs text-muted">
                      {link.kind === 'document' ? 'Document' : 'Bundle'} · Created by {link.createdByName}
                    </p>
                    {link.sharedWith && (
                      <p className="mt-0.5 text-xs text-muted">For {link.sharedWith}</p>
                    )}
                    <p className="mt-1 truncate font-mono text-xs text-accent-ink">
                      {link.pathPrefix}
                      {link.token.slice(0, 10)}…
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatExpiresAt(link.expiresAt)} · {link.viewCount} view{link.viewCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      variant="secondary"
                      className="px-3 py-2 text-xs"
                      onClick={() =>
                        link.kind === 'document'
                          ? navigate(`/documents/${link.targetId}`)
                          : navigate(`/bundles/${link.targetId}`)
                      }
                    >
                      Open
                    </Button>
                    <Button
                      variant="secondary"
                      className="px-3 py-2 text-xs"
                      onClick={() => copyLink(link.pathPrefix, link.token)}
                    >
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-3 py-2 text-xs text-danger"
                      onClick={() =>
                        link.kind === 'document'
                          ? revokeTempLink(link.id)
                          : revokeBundleShareLink(link.id)
                      }
                    >
                      Revoke
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </section>
        )}

        {filter !== 'active' && (
          <section className="space-y-2">
            {listedActivities.length === 0 && (
              <p className="text-sm text-muted">
                {filtersActive ? 'No activity matches these filters.' : 'No activity in this view yet.'}
              </p>
            )}
            <ul className="space-y-2">
              {listedActivities.map((a) => {
                const target = activityTargetLabel(a, documents, bundles);
                return (
                  <li key={a.id} className="rounded-2xl border border-border bg-surface-elevated px-4 py-3">
                    <p className="text-sm font-medium text-text">
                      {activityLabel(a.event, a.metadata, { members, documents, bundles })}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {activityActorLine(a.metadata)}
                      {target ? ` · ${target}` : ''}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}

function activityActorLine(meta: Record<string, string | number | boolean>): string {
  const name = meta.actorName ?? meta.createdByName;
  if (typeof name === 'string' && name) return `By ${name}`;
  return 'By household member';
}
