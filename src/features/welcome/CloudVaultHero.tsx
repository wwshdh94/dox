/** Animated cloud vault hero — CSS/SVG motion, no external assets */

export function CloudVaultHero({ className = '' }: { className?: string }) {
  return (
    <div className={`cloud-vault-hero ${className}`} aria-hidden>
      <svg viewBox="0 0 360 320" className="h-full w-full" fill="none">
        <defs>
          <linearGradient id="cv-sky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent-soft)" />
            <stop offset="100%" stopColor="var(--bg-subtle)" />
          </linearGradient>
          <linearGradient id="cv-cloud" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--surface-elevated)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--accent-soft)" stopOpacity="0.7" />
          </linearGradient>
          <linearGradient id="cv-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gold-light)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
          <filter id="cv-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="360" height="320" rx="24" fill="url(#cv-sky)" />

        {/* orbit rings */}
        <circle cx="180" cy="130" r="88" className="cv-orbit cv-orbit-1" stroke="var(--accent-muted)" strokeWidth="1" strokeDasharray="4 8" opacity="0.5" />
        <circle cx="180" cy="130" r="68" className="cv-orbit cv-orbit-2" stroke="var(--gold-border)" strokeWidth="1" strokeDasharray="2 6" opacity="0.45" />

        {/* back cloud */}
        <g className="cv-cloud cv-cloud-back">
          <ellipse cx="120" cy="95" rx="52" ry="28" fill="url(#cv-cloud)" opacity="0.55" />
          <ellipse cx="155" cy="88" rx="40" ry="22" fill="url(#cv-cloud)" opacity="0.55" />
        </g>

        {/* main cloud vault */}
        <g className="cv-cloud cv-cloud-main" filter="url(#cv-glow)">
          <ellipse cx="180" cy="118" rx="78" ry="38" fill="url(#cv-cloud)" />
          <ellipse cx="140" cy="128" rx="48" ry="30" fill="url(#cv-cloud)" />
          <ellipse cx="220" cy="126" rx="52" ry="32" fill="url(#cv-cloud)" />
          <ellipse cx="180" cy="108" rx="56" ry="28" fill="var(--surface-elevated)" opacity="0.9" />
        </g>

        {/* shield lock */}
        <g className="cv-shield" transform="translate(180, 118)">
          <path
            d="M0 -28 L22 -18 V2 C22 16 0 28 0 28 C0 28 -22 16 -22 2 V-18 Z"
            fill="var(--accent)"
            opacity="0.92"
          />
          <rect x="-8" y="-4" width="16" height="12" rx="3" fill="var(--gold)" className="cv-lock-body" />
          <path d="M-5 -8 Q0 -14 5 -8" stroke="var(--gold-light)" strokeWidth="3" fill="none" className="cv-lock-shackle" />
        </g>

        {/* floating document cards */}
        <g className="cv-doc cv-doc-1">
          <rect x="48" y="168" width="44" height="56" rx="6" fill="var(--surface-elevated)" stroke="var(--gold-border)" strokeWidth="1.5" />
          <line x1="56" y1="182" x2="84" y2="182" stroke="var(--accent-muted)" strokeWidth="2" />
          <line x1="56" y1="192" x2="80" y2="192" stroke="var(--accent-muted)" strokeWidth="2" />
          <line x1="56" y1="202" x2="76" y2="202" stroke="var(--accent-muted)" strokeWidth="2" />
        </g>
        <g className="cv-doc cv-doc-2">
          <rect x="268" y="158" width="44" height="56" rx="6" fill="var(--surface-elevated)" stroke="var(--accent-muted)" strokeWidth="1.5" />
          <line x1="276" y1="172" x2="304" y2="172" stroke="var(--accent-muted)" strokeWidth="2" />
          <line x1="276" y1="182" x2="300" y2="182" stroke="var(--accent-muted)" strokeWidth="2" />
        </g>

        {/* upload beam */}
        <g className="cv-beam">
          <path d="M70 200 Q180 80 290 190" stroke="url(#cv-gold)" strokeWidth="2" strokeDasharray="6 8" opacity="0.7" />
          <circle cx="70" cy="200" r="4" fill="var(--gold)" />
          <circle cx="180" cy="95" r="5" fill="var(--gold-light)" className="cv-pulse-dot" />
        </g>

        {/* encrypted particles */}
        {[
          [100, 140],
          [260, 135],
          [150, 200],
          [230, 205],
          [180, 220],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="3" fill="var(--gold)" className={`cv-particle cv-particle-${i + 1}`} />
        ))}
      </svg>
    </div>
  );
}
