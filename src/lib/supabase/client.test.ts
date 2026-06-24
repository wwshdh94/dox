import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('supabase client flags', () => {
  const env = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.assign(import.meta.env, env);
  });

  it('detects configured supabase', async () => {
    import.meta.env.VITE_SUPABASE_URL = 'https://abc.supabase.co';
    import.meta.env.VITE_SUPABASE_ANON_KEY = 'anon-key';
    const { isSupabaseConfigured } = await import('@/lib/supabase/client');
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('enables demo auth when supabase missing in dev', async () => {
    import.meta.env.VITE_SUPABASE_URL = '';
    import.meta.env.VITE_SUPABASE_ANON_KEY = '';
    import.meta.env.VITE_DEMO_AUTH = '';
    import.meta.env.DEV = true;
    const { isDemoAuthEnabled } = await import('@/lib/supabase/client');
    expect(isDemoAuthEnabled()).toBe(true);
  });

  it('disables demo auth when explicitly off', async () => {
    import.meta.env.VITE_DEMO_AUTH = 'false';
    const { isDemoAuthEnabled } = await import('@/lib/supabase/client');
    expect(isDemoAuthEnabled()).toBe(false);
  });
});
