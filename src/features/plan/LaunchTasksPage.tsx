import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/Button';
import {
  LAUNCH_TASKS,
  LIFETIME_PRO_TASKS_REQUIRED,
  approvedFeedbackProgress,
  canAccessLifetimeProProgram,
  countCompletedLaunchTasks,
  evaluateAllLaunchTasks,
  hasEarnedLifetimePro,
  isPwaInstalled,
  lifetimeProProgressLabel,
} from '@/lib/launchTasks';
import { launchCohortStatusLabel } from '@/lib/launchCohort';
import { isProUser } from '@/lib/planLimits';
import { triggerHaptic } from '@/lib/haptics';
import { useVaultStore } from '@/store/useVaultStore';

export function LaunchTasksPage() {
  const user = useVaultStore((s) => s.user);
  const documents = useVaultStore((s) => s.documents);
  const members = useVaultStore((s) => s.members);
  const settings = useVaultStore((s) => s.settings);
  const syncLifetimeProFromTasks = useVaultStore((s) => s.syncLifetimeProFromTasks);

  useEffect(() => {
    syncLifetimeProFromTasks();
  }, [documents, members, settings, user, syncLifetimeProFromTasks]);

  if (!user) return null;

  const cohortAccess = canAccessLifetimeProProgram(user);
  const input = { user, documents, members, settings };
  const progress = evaluateAllLaunchTasks(input);
  const completed = countCompletedLaunchTasks(input);
  const earned = hasEarnedLifetimePro(input);
  const pwaInstalled = isPwaInstalled();
  const feedbackProgress = approvedFeedbackProgress(user.id);

  if (!cohortAccess) {
    return (
      <div className="min-h-full pb-28">
        <Header title="Earn Lifetime Pro" backFallback="/profile/plan" />
        <main className="page-main animate-fade-up space-y-5">
          <div className="surface-panel p-5 text-sm text-muted">
            <p className="font-medium text-text">Launch cohort is full</p>
            <p className="mt-2">{launchCohortStatusLabel(user)}</p>
            <p className="mt-2">
              Lifetime Pro tasks and launch Pro benefits are limited to the first 100 members. You
              can still use PreVault on the free plan.
            </p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-full pb-28">
      <Header title="Earn Lifetime Pro" backFallback="/profile/plan" />
      <main className="page-main animate-fade-up space-y-5">
        <div className="surface-panel-elevated space-y-2 p-5">
          <p className="font-display text-xl text-text">Help us launch — keep Pro free forever</p>
          <p className="text-sm text-muted">
            Complete <strong className="text-text">{LIFETIME_PRO_TASKS_REQUIRED}</strong> of{' '}
            {LAUNCH_TASKS.length} tasks. Each step helps us improve PreVault for Indian families.
            Paid plans come later; lifetime Pro skips the bill.
          </p>
          <p className="text-xs text-muted">{launchCohortStatusLabel(user)}</p>
          <p className="text-xs font-medium text-accent-ink">{lifetimeProProgressLabel(completed)}</p>
          {earned ? (
            <span className="inline-block rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
              {user.lifetimePro ? 'Lifetime Pro unlocked' : 'Tasks complete — syncing…'}
            </span>
          ) : null}
        </div>

        {!isProUser(user) && (
          <p className="text-sm text-muted">
            Launch cohort: Pro features are on during beta. Finish tasks so you keep Pro when billing
            starts.
          </p>
        )}

        <ul className="space-y-3">
          {LAUNCH_TASKS.map((task) => {
            const status = progress.find((p) => p.id === task.id)?.status ?? 'pending';
            const done = status === 'done';
            return (
              <li
                key={task.id}
                className={`surface-panel flex gap-3 p-4 ${done ? 'border border-success/30' : ''}`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done ? 'bg-success text-white' : 'bg-bg text-muted'
                  }`}
                  aria-hidden
                >
                  {done ? '✓' : '·'}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium text-text">{task.title}</p>
                  <p className="text-sm text-muted">{task.description}</p>
                  {task.id === 'install_pwa' && !pwaInstalled && (
                    <p className="text-xs text-muted">
                      Android: Chrome menu → Install app. iOS: Share → Add to Home Screen.
                    </p>
                  )}
                  {task.id === 'approved_feedback' && status !== 'done' && (
                    <p className="text-xs text-muted">
                      {feedbackProgress.approved} of {feedbackProgress.required} admin-approved
                      (50+ characters each)
                    </p>
                  )}
                  {!done && (
                    <Link
                      to={task.ctaPath}
                      className="inline-block text-sm font-semibold text-accent-ink"
                      onClick={() => triggerHaptic('selection', { enabled: settings.hapticFeedback })}
                    >
                      {task.ctaLabel} →
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            triggerHaptic('light', { enabled: settings.hapticFeedback });
            syncLifetimeProFromTasks();
          }}
        >
          Refresh progress
        </Button>

        <p className="text-[0.65rem] leading-relaxed text-muted">
          Lifetime Pro keeps Pro features when paid plans launch. Document storage remains capped at
          50 per member for fair use. See{' '}
          <Link to="/profile/plan" className="text-accent-ink">
            Plans
          </Link>{' '}
          for feature list.
        </p>
      </main>
      <BottomNav />
    </div>
  );
}
