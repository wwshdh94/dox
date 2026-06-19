import type { DocFields } from '@/types';

/** Mask sensitive field values for shared bundle views */
export function redactFieldValue(key: string, value: string | number | null | undefined): string {
  const str = String(value ?? '');
  const k = key.toLowerCase();
  if (k.includes('aadhaar')) {
    const digits = str.replace(/\D/g, '');
    return digits.length >= 4 ? `XXXX-XXXX-${digits.slice(-4)}` : 'XXXX-XXXX-XXXX';
  }
  if (k.includes('pan') && str.length >= 4) {
    return `${str.slice(0, 2)}XXXX${str.slice(-2)}`;
  }
  if (k.includes('passport') && str.length > 4) {
    return `${str.slice(0, 2)}****${str.slice(-2)}`;
  }
  return str;
}

export function redactFields(fields: DocFields): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).map(([k, v]) => [k, redactFieldValue(k, v)]),
  );
}

export function formatShareDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function bundleShareUrl(token: string, print = false): string {
  const base = `${window.location.origin}/p/${token}`;
  return print ? `${base}?print=1` : base;
}
