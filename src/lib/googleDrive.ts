import { backupFileName, parseBackupJson, serializeBackup, type EncryptedVaultBackup } from '@/lib/vaultBackup';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const BACKUP_MIME = 'application/json';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

export function getGoogleClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-prevault-gis]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.dataset.prevaultGis = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

const TOKEN_CACHE_KEY = 'prevault-gdrive-token';

interface CachedDriveToken {
  accessToken: string;
  expiresAt: number;
}

function readCachedDriveToken(): CachedDriveToken | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(TOKEN_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedDriveToken;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedDriveToken(accessToken: string, expiresInSec = 3500): void {
  if (typeof sessionStorage === 'undefined') return;
  const payload: CachedDriveToken = {
    accessToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  };
  sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(payload));
}

export function clearGoogleDriveAccessTokenCache(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(TOKEN_CACHE_KEY);
}

export async function requestGoogleAccessToken(): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) throw new Error('Google Drive is not configured. Add VITE_GOOGLE_CLIENT_ID to .env');

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error ?? 'Google sign-in cancelled'));
          return;
        }
        writeCachedDriveToken(resp.access_token);
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: '' });
  });
}

/** Reuses cached token when valid — same Google account as sign-in. */
export async function getGoogleDriveAccessToken(): Promise<string> {
  const cached = readCachedDriveToken();
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }
  return requestGoogleAccessToken();
}

async function driveFetch(token: string, url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Drive API error (${res.status})`);
  }
  return res;
}

export async function uploadBackupToDrive(
  token: string,
  backup: EncryptedVaultBackup,
): Promise<{ fileId: string; fileName: string }> {
  const fileName = backupFileName(new Date(backup.createdAt));
  const metadata = { name: fileName, mimeType: BACKUP_MIME };
  const body = new FormData();
  body.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  body.append('file', new Blob([serializeBackup(backup)], { type: BACKUP_MIME }));

  const res = await driveFetch(
    token,
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    { method: 'POST', body },
  );
  const json = (await res.json()) as { id: string; name: string };
  return { fileId: json.id, fileName: json.name };
}

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

async function listBackupFiles(token: string): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    "name contains 'prevault-vault-backup' and trashed=false and mimeType='application/json'",
  );
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files?q=${q}&orderBy=modifiedTime desc&pageSize=10&fields=files(id,name,modifiedTime)`,
  );
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files ?? [];
}

export async function downloadLatestBackupFromDrive(token: string): Promise<EncryptedVaultBackup> {
  const files = await listBackupFiles(token);
  if (files.length === 0) throw new Error('No PreVault backup found in your Google Drive.');
  const latest = files[0]!;
  const res = await driveFetch(
    token,
    `https://www.googleapis.com/drive/v3/files/${latest.id}?alt=media`,
  );
  const text = await res.text();
  return parseBackupJson(text);
}

export async function listDriveBackups(token: string): Promise<DriveFile[]> {
  return listBackupFiles(token);
}
