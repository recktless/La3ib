/**
 * Cloudflare Pages Function: /api/admin/logout
 * Clears administrator session cookie
 */

interface Env {
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

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  return new Response(null, { status: 204, headers: getCorsHeaders(context.request) });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const headers = getCorsHeaders(context.request);
  headers.append(
    'Set-Cookie',
    'la3ib_admin_session=; Path=/; Secure; SameSite=Lax; Max-Age=0; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  );
  return new Response(
    JSON.stringify({ success: true, message: 'Administrator session cleared successfully.' }),
    { status: 200, headers }
  );
};
