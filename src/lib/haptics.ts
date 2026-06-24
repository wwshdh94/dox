export type HapticPattern = 'light' | 'medium' | 'success' | 'error' | 'selection';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  selection: 5,
  success: [10, 50, 10],
  error: [20, 80, 20],
};

/** True when the Vibration API is available (typically Android Chrome / installed PWA). */
export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function hapticLabelForPlatform(): string {
  if (!isHapticSupported()) {
    return 'Not available on this device (iOS Safari and most desktops do not support web haptics).';
  }
  return 'Short vibration on key actions — Android installed PWA works best.';
}

/**
 * Trigger haptic feedback. No-op when unsupported or disabled.
 * Must be called from a user gesture handler (tap/click).
 */
export function triggerHaptic(
  pattern: HapticPattern = 'light',
  options?: { enabled?: boolean },
): boolean {
  const enabled = options?.enabled !== false;
  if (!enabled || !isHapticSupported()) return false;
  try {
    return navigator.vibrate(PATTERNS[pattern]);
  } catch {
    return false;
  }
}
