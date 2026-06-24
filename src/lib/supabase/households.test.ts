import { describe, expect, it, vi } from 'vitest';
import { ensureHouseholdForUser } from '@/lib/supabase/households';

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => null,
}));

describe('supabase/households', () => {
  it('ensureHouseholdForUser returns error when supabase not configured', async () => {
    const res = await ensureHouseholdForUser('user-1');
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.toLowerCase()).toContain('supabase');
    }
  });
});

