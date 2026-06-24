import { NavLink } from 'react-router-dom';
import { AssetsNavIcon, HealthNavIcon, HomeNavIcon } from '@/components/NavIcons';

function NavIcon({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span
      className={
        active
          ? 'flex h-9 w-9 items-center justify-center rounded-xl border border-accent bg-accent text-accent-fg shadow-sm transition-colors'
          : 'flex h-9 w-9 items-center justify-center rounded-xl border border-transparent bg-bg-subtle text-muted transition-colors dark:border-border-soft dark:bg-surface-elevated dark:text-text'
      }
    >
      {children}
    </span>
  );
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.62rem] font-medium transition-colors ${
    isActive ? 'text-accent-ink' : 'text-muted dark:text-text/75'
  }`;

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg gap-0.5 px-2 py-2">
        <NavLink to="/" end className={navLinkClass}>
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <HomeNavIcon />
              </NavIcon>
              Home
            </>
          )}
        </NavLink>
        <NavLink to="/health" className={navLinkClass}>
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <HealthNavIcon />
              </NavIcon>
              Health
            </>
          )}
        </NavLink>
        <NavLink to="/assets" className={navLinkClass}>
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>
                <AssetsNavIcon />
              </NavIcon>
              Assets
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
