import { NavLink } from 'react-router-dom';

function NavIcon({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg transition-colors ${active ? 'border border-accent-muted bg-accent text-accent-fg shadow-sm' : 'bg-bg-subtle text-muted'}`}
    >
      {children}
    </span>
  );
}

export function BottomNav() {
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 border-t border-border-soft bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg gap-0.5 px-2 py-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.62rem] font-medium transition-colors ${isActive ? 'text-accent-ink' : 'text-muted'}`
          }
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>🏠</NavIcon>
              Home
            </>
          )}
        </NavLink>
        <NavLink
          to="/health"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.62rem] font-medium transition-colors ${isActive ? 'text-accent-ink' : 'text-muted'}`
          }
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>🩺</NavIcon>
              Health
            </>
          )}
        </NavLink>
        <NavLink
          to="/assets"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[0.62rem] font-medium transition-colors ${isActive ? 'text-accent-ink' : 'text-muted'}`
          }
        >
          {({ isActive }) => (
            <>
              <NavIcon active={isActive}>📦</NavIcon>
              Assets
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
