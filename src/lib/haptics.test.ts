import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { isHapticSupported, triggerHaptic } from '@/lib/haptics';

describe('haptics', () => {
  const vibrate = vi.fn(() => true);

  beforeEach(() => {
    vibrate.mockClear();
    Object.defineProperty(global.navigator, 'vibrate', {
      configurable: true,
      value: vibrate,
    });
  });

  afterEach(() => {
    Object.defineProperty(global.navigator, 'vibrate', {
      configurable: true,
      value: undefined,
    });
  });

  it('detects vibration API', () => {
    expect(isHapticSupported()).toBe(true);
  });

  it('no-ops when disabled', () => {
    expect(triggerHaptic('light', { enabled: false })).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('fires pattern when enabled', () => {
    expect(triggerHaptic('success', { enabled: true })).toBe(true);
    expect(vibrate).toHaveBeenCalledWith([10, 50, 10]);
  });
});
