import type { ActivityEvent, ActivityLog, BundleShareLink, Document, FamilyMember, SharedBundle, TempShareLink } from '@/types';

export type ShareLinkKind = 'document' | 'bundle';

export interface UnifiedShareLink {
  id: string;
  kind: ShareLinkKind;
  token: string;
  pathPrefix: '/v/' | '/p/';
  targetId: string;
  targetName: string;
  createdAt: string;
  expiresAt: string;
  createdByName: string;
  sharedWith?: string;
  viewCount: number;
  status: TempShareLink['status'];
}

const SHARE_EVENTS: ActivityEvent[] = [
  'shared',
  'revoked',
  'temp_link_created',
  'temp_link_accessed',
  'bundle_shared',
  'bundle_link_accessed',
  'bundle_link_revoked',
  'bundle_printed',
];

export function isShareLinkLive(link: { status: string; expiresAt: string }): boolean {
  return link.status === 'active' && new Date(link.expiresAt).getTime() > Date.now();
}

export function isShareLinkExpired(link: { expiresAt: string }): boolean {
  return new Date(link.expiresAt).getTime() <= Date.now();
}

export function countActiveTempLinks(links: TempShareLink[]): number {
  return links.filter(isShareLinkLive).length;
}

export function formatExpiresAt(iso: string): string {
  const exp = new Date(iso);
  const ms = exp.getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins} min left`;
  const hrs = Math.round(ms / 3_600_000);
  if (hrs < 48) return `${hrs} hr left`;
  return exp.toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function activityActorName(meta: Record<string, string | number | boolean>): string {
  const name = meta.actorName ?? meta.createdByName;
  return typeof name === 'string' && name ? name : 'Household member';
}

export function activityLabel(
  event: ActivityEvent,
  meta: Record<string, string | number | boolean>,
  ctx?: {
    members?: FamilyMember[];
    documents?: Document[];
    bundles?: SharedBundle[];
  },
): string {
  const actor = activityActorName(meta);
  const memberName =
    typeof meta.memberId === 'string'
      ? ctx?.members?.find((m) => m.id === meta.memberId)?.displayName
      : undefined;

  switch (event) {
    case 'temp_link_created':
      return `${actor} created a temp link`;
    case 'temp_link_accessed':
      return `Temp link opened (view #${meta.viewCount ?? '?'})`;
    case 'shared':
      return `${actor} shared with ${memberName ?? 'family member'}`;
    case 'revoked':
      if (typeof meta.linkId === 'string') {
        return `${actor} revoked a temp link`;
      }
      return `${actor} revoked family access for ${memberName ?? 'family member'}`;
    case 'bundle_shared':
      return `${actor} shared bundle with ${meta.sharedWith ?? 'recipient'}`;
    case 'bundle_link_accessed':
      return `Bundle link opened (view #${meta.viewCount ?? '?'})`;
    case 'bundle_printed':
      return 'Bundle printed via secure link';
    case 'bundle_link_revoked':
      return `${actor} revoked a bundle link`;
    case 'uploaded':
      return 'Document uploaded';
    case 'verified':
      return 'Document verified';
    case 'viewed':
      return 'Document viewed';
    case 'deleted':
      return 'Document deleted';
    case 'copied_field':
      return 'Field copied';
    case 'renewed':
      return 'Marked as renewed';
    case 'archived':
      return 'Document archived';
    case 'unarchived':
      return 'Document restored from archive';
    case 'bundle_created':
      return 'Bundle created';
    case 'bundle_updated':
      return 'Bundle updated';
    default:
      return event.replace(/_/g, ' ');
  }
}

export function isShareActivity(event: ActivityEvent): boolean {
  return SHARE_EVENTS.includes(event);
}

export function filterActivitiesByRetention(
  activities: ActivityLog[],
  retentionDays: number,
): ActivityLog[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return activities.filter((a) => new Date(a.createdAt).getTime() >= cutoff);
}

export function buildUnifiedShareLinks(
  tempLinks: TempShareLink[],
  bundleShareLinks: BundleShareLink[],
  documents: Document[],
  bundles: SharedBundle[],
  userName?: string,
): UnifiedShareLink[] {
  const fallbackCreator = userName ?? 'You';

  const docLinks: UnifiedShareLink[] = tempLinks.map((l) => ({
    id: l.id,
    kind: 'document',
    token: l.token,
    pathPrefix: '/v/',
    targetId: l.documentId,
    targetName: documents.find((d) => d.id === l.documentId)?.title ?? 'Document',
    createdAt: l.createdAt ?? l.expiresAt,
    expiresAt: l.expiresAt,
    createdByName: l.createdByName ?? fallbackCreator,
    viewCount: l.viewCount,
    status: l.status,
  }));

  const bundleLinks: UnifiedShareLink[] = bundleShareLinks.map((l) => ({
    id: l.id,
    kind: 'bundle',
    token: l.token,
    pathPrefix: '/p/',
    targetId: l.bundleId,
    targetName: bundles.find((b) => b.id === l.bundleId)?.name ?? 'Bundle',
    createdAt: l.createdAt,
    expiresAt: l.expiresAt,
    createdByName: l.createdByName ?? fallbackCreator,
    sharedWith: l.sharedWith,
    viewCount: l.viewCount,
    status: l.status,
  }));

  return [...docLinks, ...bundleLinks].sort(
    (a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime(),
  );
}

export function activityTargetLabel(
  activity: ActivityLog,
  documents: Document[],
  bundles: SharedBundle[],
): string | null {
  if (activity.documentId) {
    return documents.find((d) => d.id === activity.documentId)?.title ?? 'Document';
  }
  if (activity.bundleId) {
    return bundles.find((b) => b.id === activity.bundleId)?.name ?? 'Bundle';
  }
  return null;
}
