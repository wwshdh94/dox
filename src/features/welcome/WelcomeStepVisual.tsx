import type { ReactNode } from 'react';
import type { WelcomeStep } from '@/features/welcome/welcomeSteps';
import { CloudVaultHero } from '@/features/welcome/CloudVaultHero';

function MockPhone({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`welcome-mock-phone mx-auto w-full max-w-[min(100%,320px)] rounded-[2rem] border-[3px] border-border bg-surface-elevated p-3 shadow-lg sm:max-w-[340px] ${className}`}
    >
      <div className="mb-3 flex justify-center">
        <span className="h-1.5 w-14 rounded-full bg-border" />
      </div>
      <div className="min-h-[280px] space-y-3 rounded-2xl bg-bg p-4 text-left sm:min-h-[300px]">{children}</div>
    </div>
  );
}

export function WelcomeStepVisual({ step }: { step: WelcomeStep }) {
  switch (step.visual) {
    case 'hero':
      return <CloudVaultHero className="mx-auto aspect-[360/320] w-full max-w-lg" />;
    case 'upload':
      return (
        <MockPhone className="welcome-anim-upload">
          <div className="welcome-doc-thumb rounded-xl border-2 border-gold-border bg-surface-elevated p-3">
            <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-accent-soft to-bg-subtle" />
            <p className="mt-2 text-sm font-semibold text-text">passport.pdf</p>
          </div>
          <div className="welcome-scan-line" aria-hidden />
          <div className="rounded-xl border border-success/40 bg-success/10 px-3 py-2.5">
            <p className="text-sm font-semibold text-success">Fields ready ✓</p>
            <div className="mt-2 space-y-1.5">
              <div className="h-2.5 w-[85%] rounded-full bg-success/25" />
              <div className="h-2.5 w-[65%] rounded-full bg-success/20" />
              <div className="h-2.5 w-[45%] rounded-full bg-success/15" />
            </div>
          </div>
        </MockPhone>
      );
    case 'family':
      return (
        <MockPhone className="welcome-anim-family">
          {[
            { name: 'Rahul', tone: 'bg-accent text-accent-fg' },
            { name: 'Priya', tone: 'bg-gold/20 text-accent-ink' },
            { name: 'Asha', tone: 'bg-gold/20 text-accent-ink' },
          ].map((m, i) => (
            <div
              key={m.name}
              className={`welcome-family-card flex items-center gap-3 rounded-xl border border-border/60 bg-surface px-3 py-3`}
              style={{ animationDelay: `${i * 0.15}s` }}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-full text-base font-bold ${m.tone}`}>
                {m.name[0]}
              </span>
              <span className="text-base font-semibold text-text">{m.name}</span>
              {i > 0 && (
                <span className="welcome-share-pulse ml-auto rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-ink">
                  shared
                </span>
              )}
            </div>
          ))}
        </MockPhone>
      );
    case 'expiry':
      return (
        <MockPhone className="welcome-anim-expiry">
          <div className="welcome-expiry-banner rounded-xl border-2 border-warning/50 bg-warning/15 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-warning">2</p>
            <p className="text-sm font-semibold text-warning">due soon</p>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between rounded-xl border border-warning/40 bg-surface-elevated px-4 py-3">
              <span className="text-base font-medium text-text">PUC</span>
              <span className="welcome-expiry-urgent rounded-full bg-warning/20 px-3 py-1 text-sm font-bold text-warning">
                12d
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-elevated px-4 py-3">
              <span className="text-base font-medium text-text">Insurance</span>
              <span className="text-sm text-muted">45d</span>
            </div>
          </div>
        </MockPhone>
      );
    case 'security':
      return (
        <div className="welcome-anim-security mx-auto grid w-full max-w-[min(100%,340px)] grid-cols-2 gap-3">
          {[
            { icon: '🔐', short: 'AES-256' },
            { icon: '🛡️', short: 'TLS' },
            { icon: '🇮🇳', short: 'India' },
            { icon: '👁️', short: 'Private' },
          ].map((row, i) => (
            <div
              key={row.short}
              className="welcome-security-tile flex flex-col items-center justify-center rounded-2xl border-2 border-border/60 bg-surface-elevated px-4 py-8"
              style={{ animationDelay: `${i * 0.12}s` }}
            >
              <span className="text-4xl" aria-hidden>
                {row.icon}
              </span>
              <span className="mt-3 text-sm font-bold text-accent-ink">{row.short}</span>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
