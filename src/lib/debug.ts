const PREFIX = '[Dox]';

function enabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem('DOX_DEBUG') === '1';
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
