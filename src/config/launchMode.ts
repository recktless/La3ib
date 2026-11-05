/**
 * Centralized Pre-Launch & Coming Soon Configuration for La3ib | لاعب
 *
 * Controls whether the public-facing animated Coming Soon landing page is active.
 *
 * - When `COMING_SOON_MODE = true`:
 *   Public visitors see the animated Coming Soon landing page with floating sports illustrations.
 *   Authorized administrators can bypass using the discreet Admin Access modal (password: 4709 + admin auth).
 *
 * - When `COMING_SOON_MODE = false`:
 *   The full La3ib application is live and accessible to all visitors.
 */
export const COMING_SOON_MODE = true;

/**
 * Storage keys used for preserving verified administrator bypass state.
 */
export const ADMIN_BYPASS_STORAGE_KEY = 'la3ib_admin_bypass_token';
export const ADMIN_BYPASS_EXPIRY_KEY = 'la3ib_admin_bypass_expiry';
export const ADMIN_BYPASS_EMAIL_KEY = 'la3ib_admin_bypass_email';

function getSessionStorage(): Storage | null {
  try {
    if (typeof sessionStorage !== 'undefined') return sessionStorage;
    if (typeof window !== 'undefined' && window.sessionStorage) return window.sessionStorage;
  } catch {}
  return null;
}

function getLocalStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {}
  return null;
}

export function getStoredAdminToken(): string | null {
  try {
    const session = getSessionStorage();
    const local = getLocalStorage();
    return (session?.getItem(ADMIN_BYPASS_STORAGE_KEY) || local?.getItem(ADMIN_BYPASS_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

export function setStoredAdminToken(token: string, email?: string): void {
  try {
    const session = getSessionStorage();
    const local = getLocalStorage();
    session?.setItem(ADMIN_BYPASS_STORAGE_KEY, token);
    local?.setItem(ADMIN_BYPASS_STORAGE_KEY, token);
    if (email) {
      session?.setItem(ADMIN_BYPASS_EMAIL_KEY, email);
      local?.setItem(ADMIN_BYPASS_EMAIL_KEY, email);
    }
  } catch {}
}

export function clearStoredAdminToken(): void {
  try {
    const session = getSessionStorage();
    const local = getLocalStorage();
    session?.removeItem(ADMIN_BYPASS_STORAGE_KEY);
    local?.removeItem(ADMIN_BYPASS_STORAGE_KEY);
    session?.removeItem(ADMIN_BYPASS_EMAIL_KEY);
    local?.removeItem(ADMIN_BYPASS_EMAIL_KEY);
    session?.removeItem('la3ib_open_admin_modal');
  } catch {}
}

export function isAdminSessionActive(): boolean {
  return Boolean(getStoredAdminToken());
}
