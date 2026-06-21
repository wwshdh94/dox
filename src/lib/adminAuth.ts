const SESSION_KEY = 'prevault-admin-session';

interface AdminSession {
  email: string;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getAdminPasscode(): string {
  const fromEnv = import.meta.env.VITE_ADMIN_DASHBOARD_KEY as string | undefined;
  if (fromEnv) return fromEnv;
  return import.meta.env.DEV ? '7829' : '';
}

/** True in dev when owner email env is unset — any signed-in user may use admin passcode. */
export function isDevAdminBypass(): boolean {
  return import.meta.env.DEV && !import.meta.env.VITE_ADMIN_OWNER_EMAIL;
}

/** Production owner email from env only. */
export function getAdminOwnerEmail(): string {
  const fromEnv = import.meta.env.VITE_ADMIN_OWNER_EMAIL as string | undefined;
  return fromEnv ? normalizeEmail(fromEnv) : '';
}

export function isConfiguredAdminOwner(email: string | undefined | null): boolean {
  const owner = getAdminOwnerEmail();
  if (!owner || !email) return false;
  return normalizeEmail(email) === owner;
}

/** Gate + session check — dev bypass allows any signed-in user when owner env is unset. */
export function isAdminOwnerEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  if (isConfiguredAdminOwner(email)) return true;
  return isDevAdminBypass();
}

/** Accounts that must not be blocked (configured owner, or acting admin in dev). */
export function isProtectedAdminAccount(
  email: string | undefined | null,
  actingAdminEmail?: string | null,
): boolean {
  if (isConfiguredAdminOwner(email)) return true;
  if (isDevAdminBypass() && actingAdminEmail && email) {
    return normalizeEmail(email) === normalizeEmail(actingAdminEmail);
  }
  return false;
}

function readSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSession;
    if (!parsed.email) return null;
    return { email: normalizeEmail(parsed.email) };
  } catch {
    return null;
  }
}

function writeSession(email: string): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: normalizeEmail(email) }));
}

export function isAdminAuthenticated(userEmail: string | undefined | null): boolean {
  const session = readSession();
  if (!session || !userEmail) return false;
  const email = normalizeEmail(userEmail);
  return session.email === email && isAdminOwnerEmail(email);
}

export function adminLogin(passcode: string, userEmail: string | undefined | null): boolean {
  const expected = getAdminPasscode();
  if (!expected || passcode !== expected) return false;
  if (!isAdminOwnerEmail(userEmail) || !userEmail) return false;
  writeSession(userEmail);
  return true;
}

export function adminLogout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export function getAdminSession(): AdminSession | null {
  return readSession();
}

export function clearAdminSession(): void {
  adminLogout();
}

export function isAdminConfigured(): boolean {
  if (!getAdminPasscode()) return false;
  if (getAdminOwnerEmail()) return true;
  return isDevAdminBypass();
}
