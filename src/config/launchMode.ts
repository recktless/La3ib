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
  const token = getStoredAdminToken();
  if (!token) return false;
  return !isTokenLocallyExpired(token);
}

export type AdminAuthState = 'checking' | 'authenticated' | 'unauthenticated';

export function isTokenLocallyExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    let base64 = parts[0].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const jsonStr = atob(base64);
    const payload = JSON.parse(jsonStr);
    if (typeof payload.exp === 'number' && Date.now() > payload.exp) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export interface SessionValidationResult {
  status: 'valid' | 'invalid' | 'indeterminate';
  email?: string;
  uid?: string;
  error?: string;
}

export async function validateAdminSessionWithServer(tokenParam?: string): Promise<SessionValidationResult> {
  const token = tokenParam || getStoredAdminToken();

  if (token && isTokenLocallyExpired(token)) {
    return { status: 'invalid', error: 'Session expired locally' };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/admin/check-coming-soon-bypass', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ token: token || undefined })
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return { status: 'invalid', error: `Server returned ${res.status}` };
      }
      return { status: 'indeterminate', error: `Server returned ${res.status}` };
    }

    const text = await res.text();
    const trimmed = text ? text.trim() : '';

    // If server returned HTML (e.g. SPA fallback rewrite), it's indeterminate, not invalid
    if (!trimmed || trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype')) {
      return { status: 'indeterminate', error: 'Received HTML instead of JSON' };
    }

    let data: any;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return { status: 'indeterminate', error: 'JSON parse error' };
    }

    if (data.valid === true) {
      return { status: 'valid', email: data.email, uid: data.uid };
    } else if (data.valid === false) {
      return { status: 'invalid', error: data.error || 'Server rejected session' };
    }

    return { status: 'indeterminate', error: 'Unexpected response format' };
  } catch (err: any) {
    return { status: 'indeterminate', error: err?.message || 'Network error' };
  }
}

export async function logoutAdminSession(): Promise<void> {
  clearStoredAdminToken();
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
  } catch {}
}
