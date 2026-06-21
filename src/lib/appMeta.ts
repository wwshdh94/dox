/** App branding — single source of truth for user-facing name. */
export const APP_NAME = 'PreVault';
export const APP_NAME_LOWER = 'prevault';
export const APP_SUPPORT_EMAIL = 'support@prevault.app';
export const APP_PUBLIC_ORIGIN = 'https://prevault.app';

const SIMPLE_KEY_MIGRATIONS: [string, string][] = [
  ['dox-vault', 'prevault-vault'],
  ['dox-expiring-banner-dismissed-count', 'prevault-expiring-banner-dismissed-count'],
  ['dox-admin-limit-alerts', 'prevault-admin-limit-alerts'],
  ['dox-admin-events', 'prevault-admin-events'],
  ['dox-referral-ledger', 'prevault-referral-ledger'],
  ['dox-bug-reports', 'prevault-bug-reports'],
  ['dox-last-loading-tip', 'prevault-last-loading-tip'],
  ['dox-admin-session', 'prevault-admin-session'],
  ['dox-admin-platform-households', 'prevault-admin-platform-households'],
  ['dox-pending-ref', 'prevault-pending-ref'],
];

/** Copy legacy `dox-*` localStorage keys to `prevault-*` on first run after rebrand. */
export function migrateLegacyStorageKeys(): void {
  if (typeof localStorage === 'undefined') return;

  for (const [from, to] of SIMPLE_KEY_MIGRATIONS) {
    const value = localStorage.getItem(from);
    if (value !== null && localStorage.getItem(to) === null) {
      localStorage.setItem(to, value);
    }
  }

  const legacyPrefix = 'dox-biometric-credential:';
  const newPrefix = 'prevault-biometric-credential:';
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key?.startsWith(legacyPrefix)) continue;
    const suffix = key.slice(legacyPrefix.length);
    const newKey = `${newPrefix}${suffix}`;
    const value = localStorage.getItem(key);
    if (value !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, value);
    }
  }

  if (localStorage.getItem('DOX_DEBUG') === '1' && localStorage.getItem('PREVAULT_DEBUG') !== '1') {
    localStorage.setItem('PREVAULT_DEBUG', '1');
  }
}
