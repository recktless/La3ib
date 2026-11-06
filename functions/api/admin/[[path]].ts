/**
 * Cloudflare Pages Function: /api/admin/[[path]]
 * Edge-compatible catch-all for administrative action endpoints
 */

interface Env {
  ADMIN_BYPASS_SECRET?: string;
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

const DEFAULT_SECRET = 'la3ib_admin_bypass_secret_4709_kw_secure';
const AUTHORIZED_ADMIN_EMAIL = 'khalidalami5555@gmail.com';

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

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

async function verifyToken(secret: string, token: string): Promise<boolean> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [data, signature] = parts;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify']
    );
    const sigBytes = base64UrlDecode(signature);
    const dataBytes = enc.encode(data);
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes as unknown as BufferSource, dataBytes as unknown as BufferSource);
    if (!isValid) return false;

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(data)));
    return typeof payload.exp === 'number' && Date.now() <= payload.exp && payload.email?.toLowerCase().trim() === AUTHORIZED_ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(context.request) });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const secret = env.ADMIN_BYPASS_SECRET || DEFAULT_SECRET;
  const headers = getCorsHeaders(request);
  const actionPath = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');

  // Handle logout action
  if (actionPath === 'logout') {
    headers.append(
      'Set-Cookie',
      'la3ib_admin_session=; Path=/; Secure; SameSite=Lax; Max-Age=0; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
    );
    return new Response(
      JSON.stringify({ success: true, message: 'Logged out successfully.' }),
      { status: 200, headers }
    );
  }

  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    const cookieHeader = request.headers.get('cookie') || '';
    const match = cookieHeader.match(/la3ib_admin_session=([^;]+)/);
    if (match) token = match[1].trim();
  }

  if (!token) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required. Missing Bearer token or session.' }),
      { status: 401, headers }
    );
  }

  const isAuthorized = await verifyToken(secret, token);
  if (!isAuthorized) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized: Invalid or expired administrator session.' }),
      { status: 403, headers }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  return new Response(
    JSON.stringify({
      success: true,
      action: actionPath,
      message: `Administrator action /api/admin/${actionPath} executed successfully.`,
      ...body
    }),
    { status: 200, headers }
  );
};
