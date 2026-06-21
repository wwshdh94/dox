const PREFIX = '[PreVault]';
const MAX_RECENT = 20;

export interface RecentErrorEntry {
  at: string;
  scope: string;
  message: string;
  detail?: unknown;
}

const recentErrors: RecentErrorEntry[] = [];

export function getRecentErrors(): RecentErrorEntry[] {
  return [...recentErrors];
}

function pushRecent(scope: string, message: string, detail?: unknown): void {
  recentErrors.unshift({ at: new Date().toISOString(), scope, message, detail });
  if (recentErrors.length > MAX_RECENT) recentErrors.pop();
}

function enabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem('PREVAULT_DEBUG') === '1';
  } catch {
    return false;
  }
}

export function debug(scope: string, message: string, data?: unknown): void {
  if (!enabled()) return;
  if (data !== undefined) {
    console.log(`${PREFIX} ${scope}:`, message, data);
  } else {
    console.log(`${PREFIX} ${scope}:`, message);
  }
}

export function debugError(scope: string, message: string, error?: unknown): void {
  pushRecent(scope, message, error);
  console.error(`${PREFIX} ${scope}:`, message, error);
}

export function installGlobalErrorHandlers(): void {
  window.addEventListener('error', (e) => {
    debugError('window.error', e.message, {
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    debugError('unhandledrejection', String(e.reason), e.reason);
  });
}
