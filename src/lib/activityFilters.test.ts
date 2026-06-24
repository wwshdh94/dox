import { describe, expect, it } from 'vitest';
import {
  activityMatchesMember,
  filterActivitiesByCriteria,
  filterShareLinksByCriteria,
  isWithinActivityTimeRange,
  sortActivities,
  sortShareLinks,
} from '@/lib/activityFilters';
import type { ActivityLog, Document, FamilyMember, SharedBundle } from '@/types';
import type { UnifiedShareLink } from '@/lib/activityLog';

const now = Date.parse('2026-06-24T12:00:00.000Z');

const members: FamilyMember[] = [
  { id: 'm1', displayName: 'Rahul', role: 'owner', status: 'active', relationship: 'Self' } as FamilyMember,
  { id: 'm2', displayName: 'Priya', role: 'viewer', status: 'active', relationship: 'Spouse' } as FamilyMember,
];

const documents: Document[] = [
  { id: 'd1', title: 'Passport', memberId: 'm1', docType: 'passport', fields: {}, createdAt: '', updatedAt: '' },
  { id: 'd2', title: 'PAN', memberId: 'm2', docType: 'pan', fields: {}, createdAt: '', updatedAt: '' },
];

const bundles: SharedBundle[] = [
  { id: 'b1', name: 'Insurance pack', documentIds: ['d1'], memberId: 'm1', purpose: '', createdAt: '', updatedAt: '' },
];

const activities: ActivityLog[] = [
  {
    id: 'a1',
    documentId: 'd1',
    event: 'uploaded',
    metadata: { actorMemberId: 'm1' },
    createdAt: '2026-06-24T10:00:00.000Z',
  },
  {
    id: 'a2',
    documentId: 'd2',
    event: 'shared',
    metadata: { memberId: 'm2', actorMemberId: 'm1' },
    createdAt: '2026-06-20T10:00:00.000Z',
  },
];

const links: UnifiedShareLink[] = [
  {
    id: 'l1',
    kind: 'document',
    token: 'tok',
    pathPrefix: '/v/',
    targetId: 'd1',
    targetName: 'Passport',
    createdAt: '2026-06-24T09:00:00.000Z',
    expiresAt: '2026-06-25T09:00:00.000Z',
    createdByName: 'Rahul',
    viewCount: 0,
    status: 'active',
  },
];

describe('activityFilters', () => {
  it('filters by member via document owner or metadata', () => {
    expect(activityMatchesMember(activities[0]!, 'm1', documents, bundles)).toBe(true);
    expect(activityMatchesMember(activities[1]!, 'm2', documents, bundles)).toBe(true);
    const filtered = filterActivitiesByCriteria(
      activities,
      { memberId: 'm2', documentId: '', timeRange: 'all' },
      { documents, bundles },
    );
    expect(filtered.map((a) => a.id)).toEqual(['a2']);
  });

  it('filters by document id', () => {
    const filtered = filterActivitiesByCriteria(
      activities,
      { memberId: '', documentId: 'd1', timeRange: 'all' },
      { documents, bundles },
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.documentId).toBe('d1');
  });

  it('filters by time range', () => {
    expect(isWithinActivityTimeRange('2026-06-24T08:00:00.000Z', 'today', now)).toBe(true);
    expect(isWithinActivityTimeRange('2026-06-01T08:00:00.000Z', '7d', now)).toBe(false);
  });

  it('filters share links by document and time', () => {
    const filtered = filterShareLinksByCriteria(
      links,
      { memberId: '', documentId: 'd1', timeRange: 'today' },
      { documents, bundles },
    );
    expect(filtered).toHaveLength(1);
  });

  it('sorts activities newest first by default', () => {
    const sorted = sortActivities(activities, 'newest', { documents, bundles, members });
    expect(sorted.map((a) => a.id)).toEqual(['a1', 'a2']);
  });

  it('sorts share links by expiry', () => {
    const moreLinks: typeof links = [
      ...links,
      {
        ...links[0]!,
        id: 'l2',
        targetName: 'Later',
        expiresAt: '2026-06-30T09:00:00.000Z',
      },
    ];
    const sorted = sortShareLinks(moreLinks, 'expiring');
    expect(sorted[0]?.id).toBe('l1');
  });
});
