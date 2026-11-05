/**
 * Cloudflare Pages Function: /api/admin/check-coming-soon-bypass
 * Validates existing bypass tokens or cookies
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

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  'Access-Control-Max-Age': '86400'
};

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
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

async function verifyToken(secret: string, token: string): Promise<{ valid: boolean; email?: string; uid?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [data, signature] = parts;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const expectedBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    const expectedSig = base64UrlEncode(new Uint8Array(expectedBuffer));
    if (signature !== expectedSig) return { valid: false };

    const payloadBytes = base64UrlDecode(data);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const payload = JSON.parse(payloadStr);

    if (Date.now() > payload.exp) return { valid: false };
    return { valid: true, email: payload.email, uid: payload.uid };
  } catch {
    return { valid: false };
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const secret = env.ADMIN_BYPASS_SECRET || DEFAULT_SECRET;

  try {
    let token: string | null = null;

    // Check Authorization header
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    // Check Cookie header
    if (!token) {
      const cookieHeader = request.headers.get('cookie') || '';
      const match = cookieHeader.match(/la3ib_admin_session=([^;]+)/);
      if (match && match[1]) {
        token = match[1].trim();
      }
    }

    // Check JSON body
    if (!token) {
      try {
        const body: any = await request.json();
        if (body?.token) token = body.token.trim();
      } catch {}
    }

    if (!token) {
      return new Response(JSON.stringify({ valid: false }), { status: 200, headers: CORS_HEADERS });
    }

    const result = await verifyToken(secret, token);
    return new Response(JSON.stringify(result), { status: 200, headers: CORS_HEADERS });
  } catch {
    return new Response(JSON.stringify({ valid: false }), { status: 200, headers: CORS_HEADERS });
  }
};
