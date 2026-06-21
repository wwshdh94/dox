import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Logo } from '@/components/Logo';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useVaultStore } from '@/store/useVaultStore';
import type { FamilyHomeView } from '@/types';

const TAB_ROOTS = ['/', '/health', '/assets'];

export function Header({
  title,
  backTo,
  backFallback,
  center,
}: {
  title?: string;
  /** Fallback route when there is no browser history (e.g. direct link). */
  backFallback?: string;
  /** @deprecated Use backFallback — kept for call sites; back uses history first. */
  backTo?: string;
  /** Centered content in the header bar (e.g. plan badge). */
  center?: ReactNode;
}) {
  const user = useVaultStore((s) => s.user);
  const familyHomeView = useVaultStore((s) => s.settings.familyHomeView ?? 'me');
  const setSettings = useVaultStore((s) => s.setSettings);
  const navigate = useNavigate();
  const location = useLocation();
  const fallback = backFallback ?? backTo ?? '/';
  const showBack = Boolean(backFallback ?? backTo);
  const isTabRoot = TAB_ROOTS.includes(location.pathname) && !showBack;
  const showMeFamilyToggle = isTabRoot;

  const setFamilyView = (view: FamilyHomeView) => {
    setSettings({ familyHomeView: view });
  };

  const goBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  const showCenter = Boolean(center) && !showMeFamilyToggle;

  return (
    <header className="sticky top-0 z-30 border-b border-border-soft bg-surface/80 px-4 py-3 backdrop-blur-md">
      <div
        className={`relative mx-auto max-w-lg items-center ${showMeFamilyToggle || showCenter ? 'flex min-h-10' : 'flex justify-between gap-2'}`}
      >
        <div className="relative z-10 flex min-w-0 items-center gap-2">
          {showBack && (
            <button
              type="button"
              aria-label="Go back"
              onClick={goBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-accent-ink transition-colors hover:bg-accent-soft active:scale-95"
            >
              ←
            </button>
          )}
          {isTabRoot && <Logo variant="mark" size="sm" />}
          {!showMeFamilyToggle && !showCenter && title && (
            <h1 className="min-w-0 truncate text-lg font-semibold leading-tight tracking-tight">
              {title}
            </h1>
          )}
        </div>

        {showCenter && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto">{center}</div>
          </div>
        )}

        {showMeFamilyToggle && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto">
              <SegmentedControl
                aria-label="Family view"
                size="compact"
                className="w-[9.5rem]"
                value={familyHomeView}
                onChange={setFamilyView}
                options={[
                  { value: 'me', label: 'Mine' },
                  { value: 'family', label: 'Family' },
                ]}
              />
            </div>
          </div>
        )}

        <div className="relative z-10 ml-auto flex shrink-0 items-center">
          {user ? (
            <Link
              to="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-soft bg-accent-soft text-sm font-semibold text-accent-ink shadow-sm transition-transform active:scale-95"
            >
              {user.name.charAt(0)}
            </Link>
          ) : (
            <span className="h-10 w-10" aria-hidden="true" />
          )}
        </div>
      </div>
    </header>
  );
}
