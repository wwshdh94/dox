export function uid(): string {
  return crypto.randomUUID();
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'Just now';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
}

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function expiryStatus(date?: string): 'none' | 'ok' | 'expiring' | 'expired' {
  if (!date) return 'none';
  const days = daysUntil(date);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'ok';
}

export function maskAadhaar(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `XXXX-XXXX-${digits.slice(-4)}` : 'XXXX-XXXX-XXXX';
}

export function maskValue(value: string, visible = 4): string {
  if (value.length <= visible) return value;
  return '•'.repeat(value.length - visible) + value.slice(-visible);
}

/** Practical frontend email check — not RFC-complete, good for share forms. */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
}
