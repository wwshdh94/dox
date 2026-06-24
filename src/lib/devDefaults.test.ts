import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

describe('devDefaults', () => {
  const env = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    Object.assign(import.meta.env, env);
  });

  it('defaults to pro in dev', async () => {
    import.meta.env.DEV = true;
    import.meta.env.VITE_DEV_USER_PLAN = '';
    const { defaultDevUserPlan } = await import('@/lib/devDefaults');
    expect(defaultDevUserPlan()).toBe('pro');
  });

  it('stays free outside dev', async () => {
    import.meta.env.DEV = false;
    const { defaultDevUserPlan } = await import('@/lib/devDefaults');
    expect(defaultDevUserPlan()).toBe('free');
  });

  it('respects VITE_DEV_USER_PLAN=free in dev', async () => {
    import.meta.env.DEV = true;
    import.meta.env.VITE_DEV_USER_PLAN = 'free';
    const { defaultDevUserPlan } = await import('@/lib/devDefaults');
    expect(defaultDevUserPlan()).toBe('free');
  });
});
