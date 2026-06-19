interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'default' | 'compact';
  'aria-label'?: string;
}

const sizeStyles = {
  default: {
    track: 'segmented-control',
    button: 'py-2.5 text-sm',
  },
  compact: {
    track: 'segmented-control segmented-control--compact',
    button: 'py-1.5 text-xs',
  },
} as const;

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'default',
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  const styles = sizeStyles[size];

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex border border-border-soft bg-bg-subtle ${styles.track} ${className}`}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt.value)}
            className={`segmented-control__segment flex-1 px-2.5 font-semibold transition-colors ${styles.button} ${
              selected
                ? 'bg-accent text-accent-fg shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
