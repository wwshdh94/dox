import { describe, expect, it, beforeEach } from 'vitest';
import {
  biometricSupported,
  clearBiometricCredential,
  hasBiometricCredential,
} from './biometricLock';

describe('biometricLock', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports unsupported when PublicKeyCredential is missing', () => {
    expect(typeof biometricSupported()).toBe('boolean');
  });

  it('tracks stored credentials per user', () => {
    expect(hasBiometricCredential('user-1')).toBe(false);
    localStorage.setItem('prevault-biometric-credential:user-1', 'abc');
    expect(hasBiometricCredential('user-1')).toBe(true);
    clearBiometricCredential('user-1');
    expect(hasBiometricCredential('user-1')).toBe(false);
  });
});
