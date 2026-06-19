import type { Document } from '@/types';
import { resolveDocTags } from './docTags';

export function documentBackPath(doc: Document): string {
  const { domain } = resolveDocTags(doc);
  if (domain === 'health' && doc.memberId) return `/health/${doc.memberId}`;
  if (domain === 'assets' && doc.assetId) return `/assets/${doc.assetId}`;
  if (doc.memberId) return `/family/${doc.memberId}`;
  return '/';
}

export function uploadBackPath(search: URLSearchParams): string {
  if (search.get('context') === 'health') {
    const member = search.get('member');
    return member ? `/health/${member}` : '/health';
  }
  if (search.get('type') === 'purchase' || search.get('asset')) {
    const asset = search.get('asset');
    return asset ? `/assets/${asset}` : '/assets';
  }
  const member = search.get('member');
  if (member) return `/family/${member}`;
  return '/';
}
