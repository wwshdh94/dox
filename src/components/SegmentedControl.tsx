import { useCallback, useLayoutEffect, useRef, useState } from 'react';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'default' | 'compact' | 'dense';
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
  dense: {
    track: 'segmented-control segmented-control--compact segmented-control--dense',
    button: 'px-1 py-1 text-[0.625rem] leading-tight',
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
  const trackRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef(new Map<string, HTMLButtonElement>());
  const [bubble, setBubble] = useState({ left: 0, width: 0, ready: false });

  const syncBubble = useCallback(() => {
    const track = trackRef.current;
    const segment = segmentRefs.current.get(value);
    if (!track || !segment) return;
    setBubble({
      left: segment.offsetLeft,
      width: segment.offsetWidth,
      ready: true,
    });
  }, [value]);

  useLayoutEffect(() => {
    syncBubble();
  }, [syncBubble, options, size]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => syncBubble());
    observer.observe(track);
    return () => observer.disconnect();
  }, [syncBubble]);

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`relative flex border border-border-soft bg-bg-subtle ${styles.track} ${className}`}
    >
      <div
        aria-hidden="true"
        className="segmented-control__bubble pointer-events-none absolute z-0"
        style={{
          left: bubble.left,
          width: bubble.width,
          opacity: bubble.ready ? 1 : 0,
        }}
      />
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              if (el) segmentRefs.current.set(opt.value, el);
              else segmentRefs.current.delete(opt.value);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={opt.disabled}
            onClick={() => {
              if (!opt.disabled) onChange(opt.value);
            }}
            className={`segmented-control__segment relative z-[1] flex-1 px-2.5 font-semibold transition-colors duration-200 ${styles.button} ${
              opt.disabled ? 'cursor-not-allowed opacity-45' : ''
            } ${selected ? 'text-accent-fg' : 'text-muted hover:text-text'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
