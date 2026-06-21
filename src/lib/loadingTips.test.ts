import { describe, expect, it, beforeEach } from 'vitest';
import { LOADING_TIPS, nextLoadingTip } from '@/lib/loadingTips';

describe('nextLoadingTip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns one of the defined tips', () => {
    expect(LOADING_TIPS).toContain(nextLoadingTip());
  });

  it('does not repeat the same tip consecutively', () => {
    const first = nextLoadingTip();
    const second = nextLoadingTip();
    expect(second).not.toBe(first);
  });
});

describe('createBugReport', () => {
  it('builds a report with route and message', async () => {
    const { createBugReport, listBugReports, saveBugReport } = await import('@/lib/bugReport');
    const report = createBugReport(new Error('test failure'), 'at Component');
    expect(report.message).toBe('test failure');
    expect(report.componentStack).toBe('at Component');
    saveBugReport(report);
    expect(listBugReports()[0]?.id).toBe(report.id);
  });
});
