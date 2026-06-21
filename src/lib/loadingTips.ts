/** One-line feature highlights shown while the app loads. */
export const LOADING_TIPS = [
  'Share documents with time-limited links — WhatsApp, email, or QR.',
  'Track passport, RC, insurance & PUC expiry with reminders.',
  'Organise family docs in one vault — Me and Family views.',
  'Vehicle bundles keep RC, PUC & insurance together.',
  'On-device OCR extracts fields privately before you verify.',
  'Encrypted backup — restore your vault anytime from Profile.',
] as const;

const LAST_TIP_KEY = 'prevault-last-loading-tip';

/** Pick a tip different from the last one shown (persisted per device). */
export function nextLoadingTip(): string {
  const last = readLastTip();
  const pool = last ? LOADING_TIPS.filter((t) => t !== last) : [...LOADING_TIPS];
  const tip = pool[Math.floor(Math.random() * pool.length)] ?? LOADING_TIPS[0];
  try {
    localStorage.setItem(LAST_TIP_KEY, tip);
  } catch {
    /* ignore quota / private mode */
  }
  return tip;
}

function readLastTip(): string | null {
  try {
    return localStorage.getItem(LAST_TIP_KEY);
  } catch {
    return null;
  }
}
