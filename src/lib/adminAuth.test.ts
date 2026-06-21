import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  adminLogin,
  adminLogout,
  getAdminOwnerEmail,
  isAdminAuthenticated,
  isAdminOwnerEmail,
} from '@/lib/adminAuth';

describe('adminAuth', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.stubEnv('VITE_ADMIN_OWNER_EMAIL', 'owner@example.com');
    vi.stubEnv('VITE_ADMIN_DASHBOARD_KEY', '7829');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    adminLogout();
  });

  it('allows only the configured owner email', () => {
    expect(getAdminOwnerEmail()).toBe('owner@example.com');
    expect(isAdminOwnerEmail('owner@example.com')).toBe(true);
    expect(isAdminOwnerEmail('Owner@Example.com')).toBe(true);
    expect(isAdminOwnerEmail('other@example.com')).toBe(false);
  });

  it('requires owner email even with correct passcode', () => {
    expect(adminLogin('7829', 'other@example.com')).toBe(false);
    expect(isAdminAuthenticated('other@example.com')).toBe(false);
  });

  it('binds session to owner email after login', () => {
    expect(adminLogin('7829', 'owner@example.com')).toBe(true);
    expect(isAdminAuthenticated('owner@example.com')).toBe(true);
    expect(isAdminAuthenticated('other@example.com')).toBe(false);
  });

  it('allows any signed-in user in dev when owner email env is unset', () => {
    vi.unstubAllEnvs();
    sessionStorage.clear();
    expect(isAdminOwnerEmail('demo@gmail.com')).toBe(true);
    expect(adminLogin('7829', 'demo@gmail.com')).toBe(true);
    expect(isAdminAuthenticated('demo@gmail.com')).toBe(true);
  });
});
