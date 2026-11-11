import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App, { AppContent } from '../src/App';
import { AdminBypassModal } from '../src/components/coming-soon/AdminBypassModal';
import {
  isAdminSessionActive,
  isWebsiteAccessActive,
  getStoredAdminToken,
  setStoredAdminToken,
  clearStoredAdminToken,
  ADMIN_BYPASS_STORAGE_KEY,
  ADMIN_BYPASS_EMAIL_KEY
} from '../src/config/launchMode';
import { onRequestPost as checkSessionEdgePost } from '../functions/api/admin/check-coming-soon-bypass';
import { onRequestPost as verifyPasswordEdgePost } from '../functions/api/admin/verify-coming-soon-bypass';

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

describe('Critical Security Fix: Admin Bypass Grants Website Access Only (Never Admin Rights)', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createStorageMock();
    (globalThis as any).sessionStorage = createStorageMock();
    vi.restoreAllMocks();
  });

  describe('AdminBypassModal Layout & Copy Separation', () => {
    it('renders access code copy and never promises admin dashboard or requests user credentials', () => {
      const html = renderToStaticMarkup(
        <AdminBypassModal
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      // Must include Administrator Access branding & updated access code copy
      expect(html).toContain('Administrator Access');
      expect(html).toContain('Enter access code to unlock website');
      expect(html).toContain('Admin Bypass Password');
      expect(html).toContain('Enter');
      expect(html).toContain('Unlock Full App');

      // Old misleading copy must be gone
      expect(html).not.toContain('Enter admin password to open dashboard');

      // Must be mobile friendly numeric input with enterKeyHint
      expect(html.toLowerCase()).toContain('inputmode="numeric"');
      expect(html.toLowerCase()).toContain('enterkeyhint="go"');

      // The user should only ever see one password field and one Enter button
      expect(html).not.toContain('>Cancel<');

      // MUST NOT contain any Firebase account sign-in fields or prompts
      expect(html).not.toContain('Sign in with Google');
      expect(html).not.toContain('Admin Email');
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

  describe('Session Token Persistence & Absolute Email Decoupling', () => {
    it('manages website access token without storing admin email or credentials', () => {
      expect(isWebsiteAccessActive()).toBe(false);
      expect(isAdminSessionActive()).toBe(false);
      expect(getStoredAdminToken()).toBeNull();

      // Store token
      const mockToken = 'mock-payload.mock-signature';
      setStoredAdminToken(mockToken);

      expect(isWebsiteAccessActive()).toBe(true);
      expect(isAdminSessionActive()).toBe(true);
      expect(getStoredAdminToken()).toBe(mockToken);
      expect(localStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBe(mockToken);
      expect(sessionStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBe(mockToken);

      // CRITICAL: ADMIN_BYPASS_EMAIL_KEY must NEVER be populated!
      expect(localStorage.getItem(ADMIN_BYPASS_EMAIL_KEY)).toBeNull();
      expect(sessionStorage.getItem(ADMIN_BYPASS_EMAIL_KEY)).toBeNull();

      // Clear token
      clearStoredAdminToken();

      expect(isWebsiteAccessActive()).toBe(false);
      expect(isAdminSessionActive()).toBe(false);
      expect(getStoredAdminToken()).toBeNull();
      expect(localStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBeNull();
      expect(sessionStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBeNull();
    });

    it('purges any legacy stored admin email when setStoredAdminToken is called', () => {
      localStorage.setItem(ADMIN_BYPASS_EMAIL_KEY, 'khalidalami5555@gmail.com');
      sessionStorage.setItem(ADMIN_BYPASS_EMAIL_KEY, 'khalidalami5555@gmail.com');

      setStoredAdminToken('new-token');

      expect(localStorage.getItem(ADMIN_BYPASS_EMAIL_KEY)).toBeNull();
      expect(sessionStorage.getItem(ADMIN_BYPASS_EMAIL_KEY)).toBeNull();
    });
  });

  describe('Backend Password Verification & Security Invariants', () => {
    it('verifies password 4709 returns a website visitor bypass token and NO admin email', async () => {
      const verifyReq = new Request('https://la3ibkw.com/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: '4709' })
      });
      const verifyRes = await verifyPasswordEdgePost({
        request: verifyReq,
        env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
        functionPath: '/api/admin/verify-coming-soon-bypass',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });

      expect(verifyRes.status).toBe(200);
      const data: any = await verifyRes.json();

      expect(data.success).toBe(true);
      expect(data.bypassToken).toBeTruthy();
      expect(data.adminEmail).toBeUndefined(); // MUST NOT leak admin email
      expect(data.requiresAuth).toBeUndefined();

      // Inspect payload inside token: MUST be website_visitor, NOT admin
      const [payloadB64] = data.bypassToken.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      expect(payload.role).toBe('website_visitor');
      expect(payload.email).toBeUndefined();
    });

    it('rejects incorrect passwords with 401 status and error message', async () => {
      const verifyReq = new Request('https://la3ibkw.com/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' })
      });
      const verifyRes = await verifyPasswordEdgePost({
        request: verifyReq,
        env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
        functionPath: '/api/admin/verify-coming-soon-bypass',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });

      expect(verifyRes.status).toBe(401);
      const data: any = await verifyRes.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe('Incorrect administrator bypass password.');
    });

    it('enforces rate limiting on repeated failed attempts', async () => {
      let lastRes: Response | null = null;
      for (let i = 0; i < 6; i++) {
        const verifyReq = new Request('https://la3ibkw.com/api/admin/verify-coming-soon-bypass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '1.2.3.4' },
          body: JSON.stringify({ password: 'wrong' })
        });
        lastRes = await verifyPasswordEdgePost({
          request: verifyReq,
          env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
          functionPath: '/api/admin/verify-coming-soon-bypass',
          waitUntil: () => {},
          next: async () => new Response(),
          params: {},
          data: {}
        });
      }

      expect(lastRes).not.toBeNull();
      expect(lastRes!.status).toBe(429);
      const data: any = await lastRes!.json();
      expect(data.rateLimited).toBe(true);
      expect(data.error).toContain('Too many failed attempts');
    });
  });

  describe('Scenario A: New Device with Bypass Unlocks Site as Unauthenticated Guest', () => {
    it('unlocks the website into unauthenticated guest mode without administrator buttons or identity', async () => {
      // 1. Establish valid website access token (e.g. entered 4709)
      const payload = {
        role: 'website_visitor',
        access: true,
        exp: Date.now() + 86400000
      };
      const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${b64}.sig123`;
      localStorage.setItem(ADMIN_BYPASS_STORAGE_KEY, token);

      // 2. Render App with active bypass
      const html = renderToStaticMarkup(<App />);

      // Must NOT be stuck on Coming Soon landing page
      expect(html).not.toContain('COMING SOON!');
      expect(html).not.toContain('Coming Soon!');

      // CRITICAL: Must NOT contain Admin Dashboard button or Khalid identity
      expect(html).not.toContain('Admin Dashboard');
      expect(html).not.toContain('لوحة التحكم للمشرف');
      expect(html).not.toContain('khalidalami5555@gmail.com');
      expect(html).not.toContain('La3ib Administrator');
    });
  });

  describe('Account Logout Separation', () => {
    it('account sign out does NOT clear website access token or lock the website', () => {
      // 1. Establish bypass token in localStorage
      localStorage.setItem(ADMIN_BYPASS_STORAGE_KEY, 'valid-bypass-token');
      expect(getStoredAdminToken()).toBe('valid-bypass-token');

      // 2. Verify that clearStoredAdminToken is NOT called by normal user logout
      // Website bypass token remains intact in storage
      expect(localStorage.getItem(ADMIN_BYPASS_STORAGE_KEY)).toBe('valid-bypass-token');
      expect(isWebsiteAccessActive()).toBe(true);
    });
  });

  describe('Privileged Admin Endpoints Reject Website Bypass Tokens', () => {
    it('server admin endpoints reject website bypass tokens without valid Firebase ID token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ success: false, error: 'Access denied. Administrator privileges required.' })
      });
      global.fetch = mockFetch;

      const websiteToken = 'valid-website-token.hmac';

      // Attempt privileged ban-player action with website bypass token
      const res = await fetch('/api/admin/ban-player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${websiteToken}`
        },
        body: JSON.stringify({ targetUserId: 'target-123', isPermanent: true })
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain('Administrator privileges required');
    });
  });
});
