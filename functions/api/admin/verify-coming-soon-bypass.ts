/**
 * Cloudflare Pages Function: /api/admin/verify-coming-soon-bypass
 * Edge-compatible Administrator Password Verification Endpoint
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
  headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
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
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createHmacSignature(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return base64UrlEncode(new Uint8Array(signatureBuffer));
}

async function generateBypassToken(secret: string): Promise<string> {
  const payload = {
    role: 'website_visitor',
    access: true,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const enc = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const data = base64UrlEncode(enc.encode(payloadJson));
  const signature = await createHmacSignature(secret, data);
  return `${data}.${signature}`;
}

// In-memory rate limiting map for edge worker instance
const attemptMap = new Map<string, { attempts: number; blockedUntil: number }>();

function getClientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'anonymous';
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request)
  });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const secret = env.ADMIN_BYPASS_SECRET || DEFAULT_SECRET;
  const headers = getCorsHeaders(request);
  const clientIp = getClientIp(request);
  const now = Date.now();

  const record = attemptMap.get(clientIp);
  if (record && record.blockedUntil > now) {
    const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
    return new Response(
      JSON.stringify({
        success: false,
        rateLimited: true,
        error: `Too many failed attempts. Please wait ${remainingMinutes} minute(s) before trying again.`,
        errorAr: `محاولات خاطئة متكررة. يرجى الانتظار لمدة ${remainingMinutes} دقيقة قبل المحاولة مرة أخرى.`
      }),
      { status: 429, headers }
    );
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid JSON request payload.',
        errorAr: 'حمولة الطلب غير صالحة.'
      }),
      { status: 400, headers }
    );
  }

  const { password } = body || {};

  // Strict check for password '4709'
  if (password !== '4709') {
    const current = record || { attempts: 0, blockedUntil: 0 };
    current.attempts += 1;
    if (current.attempts >= 5) {
      current.blockedUntil = now + 15 * 60 * 1000; // 15 mins block
    }
    attemptMap.set(clientIp, current);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Incorrect administrator bypass password.',
        errorAr: 'رمز الدخول الخاص بالإدارة غير صحيح.'
      }),
      { status: 401, headers }
    );
  }

  // Clear rate limit record on success
  attemptMap.delete(clientIp);

  const bypassToken = await generateBypassToken(secret);

  headers.append(
    'Set-Cookie',
    `la3ib_admin_session=${bypassToken}; Path=/; Secure; SameSite=Lax; Max-Age=86400; HttpOnly`
  );

  return new Response(
    JSON.stringify({
      success: true,
      bypassToken,
      message: 'Website access granted.'
    }),
    { status: 200, headers }
  );
};
