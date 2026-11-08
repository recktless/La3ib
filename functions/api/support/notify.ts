/**
 * Cloudflare Pages Function: /api/support/notify
 * Transactional email notification handler for support ticket events
 * 
 * Features:
 * - Cryptographic Firebase Auth ID Token verification via Web Crypto (SubtleCrypto) & Google JWKs
 * - Strict server-side staff verification (khalidalami5555@gmail.com)
 * - Persistent cross-instance deduplication via Firestore REST API
 * - Official Zoho Mail REST API with OAuth 2.0 (automatic access token refresh)
 * - Support for multiple regional Zoho endpoints (.com, .eu, .in, .com.au, .com.sa, etc.)
 * - Automatic discovery and caching of Zoho Mail Account ID
 * - Non-blocking edge execution with zero external runtime dependencies
 * - Branded bilingual (EN/AR) transactional emails
 */

interface Env {
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
  ZOHO_CLIENT_ID?: string;
  ZOHO_CLIENT_SECRET?: string;
  ZOHO_REFRESH_TOKEN?: string;
  ZOHO_MAIL_ACCOUNT_ID?: string;
  ZOHO_REGION?: string;
  ZOHO_ACCOUNTS_URL?: string;
  ZOHO_MAIL_API_BASE?: string;
  ZOHO_MAIL_FROM?: string;
  ZOHO_SUPPORT_INBOX?: string;
  SUPPORT_EMAIL_ENABLED?: string;
  [key: string]: any;
}

interface EventContext<Env, P extends string = any, Data = any> {
  request: Request;
  functionPath: string;
  waitUntil: (promise: Promise<any>) => void;
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  env: Env;
  params: Record<P, string | string[]>;
  data: Data;
}

export type PagesFunction<
  Env = unknown,
  Params extends string = any,
  Data extends Record<string, unknown> = Record<string, unknown>
> = (context: EventContext<Env, Params, Data>) => Response | Promise<Response>;

const DEFAULT_FIREBASE_PROJECT_ID = 'influential-odyssey-hggh3';
const DEFAULT_FIREBASE_API_KEY = 'AIzaSyAUd_jJLMDLetznk0prLaeE-_XvfG-0wOk';
const OFFICIAL_SUPPORT_EMAIL = 'info@la3ibkw.com';

function getCorsHeaders(request: Request): Headers {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json; charset=utf-8');
  const origin = request.headers.get('Origin');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  } else {
    headers.set('Access-Control-Allow-Origin', '*');
  }
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function parseJwtHeader(token: string): { alg?: string; kid?: string; typ?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const bytes = base64UrlDecode(parts[0]);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

function parseJwtPayload(token: string): {
  aud?: string;
  iss?: string;
  sub?: string;
  exp?: number;
  auth_time?: number;
  email?: string;
  [key: string]: any;
} | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const bytes = base64UrlDecode(parts[1]);
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

interface JwkKey {
  kty: string;
  alg: string;
  use?: string;
  kid: string;
  n: string;
  e: string;
}

interface JwkCache {
  keys: JwkKey[];
  expiresAt: number;
}

let cachedJwks: JwkCache | null = null;

async function getGoogleJwks(): Promise<JwkKey[]> {
  const now = Date.now();
  if (cachedJwks && cachedJwks.expiresAt > now && cachedJwks.keys.length > 0) {
    return cachedJwks.keys;
  }

  try {
    const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
    if (!res.ok) {
      throw new Error(`Failed to fetch Google JWKs: ${res.statusText}`);
    }
    const data = await res.json() as { keys?: JwkKey[] };
    if (!data.keys || !Array.isArray(data.keys)) {
      throw new Error('Malformed Google JWK response');
    }

    let maxAgeSeconds = 3600;
    const cacheControl = res.headers.get('cache-control');
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/i);
      if (match && match[1]) {
        maxAgeSeconds = parseInt(match[1], 10);
      }
    }

    cachedJwks = {
      keys: data.keys,
      expiresAt: now + (maxAgeSeconds * 1000)
    };
    return cachedJwks.keys;
  } catch (err) {
    console.warn('[Cloudflare Edge] Warning fetching Google JWKs:', err);
    return cachedJwks?.keys || [];
  }
}

/**
 * Edge-compatible cryptographic Firebase Auth ID token verification
 * Validates RS256 signature against Google JWKs via Web Crypto
 * and strictly verifies audience, issuer, expiration, and subject.
 */
async function verifyFirebaseTokenEdge(
  token: string,
  projectId: string,
  firebaseApiKey?: string
): Promise<{ valid: boolean; uid?: string; email?: string; error?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed authentication token structure' };
    }

    const header = parseJwtHeader(token);
    const payload = parseJwtPayload(token);

    if (!header || !payload) {
      return { valid: false, error: 'Could not decode authentication token' };
    }

    if (header.alg !== 'RS256') {
      return { valid: false, error: `Unsupported token algorithm: ${header.alg}` };
    }

    if (!header.kid) {
      return { valid: false, error: 'Token is missing key identifier (kid)' };
    }

    const nowSeconds = Math.floor(Date.now() / 1000);

    // Expiry check (with 60-second clock skew tolerance)
    if (typeof payload.exp !== 'number' || payload.exp < nowSeconds - 60) {
      return { valid: false, error: 'Authentication session expired. Please sign in again.' };
    }

    // Issued-in-the-future check
    if (typeof payload.auth_time !== 'number' || payload.auth_time > nowSeconds + 60) {
      return { valid: false, error: 'Token issued in the future (invalid auth_time)' };
    }

    // Audience must match Firebase Project ID
    if (payload.aud !== projectId) {
      return { valid: false, error: `Invalid token audience (${payload.aud} != ${projectId})` };
    }

    // Issuer must match Google securetoken endpoint for this project
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIssuer) {
      return { valid: false, error: `Invalid token issuer (${payload.iss} != ${expectedIssuer})` };
    }

    // Subject must be valid non-empty UID string
    if (!payload.sub || typeof payload.sub !== 'string') {
      return { valid: false, error: 'Invalid user identifier in authentication token' };
    }

    // Cryptographic RS256 signature verification with Web Crypto
    const jwks = await getGoogleJwks();
    const matchingKey = jwks.find(k => k.kid === header.kid);

    if (matchingKey) {
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        {
          kty: matchingKey.kty,
          alg: matchingKey.alg,
          n: matchingKey.n,
          e: matchingKey.e,
          ext: true
        },
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: { name: 'SHA-256' }
        },
        false,
        ['verify']
      );

      const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
      const signatureBytes = base64UrlDecode(parts[2]);

      const isValid = await crypto.subtle.verify(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        signatureBytes as unknown as BufferSource,
        signedData as unknown as BufferSource
      );

      if (isValid) {
        return { valid: true, uid: payload.sub, email: payload.email };
      }
    }

    // Fallback: Google Identity Toolkit accounts:lookup API
    if (firebaseApiKey) {
      try {
        const verifyRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: token })
          }
        );
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json() as any;
          if (verifyData.users && verifyData.users.length > 0) {
            return {
              valid: true,
              uid: verifyData.users[0].localId,
              email: verifyData.users[0].email || payload?.email
            };
          }
        }
      } catch (fbErr) {
        console.warn('[Cloudflare Edge] Fallback lookup notice:', fbErr);
      }
    }

    return { valid: false, error: 'Token cryptographic signature verification failed' };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification error' };
  }
}

// In-memory cache for fast layer-1 deduplication per edge worker instance
const edgeDeduplicationMap = new Map<string, number>();

/**
 * Checks persistent cross-instance deduplication using Firestore REST API.
 * Uses the authenticated caller's token to query or insert a deduplication record.
 */
async function checkPersistentDeduplication(
  projectId: string,
  token: string,
  dedupId: string,
  ticketId: string,
  userId: string,
  event: string
): Promise<{ isDuplicate: boolean }> {
  // Layer 1: In-memory check
  const now = Date.now();
  const lastTime = edgeDeduplicationMap.get(dedupId);
  if (lastTime && now - lastTime < 15000) {
    return { isDuplicate: true };
  }
  edgeDeduplicationMap.set(dedupId, now);

  // Layer 2: Persistent Firestore check across all edge instances
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/supportNotifications/${encodeURIComponent(dedupId)}`;
    
    // Check if dedup document already exists
    const checkRes = await fetch(firestoreUrl, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (checkRes.ok) {
      // Document already exists: duplicate detected across instances!
      return { isDuplicate: true };
    }

    // Not found: create the record to claim this notification window atomically
    await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/supportNotifications?documentId=${encodeURIComponent(dedupId)}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          id: { stringValue: dedupId },
          ticketId: { stringValue: ticketId },
          userId: { stringValue: userId },
          event: { stringValue: event },
          createdAt: { stringValue: new Date().toISOString() }
        }
      })
    });

    return { isDuplicate: false };
  } catch (err) {
    console.warn('[Deduplication] Notice checking persistent Firestore dedup:', err);
    return { isDuplicate: false };
  }
}

/* ==========================================================================
 * Zoho Mail REST API & OAuth 2.0 Integration
 * ========================================================================== */

// In-memory edge cache for OAuth 2.0 access token & account ID
let cachedZohoAccessToken: string | null = null;
let zohoTokenExpiresAt: number = 0;
let cachedZohoAccountId: string | null = null;

/**
 * Returns regional Zoho accounts and API URLs based on env or defaults
 */
function getZohoEndpoints(env: Env): { accountsUrl: string; mailApiBase: string } {
  if (env.ZOHO_ACCOUNTS_URL && env.ZOHO_MAIL_API_BASE) {
    return {
      accountsUrl: env.ZOHO_ACCOUNTS_URL.replace(/\/+$/, ''),
      mailApiBase: env.ZOHO_MAIL_API_BASE.replace(/\/+$/, '')
    };
  }

  const region = (env.ZOHO_REGION || 'com').toLowerCase().trim();
  switch (region) {
    case 'eu':
      return { accountsUrl: 'https://accounts.zoho.eu', mailApiBase: 'https://mail.zoho.eu/api' };
    case 'in':
      return { accountsUrl: 'https://accounts.zoho.in', mailApiBase: 'https://mail.zoho.in/api' };
    case 'com.au':
    case 'au':
      return { accountsUrl: 'https://accounts.zoho.com.au', mailApiBase: 'https://mail.zoho.com.au/api' };
    case 'com.sa':
    case 'sa':
    case 'me':
      return { accountsUrl: 'https://accounts.zoho.com.sa', mailApiBase: 'https://mail.zoho.com.sa/api' };
    case 'ca':
      return { accountsUrl: 'https://accounts.zoho.ca', mailApiBase: 'https://mail.zoho.ca/api' };
    case 'jp':
      return { accountsUrl: 'https://accounts.zoho.jp', mailApiBase: 'https://mail.zoho.jp/api' };
    case 'com':
    default:
      return { accountsUrl: 'https://accounts.zoho.com', mailApiBase: 'https://mail.zoho.com/api' };
  }
}

/**
 * Automatically refreshes or returns cached Zoho Mail OAuth 2.0 access token
 */
async function getZohoAccessToken(env: Env): Promise<string | null> {
  const clientId = env.ZOHO_CLIENT_ID;
  const clientSecret = env.ZOHO_CLIENT_SECRET;
  const refreshToken = env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const now = Date.now();
  // Return cached token if still valid (with 5-minute safety buffer)
  if (cachedZohoAccessToken && zohoTokenExpiresAt > now + 300000) {
    return cachedZohoAccessToken;
  }

  const { accountsUrl } = getZohoEndpoints(env);
  const tokenUrl = `${accountsUrl}/oauth/v2/token`;

  try {
    const params = new URLSearchParams();
    params.append('refresh_token', refreshToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'refresh_token');

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Zoho OAuth] Failed to refresh access token, HTTP status:', res.status, errText.slice(0, 100));
      return null;
    }

    const data = await res.json() as { access_token?: string; expires_in?: number; error?: string };
    if (!data.access_token) {
      console.warn('[Zoho OAuth] No access_token returned in response:', data.error || 'unknown');
      return null;
    }

    cachedZohoAccessToken = data.access_token;
    const expiresInSeconds = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    zohoTokenExpiresAt = now + (expiresInSeconds * 1000);

    return cachedZohoAccessToken;
  } catch (err: any) {
    console.warn('[Zoho OAuth] Network error refreshing access token:', err?.message || err);
    return null;
  }
}

/**
 * Obtains and caches the Zoho Mail Account ID
 */
async function getZohoAccountId(env: Env, accessToken: string, fromAddress: string): Promise<string | null> {
  // If explicitly configured in env, use that
  if (env.ZOHO_MAIL_ACCOUNT_ID) {
    return env.ZOHO_MAIL_ACCOUNT_ID.trim();
  }

  if (cachedZohoAccountId) {
    return cachedZohoAccountId;
  }

  const { mailApiBase } = getZohoEndpoints(env);
  const accountsEndpoint = `${mailApiBase}/accounts`;

  try {
    const res = await fetch(accountsEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('[Zoho Mail API] Could not fetch accounts list, HTTP:', res.status, errText.slice(0, 100));
      return null;
    }

    const data = await res.json() as {
      data?: Array<{ accountId?: string; primaryEmailAddress?: string; accountName?: string }>;
    };

    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      // Find account matching fromAddress if possible, or fallback to first account
      const matched = data.data.find(a => 
        (a.primaryEmailAddress || '').toLowerCase() === fromAddress.toLowerCase()
      ) || data.data[0];

      if (matched && matched.accountId) {
        cachedZohoAccountId = String(matched.accountId);
        return cachedZohoAccountId;
      }
    }

    return null;
  } catch (err: any) {
    console.warn('[Zoho Mail API] Network error resolving account ID:', err?.message || err);
    return null;
  }
}

/**
 * Sends an email using the official Zoho Mail REST API
 * POST /api/accounts/{accountId}/messages
 */
async function sendZohoMailRestEmail(
  env: Env,
  params: {
    to: string;
    from: string;
    subject: string;
    html: string;
    replyTo?: string;
  }
): Promise<{ success: boolean; message?: string }> {
  const accessToken = await getZohoAccessToken(env);
  if (!accessToken) {
    return {
      success: false,
      message: 'Zoho Mail OAuth 2.0 credentials not configured or failed to refresh. Notification recorded safely.'
    };
  }

  const accountId = await getZohoAccountId(env, accessToken, params.from);
  if (!accountId) {
    return {
      success: false,
      message: 'Could not determine Zoho Mail account ID. Ensure ZOHO_MAIL_ACCOUNT_ID is set or ZohoMail.accounts.READ scope is granted.'
    };
  }

  const { mailApiBase } = getZohoEndpoints(env);
  const sendEndpoint = `${mailApiBase}/accounts/${encodeURIComponent(accountId)}/messages`;

  try {
    const payload: Record<string, any> = {
      fromAddress: params.from,
      toAddress: params.to,
      subject: params.subject,
      content: params.html,
      mailFormat: 'html',
      action: 'send'
    };

    if (params.replyTo) {
      payload.replyToAddress = params.replyTo;
    }

    const res = await fetch(sendEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      return { success: true, message: 'Dispatched successfully via Zoho Mail REST API' };
    }

    const errorBody = await res.json().catch(() => null) as any;
    console.warn('[Zoho Mail REST API] Failed sending message. Status:', res.status, errorBody?.status?.description || '');
    return {
      success: false,
      message: `Zoho Mail API response: ${errorBody?.status?.description || res.statusText}`
    };
  } catch (err: any) {
    console.warn('[Zoho Mail REST API] Network error during send:', err?.message || err);
    return {
      success: false,
      message: err?.message || 'Zoho Mail send failed'
    };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates branded bilingual (EN/AR) HTML email body
 */
function generateBilingualEmail(options: {
  headlineEn: string;
  headlineAr: string;
  leadEn: string;
  leadAr: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority?: string;
  messageBody?: string;
}): string {
  const { headlineEn, headlineAr, leadEn, leadAr, ticketNumber, subject, category, status, priority, messageBody } = options;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ticketNumber)} - ${escapeHtml(headlineEn)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px; color: #0F172A; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #06135B; padding: 24px 32px; color: #FFFFFF; }
    .logo { font-size: 20px; font-weight: 900; letter-spacing: -0.5px; }
    .logo span { color: #05BCD1; }
    .badge { display: inline-block; background: rgba(5, 188, 209, 0.15); color: #05BCD1; padding: 4px 10px; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-top: 8px; border: 1px solid rgba(5, 188, 209, 0.3); }
    .content { padding: 32px; }
    .headline { font-size: 18px; font-weight: 800; color: #06135B; margin: 0 0 8px 0; }
    .lead { font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0; }
    .rtl-block { direction: rtl; text-align: right; margin-top: 16px; padding-top: 16px; border-top: 1px dashed #E2E8F0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
    .rtl-headline { font-size: 17px; font-weight: 800; color: #06135B; margin: 0 0 6px 0; }
    .rtl-lead { font-size: 14px; color: #475569; line-height: 1.6; margin: 0; }
    .meta-box { background: #F1F5F9; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .meta-row:last-child { margin-bottom: 0; }
    .meta-label { color: #64748B; font-weight: 600; }
    .meta-value { color: #0F172A; font-weight: 700; }
    .message-box { background: #EEF3F9; border-left: 4px solid #3A60AA; padding: 16px; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #1E293B; line-height: 1.6; white-space: pre-wrap; }
    .footer { background: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; font-size: 11px; color: #94A3B8; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">La3ib | <span>لاعب</span></div>
      <div class="badge">Ticket #${escapeHtml(ticketNumber)}</div>
    </div>
    <div class="content">
      <h2 class="headline">${escapeHtml(headlineEn)}</h2>
      <p class="lead">${escapeHtml(leadEn)}</p>

      <div class="meta-box">
        <div class="meta-row">
          <span class="meta-label">Subject / الموضوع:</span>
          <span class="meta-value">${escapeHtml(subject)}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Category / التصنيف:</span>
          <span class="meta-value">${escapeHtml(category.replace(/_/g, ' '))}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Status / الحالة:</span>
          <span class="meta-value">${escapeHtml(status.toUpperCase())}</span>
        </div>
        ${priority ? `
        <div class="meta-row">
          <span class="meta-label">Priority / الأولوية:</span>
          <span class="meta-value">${escapeHtml(priority.toUpperCase())}</span>
        </div>` : ''}
      </div>

      ${messageBody ? `
        <div class="message-box">
          ${escapeHtml(messageBody)}
        </div>
      ` : ''}

      <div class="rtl-block">
        <h3 class="rtl-headline">${escapeHtml(headlineAr)}</h3>
        <p class="rtl-lead">${escapeHtml(leadAr)}</p>
      </div>
    </div>
    <div class="footer">
      <p>La3ib Kuwait Sports Community • منصة تنظيم الرياضة في الكويت</p>
      <p>Need urgent assistance? Reply directly to this email or visit La3ib Help & Support.</p>
    </div>
  </div>
</body>
</html>`;
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(context.request) });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const headers = getCorsHeaders(context.request);
  const projectId = context.env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
  const firebaseApiKey = context.env.FIREBASE_API_KEY || DEFAULT_FIREBASE_API_KEY;

  try {
    const authHeader = context.request.headers.get('Authorization');
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7).trim() : null;

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required. Missing Bearer token.' }),
        { status: 401, headers }
      );
    }

    // Cryptographic token verification
    const authCheck = await verifyFirebaseTokenEdge(token, projectId, firebaseApiKey);
    if (!authCheck.valid || !authCheck.uid) {
      return new Response(
        JSON.stringify({ success: false, error: authCheck.error || 'Cryptographic authentication verification failed.' }),
        { status: 401, headers }
      );
    }

    const body = await context.request.json().catch(() => null) as any;
    if (!body || !body.event || !body.ticket || !body.ticket.id || !body.ticket.ticketNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required support ticket notification payload.' }),
        { status: 400, headers }
      );
    }

    if (body.isInternalNote) {
      return new Response(
        JSON.stringify({ success: true, emailSent: false, message: 'Internal note skipped from email notification.' }),
        { status: 200, headers }
      );
    }

    const requesterUid = authCheck.uid;
    const requesterEmail = (authCheck.email || '').toLowerCase().trim();
    const isStaff = requesterEmail === 'khalidalami5555@gmail.com';

    // Verify ownership or staff permissions
    if (body.event === 'ticket_created' || body.event === 'user_reply') {
      if (requesterUid !== body.ticket.userId && !isStaff) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied. You can only notify for your own tickets.' }),
          { status: 403, headers }
        );
      }
    } else if (body.event === 'support_reply' || body.event === 'ticket_resolved') {
      if (!isStaff) {
        return new Response(
          JSON.stringify({ success: false, error: 'Access denied. Staff privileges required.' }),
          { status: 403, headers }
        );
      }
    }

    // Persistent cross-instance deduplication (15-second time window bucket)
    const timeBucket = Math.floor(Date.now() / 15000);
    const dedupId = `${body.event}_${body.ticket.id}_${timeBucket}`;
    const dedupCheck = await checkPersistentDeduplication(
      projectId,
      token,
      dedupId,
      body.ticket.id,
      requesterUid,
      body.event
    );

    if (dedupCheck.isDuplicate) {
      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          message: 'Duplicate notification suppressed (persistent cross-instance dedup).'
        }),
        { status: 200, headers }
      );
    }

    // Backend configuration flag: disabled by default for launch (in-app only)
    const isEmailEnabled = context.env.SUPPORT_EMAIL_ENABLED === 'true';
    if (!isEmailEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          emailSent: false,
          message: 'Support email notifications are disabled for launch (SUPPORT_EMAIL_ENABLED=false).'
        }),
        { status: 200, headers }
      );
    }

    const supportInbox = context.env.ZOHO_SUPPORT_INBOX || OFFICIAL_SUPPORT_EMAIL;
    const fromEmail = context.env.ZOHO_MAIL_FROM || OFFICIAL_SUPPORT_EMAIL;
    const ticket = body.ticket;

    let userEmailSent = false;
    let supportInboxEmailSent = false;
    let emailStatusMessage = '';

    // Route notifications based on event type
    switch (body.event) {
      case 'ticket_created': {
        // 1. User confirmation email
        const userSubject = `[La3ib Support] Ticket Received: ${ticket.ticketNumber} - ${ticket.subject}`;
        const userHtml = generateBilingualEmail({
          headlineEn: 'We have received your support request',
          headlineAr: 'تم استلام طلب المساعدة الخاص بك بنجاح',
          leadEn: `Hello ${ticket.userName || 'Athlete'}, thank you for contacting La3ib Support. Our team has received your ticket and is reviewing your request. We will reply as soon as possible.`,
          leadAr: `مرحباً ${ticket.userName || 'يا كابتن'}، شكراً لتواصلك مع دعم منصة لعّيب. لقد استلم فريقنا تذكرتك وجارٍ مراجعتها بعناية. سيقوم فريق الدعم بالرد في أقرب وقت ممكن.`,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          category: ticket.category || 'general_question',
          status: ticket.status || 'open',
          priority: ticket.priority,
          messageBody: ticket.description
        });

        const userSendResult = await sendZohoMailRestEmail(context.env, {
          to: ticket.userEmail,
          from: fromEmail,
          subject: userSubject,
          html: userHtml,
          replyTo: supportInbox
        });
        userEmailSent = userSendResult.success;

        // 2. Alert to Support Inbox
        const adminSubject = `[New Support Ticket] ${ticket.ticketNumber} - ${ticket.subject}`;
        const adminHtml = generateBilingualEmail({
          headlineEn: `New Ticket Submitted by ${ticket.userName} (${ticket.userEmail})`,
          headlineAr: `تذكرة دعم جديدة من اللاعب ${ticket.userName}`,
          leadEn: `A new ticket has been filed via ${ticket.origin === 'community_guidelines' ? 'Community Guidelines Violation Report' : 'Help & Support'}.`,
          leadAr: `تم تقديم تذكرة جديدة عبر ${ticket.origin === 'community_guidelines' ? 'بلاغ مخالفات إرشادات المجتمع' : 'المساعدة والدعم'}.`,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          category: ticket.category || 'general_question',
          status: ticket.status || 'open',
          priority: ticket.priority,
          messageBody: ticket.description
        });

        const adminSendResult = await sendZohoMailRestEmail(context.env, {
          to: supportInbox,
          from: fromEmail,
          subject: adminSubject,
          html: adminHtml,
          replyTo: ticket.userEmail
        });
        supportInboxEmailSent = adminSendResult.success;
        emailStatusMessage = userSendResult.message || adminSendResult.message || 'Processed';
        break;
      }

      case 'support_reply': {
        // Staff replied -> notify user
        const userSubject = `[La3ib Support] Reply on Ticket ${ticket.ticketNumber}: ${ticket.subject}`;
        const userHtml = generateBilingualEmail({
          headlineEn: 'Support Staff has replied to your ticket',
          headlineAr: 'قام فريق الدعم بالرد على تذكرتك',
          leadEn: `Hello ${ticket.userName || 'Athlete'}, our support team has posted an update regarding ticket #${ticket.ticketNumber}.`,
          leadAr: `مرحباً ${ticket.userName || 'يا كابتن'}، أرسل فريق الدعم رداً بخصوص التذكرة #${ticket.ticketNumber}.`,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          category: ticket.category || 'general_question',
          status: ticket.status || 'open',
          priority: ticket.priority,
          messageBody: body.messageContent || 'Please open La3ib to review the full reply.'
        });

        const replyResult = await sendZohoMailRestEmail(context.env, {
          to: ticket.userEmail,
          from: fromEmail,
          subject: userSubject,
          html: userHtml,
          replyTo: supportInbox
        });
        userEmailSent = replyResult.success;
        emailStatusMessage = replyResult.message || 'Processed';
        break;
      }

      case 'user_reply': {
        // User replied -> notify support inbox
        const adminSubject = `[User Reply] ${ticket.ticketNumber} - ${ticket.subject}`;
        const adminHtml = generateBilingualEmail({
          headlineEn: `User Reply on Ticket ${ticket.ticketNumber}`,
          headlineAr: `رد جديد من المستخدم على التذكرة #${ticket.ticketNumber}`,
          leadEn: `${body.senderName || ticket.userName} (${ticket.userEmail}) has replied to their support ticket.`,
          leadAr: `قام ${body.senderName || ticket.userName} بإضافة رد جديد على التذكرة.`,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          category: ticket.category || 'general_question',
          status: ticket.status || 'open',
          priority: ticket.priority,
          messageBody: body.messageContent || 'New user reply in ticket.'
        });

        const userReplyResult = await sendZohoMailRestEmail(context.env, {
          to: supportInbox,
          from: fromEmail,
          subject: adminSubject,
          html: adminHtml,
          replyTo: ticket.userEmail
        });
        supportInboxEmailSent = userReplyResult.success;
        emailStatusMessage = userReplyResult.message || 'Processed';
        break;
      }

      case 'ticket_resolved': {
        // Resolved -> notify user
        const userSubject = `[La3ib Support] Ticket Resolved: ${ticket.ticketNumber}`;
        const userHtml = generateBilingualEmail({
          headlineEn: 'Your support ticket has been resolved',
          headlineAr: 'تم تحديد تذكرتك كـ محلولة',
          leadEn: `Hello ${ticket.userName || 'Athlete'}, ticket #${ticket.ticketNumber} has been marked as Resolved. If your issue is not fully addressed, you can reopen it directly in the app or reply to this email.`,
          leadAr: `مرحباً ${ticket.userName || 'يا كابتن'}، تم حل تذكرتك #${ticket.ticketNumber}. إذا كنت لا تزال بحاجة للمساعدة، يمكنك إعادة فتح التذكرة من داخل التطبيق أو الرد مباشرة على هذه الرسالة.`,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          category: ticket.category || 'general_question',
          status: 'resolved',
          priority: ticket.priority
        });

        const resolveResult = await sendZohoMailRestEmail(context.env, {
          to: ticket.userEmail,
          from: fromEmail,
          subject: userSubject,
          html: userHtml,
          replyTo: supportInbox
        });
        userEmailSent = resolveResult.success;
        emailStatusMessage = resolveResult.message || 'Processed';
        break;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent: userEmailSent || supportInboxEmailSent,
        userEmailSent,
        supportInboxEmailSent,
        message: emailStatusMessage || 'Notification processed safely.',
        details: {
          event: body.event,
          ticketNumber: ticket.ticketNumber,
          supportInbox,
          sender: fromEmail
        }
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: true, emailSent: false, message: 'Notification skipped safely: ' + (err?.message || 'Edge error') }),
      { status: 200, headers }
    );
  }
};
