import { describe, expect, it } from 'vitest';
import { formatDocumentSyncError } from '@/lib/supabase/limits';
import { PRODUCTION_MAX_DOCS_PER_MEMBER } from '@/lib/documentLimits';

describe('supabase/limits', () => {
  it('formats member document cap errors', () => {
    const msg = formatDocumentSyncError('member_document_cap_reached: detail');
    expect(msg).toContain(String(PRODUCTION_MAX_DOCS_PER_MEMBER));
  });

  it('passes through other errors', () => {
    expect(formatDocumentSyncError('permission denied')).toBe('permission denied');
  });
});
