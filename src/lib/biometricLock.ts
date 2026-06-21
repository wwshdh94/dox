const STORAGE_PREFIX = 'prevault-biometric-credential';

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function biometricSupported(): boolean {
  return typeof window !== 'undefined' && typeof PublicKeyCredential !== 'undefined';
}

export function hasBiometricCredential(userId: string): boolean {
  return !!localStorage.getItem(storageKey(userId));
}

export function clearBiometricCredential(userId: string): void {
  localStorage.removeItem(storageKey(userId));
}

export async function registerBiometricCredential(user: {
  id: string;
  email: string;
  name: string;
}): Promise<void> {
  if (!biometricSupported()) {
    throw new Error('Biometric unlock is not supported on this device.');
  }

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: 'PreVault', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(user.id),
        name: user.email,
        displayName: user.name,
      },
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error('Biometric registration was cancelled.');
  }

  localStorage.setItem(
    storageKey(user.id),
    bufferToBase64url(credential.rawId),
  );
}

export async function verifyBiometricCredential(userId: string): Promise<boolean> {
  if (!biometricSupported()) return false;

  const stored = localStorage.getItem(storageKey(userId));
  if (!stored) return false;

  const assertion = (await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      allowCredentials: [
        {
          id: base64urlToBuffer(stored),
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;

  return !!assertion;
}
