import type { ReactNode } from 'react';

import { SegmentedControl } from '@/components/SegmentedControl';

const defaultLabelClass = 'text-xs font-semibold tracking-wide text-muted';

export function Input({
  label,
  labelClassName = defaultLabelClass,
  wrapperClassName = 'space-y-2',
  ...props
}: {
  label: string;
  labelClassName?: string;
  wrapperClassName?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const isDate = props.type === 'date';
  return (
    <label className={`block min-w-0 ${wrapperClassName}`}>
      <span className={labelClassName}>{label}</span>
      <input
        className={`min-h-11 w-full min-w-0 max-w-full rounded-2xl border border-border bg-surface-elevated text-sm text-text shadow-sm outline-none transition-colors placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent-soft ${
          isDate ? 'px-2.5 sm:px-4 [color-scheme:light] dark:[color-scheme:dark]' : 'px-4'
        }`}
        {...props}
      />
    </label>
  );
}

export function Textarea({
  label,
  labelClassName = defaultLabelClass,
  ...props
}: { label: string; labelClassName?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-2">
      <span className={labelClassName}>{label}</span>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-accent-soft"
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  labelClassName = defaultLabelClass,
  wrapperClassName = 'space-y-2',
  children,
  ...props
}: {
  label: string;
  labelClassName?: string;
  wrapperClassName?: string;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`block ${wrapperClassName}`}>
      <span className={labelClassName}>{label}</span>
      <select
        className="min-h-11 w-full rounded-2xl border border-border bg-surface-elevated px-4 text-sm text-text shadow-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-soft"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function RadioGroup<T extends string>({
  label,
  name: _name,
  value,
  onChange,
  options,
  size = 'default',
}: {
  label: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
  size?: 'default' | 'compact' | 'dense';
}) {
  const selected = options.find((opt) => opt.value === value);

  return (
    <fieldset className="space-y-2">
      <legend className={defaultLabelClass}>{label}</legend>
      <SegmentedControl
        aria-label={label}
        value={value}
        onChange={onChange}
        size={size}
        options={options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          disabled: opt.disabled,
        }))}
      />
      {selected?.hint ? <p className="text-xs text-muted">{selected.hint}</p> : null}
    </fieldset>
  );
}
