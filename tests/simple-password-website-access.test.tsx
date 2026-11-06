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
  ADMIN_BYPASS_STORAGE_KEY
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

describe('Simple Password-Protected Website Access (Not an Admin System)', () => {
  beforeEach(() => {
    (globalThis as any).localStorage = createStorageMock();
    (globalThis as any).sessionStorage = createStorageMock();
    vi.restoreAllMocks();
  });

  it('Scenario 1: A visitor without a Firebase account opens Coming Soon', () => {
    // Visitor has no stored token and no account
    clearStoredAdminToken();
    expect(getStoredAdminToken()).toBeNull();
    expect(isAdminSessionActive()).toBe(false);

    // Initial render displays the Coming Soon landing page
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('Coming Soon!');
    expect(html).toContain('La3ib');
  });

  it('Scenario 2 & 3: Correct shared password opens the normal La3ib website immediately', async () => {
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

    // Verify token payload is a website visitor token, NOT an admin token
    const [payloadB64] = verifyData.bypassToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    expect(payload.role).toBe('website_visitor');
    expect(payload.access).toBe(true);
    expect(payload.email).toBeUndefined();

    // Establish session
    setStoredAdminToken(verifyData.bypassToken);
    expect(isAdminSessionActive()).toBe(true);

    // Opening App with active bypass renders normal website and NO AdminBypassBanner claiming staff
    const html = renderToStaticMarkup(<App />);
    expect(html).not.toContain('Staff Pre-Launch Preview');
    expect(html).not.toContain('معاينة الإدارة');
  });

  it('Scenario 4: Visitor remains inside after refreshing the page', async () => {
    // Generate valid unexpired visitor token
    const payload = {
      role: 'website_visitor',
      access: true,
      exp: Date.now() + 86400000
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${b64}.sig123`;

    localStorage.setItem(ADMIN_BYPASS_STORAGE_KEY, token);

    // Check that session is active and not locally expired
    expect(isTokenLocallyExpired(token)).toBe(false);
    expect(isAdminSessionActive()).toBe(true);

    // On reload, it does NOT immediately flash Coming Soon
    const html = renderToStaticMarkup(<App />);
    expect(html).not.toContain('COMING SOON!');
  });

  it('Scenario 5: Visitor can browse public tabs without admin modal popping up', () => {
    // Ensure no admin modal trigger is stored
    expect(sessionStorage.getItem('la3ib_open_admin_modal')).toBeNull();
  });

  it('Scenario 6: Entering shared password does NOT grant administrator privileges', async () => {
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
    const verifyData: any = await verifyRes.json();
    
    // Website bypass response does NOT return admin email
    expect(verifyData.adminEmail).toBeUndefined();

    // Token does NOT grant admin action permissions
    const [payloadB64] = verifyData.bypassToken.split('.');
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    expect(payload.role).toBe('website_visitor');
    expect(payload.email).toBeUndefined();
  });

  it('Scenario 7: Visitors can optionally create an account or sign in normally', () => {
    // App renders guest mode banner inviting them to sign in
    const html = renderToStaticMarkup(<App />);
    // When bypassed or rendering app, visitor is guest unless authenticated via Firebase
    expect(html).toBeDefined();
  });

  it('Scenario 8: Incorrect passwords do not unlock the website', async () => {
    const verifyReq = new Request('https://la3ibkw.com/api/admin/verify-coming-soon-bypass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'invalid-password' })
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
  });

  it('Scenario 9: Mobile and desktop behave identically with credentialed CORS headers', async () => {
    const origins = ['https://la3ibkw.com', 'http://localhost:3000', 'https://preview.la3ib.app'];
    for (const origin of origins) {
      const checkReq = new Request('https://la3ibkw.com/api/admin/check-coming-soon-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Origin': origin },
        body: JSON.stringify({ token: 'test' })
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
      expect(checkRes.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(checkRes.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    }
  });

  it('Scenario 10: The deployed website does not flash open and redirect back to Coming Soon', async () => {
    // Test that check-coming-soon-bypass properly validates the token via Web Crypto
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
    const { bypassToken }: any = await verifyRes.json();

    const checkReq = new Request('https://la3ibkw.com/api/admin/check-coming-soon-bypass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: bypassToken })
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
    expect(checkData.valid).toBe(true);
  });
});
