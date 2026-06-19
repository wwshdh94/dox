import { describe, expect, it } from 'vitest';
import { daysUntil, expiryStatus, formatINR, maskAadhaar } from './format';

describe('format', () => {
  it('formats INR', () => {
    expect(formatINR(189900)).toContain('1,89,900');
  });

  it('computes days until', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + 10);
    const iso = future.toISOString().slice(0, 10);
    expect(daysUntil(iso)).toBeGreaterThanOrEqual(9);
    expect(daysUntil(iso)).toBeLessThanOrEqual(10);
  });

  it('expiry status expiring within 30 days', () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    expect(expiryStatus(d.toISOString().slice(0, 10))).toBe('expiring');
  });

  it('masks aadhaar', () => {
    expect(maskAadhaar('123456789012')).toBe('XXXX-XXXX-9012');
  });
});
