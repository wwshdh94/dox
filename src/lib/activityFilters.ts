import type { ActivityLog, Document, FamilyMember, SharedBundle } from '@/types';
import type { UnifiedShareLink } from '@/lib/activityLog';

export type ActivityTimeRange = 'all' | 'today' | '7d' | '30d';

export type ActivityListFilters = {
  memberId: string;
  documentId: string;
  timeRange: ActivityTimeRange;
};

export const DEFAULT_ACTIVITY_FILTERS: ActivityListFilters = {
  memberId: '',
  documentId: '',
  timeRange: 'all',
};

export const ACTIVITY_TIME_RANGE_LABELS: Record<ActivityTimeRange, string> = {
  all: 'All time',
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

export function isWithinActivityTimeRange(iso: string, range: ActivityTimeRange, now = Date.now()): boolean {
  if (range === 'all') return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;

  if (range === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return t >= start.getTime();
  }

  const days = range === '7d' ? 7 : 30;
  return t >= now - days * 24 * 60 * 60 * 1000;
}

export function activityMatchesMember(
  activity: ActivityLog,
  memberId: string,
  documents: Document[],
  bundles: SharedBundle[],
): boolean {
  if (activity.metadata.memberId === memberId || activity.metadata.actorMemberId === memberId) {
    return true;
  }
  if (activity.documentId) {
    const doc = documents.find((d) => d.id === activity.documentId);
    if (doc?.memberId === memberId) return true;
  }
  if (activity.bundleId) {
    const bundle = bundles.find((b) => b.id === activity.bundleId);
    if (bundle?.memberId === memberId) return true;
  }
  return false;
}

export function activityMatchesDocument(activity: ActivityLog, documentId: string): boolean {
  if (activity.documentId === documentId) return true;
  return false;
}

export function filterActivitiesByCriteria(
  activities: ActivityLog[],
  filters: ActivityListFilters,
  ctx: { documents: Document[]; bundles: SharedBundle[] },
): ActivityLog[] {
  return activities.filter((a) => {
    if (filters.memberId && !activityMatchesMember(a, filters.memberId, ctx.documents, ctx.bundles)) {
      return false;
    }
    if (filters.documentId && !activityMatchesDocument(a, filters.documentId)) {
      return false;
    }
    if (!isWithinActivityTimeRange(a.createdAt, filters.timeRange)) {
      return false;
    }
    return true;
  });
}

export function shareLinkMatchesMember(
  link: UnifiedShareLink,
  memberId: string,
  documents: Document[],
  bundles: SharedBundle[],
): boolean {
  if (link.kind === 'document') {
    return documents.find((d) => d.id === link.targetId)?.memberId === memberId;
  }
  return bundles.find((b) => b.id === link.targetId)?.memberId === memberId;
}

export function shareLinkMatchesDocument(link: UnifiedShareLink, documentId: string, bundles: SharedBundle[]): boolean {
  if (link.kind === 'document') return link.targetId === documentId;
  const bundle = bundles.find((b) => b.id === link.targetId);
  return bundle?.documentIds.includes(documentId) ?? false;
}

export function filterShareLinksByCriteria(
  links: UnifiedShareLink[],
  filters: ActivityListFilters,
  ctx: { documents: Document[]; bundles: SharedBundle[] },
): UnifiedShareLink[] {
  return links.filter((link) => {
    if (filters.memberId && !shareLinkMatchesMember(link, filters.memberId, ctx.documents, ctx.bundles)) {
      return false;
    }
    if (filters.documentId && !shareLinkMatchesDocument(link, filters.documentId, ctx.bundles)) {
      return false;
    }
    if (!isWithinActivityTimeRange(link.createdAt, filters.timeRange)) {
      return false;
    }
    return true;
  });
}

export function documentOptionsForActivityFilter(
  activities: ActivityLog[],
  links: UnifiedShareLink[],
  documents: Document[],
): { id: string; title: string }[] {
  const ids = new Set<string>();
  for (const a of activities) {
    if (a.documentId) ids.add(a.documentId);
  }
  for (const link of links) {
    if (link.kind === 'document') ids.add(link.targetId);
  }
  return [...ids]
    .map((id) => ({
      id,
      title: documents.find((d) => d.id === id)?.title ?? 'Document',
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export function memberOptionsForActivityFilter(members: FamilyMember[]): FamilyMember[] {
  return members.filter((m) => m.status !== 'disabled').sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function hasActiveActivityFilters(filters: ActivityListFilters): boolean {
  return Boolean(filters.memberId || filters.documentId || filters.timeRange !== 'all');
}

export function countActiveActivityFilters(filters: ActivityListFilters): number {
  let count = 0;
  if (filters.memberId) count += 1;
  if (filters.documentId) count += 1;
  if (filters.timeRange !== 'all') count += 1;
  return count;
}

export type ActivitySortKey = 'newest' | 'oldest' | 'document' | 'member';
export type ShareLinkSortKey = 'newest' | 'oldest' | 'expiring' | 'name';

export const ACTIVITY_SORT_LABELS: Record<ActivitySortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  document: 'Document A–Z',
  member: 'Member A–Z',
};

export const SHARE_LINK_SORT_LABELS: Record<ShareLinkSortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  expiring: 'Expiring soon',
  name: 'Name A–Z',
};

function activityDocumentTitle(
  activity: ActivityLog,
  documents: Document[],
  bundles: SharedBundle[],
): string {
  if (activity.documentId) {
    return documents.find((d) => d.id === activity.documentId)?.title ?? 'Document';
  }
  if (activity.bundleId) {
    return bundles.find((b) => b.id === activity.bundleId)?.name ?? 'Bundle';
  }
  return '';
}

function activityMemberName(
  activity: ActivityLog,
  ctx: { documents: Document[]; bundles: SharedBundle[]; members: FamilyMember[] },
): string {
  const metaMemberId =
    typeof activity.metadata.memberId === 'string'
      ? activity.metadata.memberId
      : typeof activity.metadata.actorMemberId === 'string'
        ? activity.metadata.actorMemberId
        : undefined;
  if (metaMemberId) {
    const member = ctx.members.find((m) => m.id === metaMemberId);
    if (member) return member.displayName;
  }
  if (activity.documentId) {
    const doc = ctx.documents.find((d) => d.id === activity.documentId);
    if (doc?.memberId) {
      return ctx.members.find((m) => m.id === doc.memberId)?.displayName ?? '';
    }
  }
  if (activity.bundleId) {
    const bundle = ctx.bundles.find((b) => b.id === activity.bundleId);
    if (bundle?.memberId) {
      return ctx.members.find((m) => m.id === bundle.memberId)?.displayName ?? '';
    }
  }
  return '';
}

export function sortActivities(
  activities: ActivityLog[],
  sort: ActivitySortKey,
  ctx: { documents: Document[]; bundles: SharedBundle[]; members: FamilyMember[] },
): ActivityLog[] {
  const sorted = [...activities];
  sorted.sort((a, b) => {
    const tieNewest = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    switch (sort) {
      case 'newest':
        return tieNewest;
      case 'oldest':
        return -tieNewest;
      case 'document': {
        const cmp = activityDocumentTitle(a, ctx.documents, ctx.bundles).localeCompare(
          activityDocumentTitle(b, ctx.documents, ctx.bundles),
        );
        return cmp !== 0 ? cmp : tieNewest;
      }
      case 'member': {
        const cmp = activityMemberName(a, ctx).localeCompare(activityMemberName(b, ctx));
        return cmp !== 0 ? cmp : tieNewest;
      }
      default:
        return tieNewest;
    }
  });
  return sorted;
}

export function sortShareLinks(links: UnifiedShareLink[], sort: ShareLinkSortKey): UnifiedShareLink[] {
  const sorted = [...links];
  sorted.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'expiring':
        return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
      case 'name':
        return a.targetName.localeCompare(b.targetName);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  return sorted;
}
