import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '../src/App';
import { AdminBypassModal } from '../src/components/coming-soon/AdminBypassModal';
import {
  isAdminSessionActive,
  getStoredAdminToken,
  setStoredAdminToken,
  clearStoredAdminToken,
  isTokenLocallyExpired,
  validateAdminSessionWithServer,
  logoutAdminSession,
  ADMIN_BYPASS_STORAGE_KEY,
  ADMIN_BYPASS_EMAIL_KEY
} from '../src/config/launchMode';
import { onRequestPost as checkSessionEdgePost } from '../functions/api/admin/check-coming-soon-bypass';
import { onRequestPost as verifyPasswordEdgePost } from '../functions/api/admin/verify-coming-soon-bypass';
import { onRequestPost as logoutEdgePost } from '../functions/api/admin/logout';

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

describe('Production Admin Login & Redirect Loop Prevention Suite', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createStorageMock();
    (globalThis as any).sessionStorage = createStorageMock();
    vi.restoreAllMocks();
  });

  describe('Scenario 1 & 2: Enter correct password, website opens and stays open without redirect loop', () => {
    it('verifies password on edge, confirms session, and remains authenticated without kicking user back to Coming Soon', async () => {
      // Step 1: Simulate edge verification
      const verifyReq = new Request('https://la3ibkw.com/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://la3ibkw.com' },
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
      const verifyData: any = await verifyRes.json();
      expect(verifyData.success).toBe(true);
      expect(verifyData.bypassToken).toBeTruthy();

      // Ensure credentialed CORS headers are returned (no wildcard Access-Control-Allow-Origin with credentials)
      expect(verifyRes.headers.get('Access-Control-Allow-Origin')).toBe('https://la3ibkw.com');
      expect(verifyRes.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      expect(verifyRes.headers.get('Set-Cookie')).toContain('la3ib_admin_session=');

      // Step 2: Simulate session confirmation with edge
      const checkReq = new Request('https://la3ibkw.com/api/admin/check-coming-soon-bypass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://la3ibkw.com',
          'Authorization': `Bearer ${verifyData.bypassToken}`
        },
        body: JSON.stringify({ token: verifyData.bypassToken })
      });
      const checkRes = await checkSessionEdgePost({
        request: checkReq,
        env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
        functionPath: '/api/admin/check-coming-soon-bypass',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });

      expect(checkRes.status).toBe(200);
      const checkData: any = await checkRes.json();
      // Crucial: Web Crypto MUST verify and return valid: true without throwing InvalidAccessError
      expect(checkData.valid).toBe(true);

      // Step 3: Establish session in storage
      setStoredAdminToken(verifyData.bypassToken);
      expect(isAdminSessionActive()).toBe(true);
      expect(getStoredAdminToken()).toBe(verifyData.bypassToken);
    });
  });

  describe('Scenario 3, 4 & 5: Refreshing, page navigation & new tabs preserve valid session', () => {
    it('preserves valid session across page reloads and tab duplicates without returning to Coming Soon', async () => {
      // Simulate persistent token from previous login
      const payload = {
        uid: 'admin-session',
        email: 'khalidalami5555@gmail.com',
        exp: Date.now() + 86400000
      };
      const enc = new TextEncoder();
      const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const token = `${b64}.mockSig`;

      localStorage.setItem(ADMIN_BYPASS_STORAGE_KEY, token);
      localStorage.setItem(ADMIN_BYPASS_EMAIL_KEY, 'khalidalami5555@gmail.com');

      // Local expiration check confirms token is still unexpired
      expect(isTokenLocallyExpired(token)).toBe(false);
      expect(isAdminSessionActive()).toBe(true);

      // Render App: with stored token, initial state is 'checking', rendering loader instead of Coming Soon
      const html = renderToStaticMarkup(<App />);
      expect(html).not.toContain('COMING SOON!');
    });
  });

  describe('Scenario 6, 7 & 8: Mobile Safari, Mobile Chrome & Desktop Chrome Compatibility', () => {
    it('sets Access-Control-Allow-Credentials and exact Origin for credentialed requests from mobile browsers', async () => {
      const mobileOrigins = [
        'https://la3ibkw.com',
        'http://localhost:3000',
        'https://ais-dev-mv36rnr5jnvx7d4q5kal3j-819163175395.europe-west2.run.app'
      ];

      for (const origin of mobileOrigins) {
        const req = new Request('https://la3ibkw.com/api/admin/check-coming-soon-bypass', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': origin
          },
          body: JSON.stringify({ token: 'test' })
        });
        const res = await checkSessionEdgePost({
          request: req,
          env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
          functionPath: '/api/admin/check-coming-soon-bypass',
          waitUntil: () => {},
          next: async () => new Response(),
          params: {},
          data: {}
        });

        expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
        expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
      }
    });
  });

  describe('Scenario 9: Incorrect password is rejected', () => {
    it('rejects incorrect password with 401 status and does not issue session cookie or token', async () => {
      const req = new Request('https://la3ibkw.com/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'wrong-password' })
      });
      const res = await verifyPasswordEdgePost({
        request: req,
        env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
        functionPath: '/api/admin/verify-coming-soon-bypass',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });

      expect(res.status).toBe(401);
      const data: any = await res.json();
      expect(data.success).toBe(false);
      expect(res.headers.get('Set-Cookie')).toBeNull();
    });
  });

  describe('Scenario 10: Expired sessions return to Coming Soon', () => {
    it('detects locally and remotely expired session tokens and clears them', async () => {
      // Token expired 1 hour ago
      const payload = {
        uid: 'admin-session',
        email: 'khalidalami5555@gmail.com',
        exp: Date.now() - 3600000
      };
      const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const expiredToken = `${b64}.signature`;

      expect(isTokenLocallyExpired(expiredToken)).toBe(true);

      // Server check also returns valid: false
      const checkReq = new Request('https://la3ibkw.com/api/admin/check-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: expiredToken })
      });
      const checkRes = await checkSessionEdgePost({
        request: checkReq,
        env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
        functionPath: '/api/admin/check-coming-soon-bypass',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });
      const checkData: any = await checkRes.json();
      expect(checkData.valid).toBe(false);
    });
  });

  describe('Scenario 11: Logout invalidates the session', () => {
    it('clears stored session and expires cookie with Max-Age=0', async () => {
      setStoredAdminToken('active-token');
      expect(getStoredAdminToken()).toBe('active-token');

      // Call edge logout
      const logoutReq = new Request('https://la3ibkw.com/api/admin/logout', {
        method: 'POST',
        headers: { 'Origin': 'https://la3ibkw.com' }
      });
      const logoutRes = await logoutEdgePost({
        request: logoutReq,
        env: {},
        functionPath: '/api/admin/logout',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.headers.get('Set-Cookie')).toContain('Max-Age=0');

      clearStoredAdminToken();
      expect(getStoredAdminToken()).toBeNull();
      expect(isAdminSessionActive()).toBe(false);
    });
  });

  describe('Scenario 12: Network interruptions do not create redirect loops', () => {
    it('retains authenticated session on indeterminate network/proxy error if token is locally valid', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch (offline)'));

      const validPayload = {
        uid: 'admin-session',
        email: 'khalidalami5555@gmail.com',
        exp: Date.now() + 86400000
      };
      const b64 = Buffer.from(JSON.stringify(validPayload)).toString('base64url');
      const token = `${b64}.sig`;

      const result = await validateAdminSessionWithServer(token);
      expect(result.status).toBe('indeterminate');
      // Must not be marked as invalid
      expect(result.status).not.toBe('invalid');
    });

    it('retains authenticated session when server returns HTML during proxy restart', async () => {
      // Mock fetch returning HTML document
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '<!doctype html><html><body>SPA Fallback</body></html>'
      });

      const validPayload = {
        uid: 'admin-session',
        email: 'khalidalami5555@gmail.com',
        exp: Date.now() + 86400000
      };
      const b64 = Buffer.from(JSON.stringify(validPayload)).toString('base64url');
      const token = `${b64}.sig`;

      const result = await validateAdminSessionWithServer(token);
      expect(result.status).toBe('indeterminate');
      expect(result.error).toContain('HTML');
    });
  });

  describe('Scenario 13: Unauthorized users cannot access protected operations', () => {
    it('rejects access when token is missing or corrupted', async () => {
      const checkReq = new Request('https://la3ibkw.com/api/admin/check-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const checkRes = await checkSessionEdgePost({
        request: checkReq,
        env: { ADMIN_BYPASS_SECRET: 'la3ib_admin_bypass_secret_4709_kw_secure' },
        functionPath: '/api/admin/check-coming-soon-bypass',
        waitUntil: () => {},
        next: async () => new Response(),
        params: {},
        data: {}
      });
      const checkData: any = await checkRes.json();
      expect(checkData.valid).toBe(false);
    });

    it('ensures shared password token does NOT grant administrator privileges or access to protected admin endpoints', async () => {
      // 1. Password verification issues website access token
      const verifyReq = new Request('https://la3ibkw.com/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': 'https://la3ibkw.com' },
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
      const verifyData: any = await verifyRes.json();
      expect(verifyData.success).toBe(true);

      // Verify token payload has NO admin email
      const [payloadB64] = verifyData.bypassToken.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      expect(payload.role).toBe('website_visitor');
      expect(payload.email).toBeUndefined();
      expect(verifyData.adminEmail).toBeUndefined();
    });
  });
});
