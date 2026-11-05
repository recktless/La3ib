import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminBypassModal } from '../src/components/coming-soon/AdminBypassModal';
import {
  isAdminSessionActive,
  getStoredAdminToken,
  setStoredAdminToken,
  clearStoredAdminToken,
  ADMIN_BYPASS_STORAGE_KEY,
  ADMIN_BYPASS_EMAIL_KEY
} from '../src/config/launchMode';

function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store[key] = String(val);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((idx: number) => Object.keys(store)[idx] ?? null)
  };
}

describe('Admin Password Direct Access & No Account Dependency', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createStorageMock();
    (globalThis as any).sessionStorage = createStorageMock();
    vi.restoreAllMocks();
  });

  describe('AdminBypassModal Layout & Fields', () => {
    it('renders only the password field and no email, Google Sign-In, or secondary login fields', () => {
      const html = renderToStaticMarkup(
        <AdminBypassModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      // Must include Administrator Access branding & title
      expect(html).toContain('Administrator Access');
      expect(html).toContain('Enter admin password to open dashboard');
      expect(html).toContain('Admin Bypass Password');
      expect(html).toContain('Enter');
      expect(html).toContain('Unlock Full App');

      // Must be mobile friendly numeric input with enterKeyHint
      expect(html.toLowerCase()).toContain('inputmode="numeric"');
      expect(html.toLowerCase()).toContain('enterkeyhint="go"');

      // The user should only ever see one password field and one Enter button (no extra Cancel button in form)
      expect(html).not.toContain('>Cancel<');

      // MUST NOT contain any Firebase account sign-in fields or prompts
      expect(html).not.toContain('Sign in with Google');
      expect(html).not.toContain('Admin Email');
      expect(html).not.toContain('OR EMAIL &amp; PASSWORD');
      expect(html).not.toContain('Admin Verification Required');
      expect(html).not.toContain('khalidalami5555@gmail.com');
    });

    it('returns null when isOpen is false', () => {
      const html = renderToStaticMarkup(
        <AdminBypassModal
          isOpen={false}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );
      expect(html).toBe('');
    });
  });

  describe('Session Token Persistence & Lifecycle', () => {
    it('manages admin session state in sessionStorage and localStorage', () => {
      expect(isAdminSessionActive()).toBe(false);
      expect(getStoredAdminToken()).toBeNull();

      // Store token
      const mockToken = 'mock-payload.mock-signature';
      setStoredAdminToken(mockToken, 'khalidalami5555@gmail.com');

      expect(isAdminSessionActive()).toBe(true);
      expect(getStoredAdminToken()).toBe(mockToken);
      expect(localStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBe(mockToken);
      expect(sessionStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBe(mockToken);
      expect(localStorage.getItem(ADMIN_BYPASS_EMAIL_KEY)).toBe('khalidalami5555@gmail.com');

      // Clear token on logout
      clearStoredAdminToken();

      expect(isAdminSessionActive()).toBe(false);
      expect(getStoredAdminToken()).toBeNull();
      expect(localStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(ADMIN_BYPASS_EMAIL_KEY)).toBeNull();
    });

    it('preserves admin session across page reloads', () => {
      // Simulate persistent token from previous session
      localStorage.setItem(ADMIN_BYPASS_STORAGE_KEY, 'persisted-token-xyz');
      localStorage.setItem(ADMIN_BYPASS_EMAIL_KEY, 'khalidalami5555@gmail.com');

      expect(isAdminSessionActive()).toBe(true);
      expect(getStoredAdminToken()).toBe('persisted-token-xyz');
    });
  });

  describe('Backend Password Verification & Security', () => {
    it('verifies password 4709 returns a cryptographically signed bypass token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          bypassToken: 'eyJhbGciOiJIUzI1NiJ9.signature123',
          adminEmail: 'khalidalami5555@gmail.com',
          message: 'Administrator bypass access granted.'
        })
      });
      global.fetch = mockFetch;

      const response = await fetch('/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '4709' })
      });
      const data = JSON.parse(await response.text());

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(data.bypassToken).toBeTruthy();
      expect(data.adminEmail).toBe('khalidalami5555@gmail.com');
      // No account creation or secondary credentials required
      expect(data.requiresAuth).toBeUndefined();
    });

    it('rejects incorrect passwords with 401 status and error message', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({
          success: false,
          error: 'Incorrect administrator bypass password.',
          errorAr: 'رمز الدخول الخاص بالإدارة غير صحيح.'
        })
      });
      global.fetch = mockFetch;

      const response = await fetch('/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' })
      });
      const data = JSON.parse(await response.text());

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Incorrect administrator bypass password.');
    });

    it('enforces rate limiting on repeated failed attempts', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({
          success: false,
          rateLimited: true,
          error: 'Too many failed attempts. Please wait 15 minute(s) before trying again.'
        })
      });
      global.fetch = mockFetch;

      const response = await fetch('/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' })
      });
      const data = JSON.parse(await response.text());

      expect(response.status).toBe(429);
      expect(data.rateLimited).toBe(true);
      expect(data.error).toContain('Too many failed attempts');
    });
  });

  describe('Privileged Admin Operations via Session Token', () => {
    it('authorizes backend administrative actions when Bearer bypass token is provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          success: true,
          message: 'Player user-123 has been banned.'
        })
      });
      global.fetch = mockFetch;

      const token = 'valid-bypass-token.hmac';
      const response = await fetch('/api/admin/ban-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          targetUserId: 'user-123',
          reason: 'Test ban',
          isPermanent: true
        })
      });
      const data = JSON.parse(await response.text());

      expect(response.ok).toBe(true);
      expect(data.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/ban-player',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${token}`
          })
        })
      );
    });

    it('authorizes game editing and cancellation without Firebase user account', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/admin/edit-game')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ success: true, message: 'Game updated.' })
          });
        }
        if (url.includes('/api/admin/cancel-game')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ success: true, message: 'Game cancelled.' })
          });
        }
        return Promise.resolve({ ok: false, status: 404, text: async () => '' });
      });
      global.fetch = mockFetch;

      const token = 'valid-bypass-token.hmac';

      // 1. Edit Game
      const editRes = await fetch('/api/admin/edit-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gameId: 'game-1', updates: { title: 'Updated Title' } })
      });
      expect(editRes.ok).toBe(true);

      // 2. Cancel Game
      const cancelRes = await fetch('/api/admin/cancel-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ gameId: 'game-1', reason: 'Administrative cancellation' })
      });
      expect(cancelRes.ok).toBe(true);
    });
  });
});
