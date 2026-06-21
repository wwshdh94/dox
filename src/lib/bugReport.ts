import { getRecentErrors } from '@/lib/debug';

export interface BugReport {
  id: string;
  at: string;
  message: string;
  stack?: string;
  componentStack?: string;
  route: string;
  userAgent: string;
  appVersion: string;
  userEmail?: string;
  userId?: string;
  recentErrors: ReturnType<typeof getRecentErrors>;
}

const REPORTS_KEY = 'prevault-bug-reports';
const MAX_REPORTS = 50;
const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL ?? 'support@prevault.app';
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.0';

function readVaultUser(): { id?: string; email?: string } {
  try {
    const raw = localStorage.getItem('prevault-vault');
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { state?: { user?: { id?: string; email?: string } } };
    return parsed.state?.user ?? {};
  } catch {
    return {};
  }
}

export function createBugReport(error: Error, componentStack?: string | null): BugReport {
  const user = readVaultUser();
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    message: error.message || 'Unknown error',
    stack: error.stack,
    componentStack: componentStack ?? undefined,
    route: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    appVersion: APP_VERSION,
    userEmail: user.email,
    userId: user.id,
    recentErrors: getRecentErrors(),
  };
}

export function formatBugReportBody(report: BugReport): string {
  return [
    'PreVault bug report',
    `Report ID: ${report.id}`,
    `Time: ${report.at}`,
    `App: ${report.appVersion}`,
    `Route: ${report.route}`,
    `User: ${report.userEmail ?? 'unknown'} (${report.userId ?? 'n/a'})`,
    `Message: ${report.message}`,
    '',
    'Stack:',
    report.stack ?? '(none)',
    '',
    'Component stack:',
    report.componentStack ?? '(none)',
    '',
    'Recent errors:',
    JSON.stringify(report.recentErrors, null, 2),
  ].join('\n');
}

export function saveBugReport(report: BugReport): void {
  try {
    const existing = listBugReports();
    localStorage.setItem(REPORTS_KEY, JSON.stringify([report, ...existing].slice(0, MAX_REPORTS)));
  } catch {
    /* ignore */
  }
}

export function listBugReports(): BugReport[] {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? (JSON.parse(raw) as BugReport[]) : [];
  } catch {
    return [];
  }
}

export function bugReportMailto(report: BugReport): string {
  const subject = encodeURIComponent(`PreVault bug report — ${report.id.slice(0, 8)}`);
  const body = encodeURIComponent(formatBugReportBody(report));
  return `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
}

export async function submitBugReport(report: BugReport): Promise<'mailto' | 'copied' | 'saved'> {
  saveBugReport(report);
  const body = formatBugReportBody(report);

  try {
    window.location.href = bugReportMailto(report);
    return 'mailto';
  } catch {
    /* fall through */
  }

  try {
    await navigator.clipboard.writeText(body);
    return 'copied';
  } catch {
    return 'saved';
  }
}
