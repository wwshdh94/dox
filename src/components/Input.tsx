import type { ReactNode } from 'react';

export function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
      <input
        className="min-h-11 w-full rounded-2xl border border-border bg-surface-elevated px-4 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent-soft"
        {...props}
      />
    </label>
  );
}

export function Textarea({
  label,
  ...props
}: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
      <textarea
        className="min-h-28 w-full rounded-2xl border border-border bg-surface-elevated px-4 py-3 text-sm text-text shadow-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent-soft"
        {...props}
      />
    </label>
  );
}

export function Select({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold tracking-wide text-muted">{label}</span>
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
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string; disabled?: boolean }[];
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold tracking-wide text-muted">{label}</legend>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors ${
              value === opt.value
                ? 'border-accent bg-accent-soft/40'
                : 'border-border bg-surface-elevated'
            } ${opt.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="mt-0.5 accent-accent-ink"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{opt.label}</span>
              {opt.hint && <span className="mt-0.5 block text-xs text-muted">{opt.hint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
