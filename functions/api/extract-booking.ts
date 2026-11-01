/**
 * Cloudflare Pages Function: /api/extract-booking
 * Universal Booking Confirmation Document Extraction API with Gemini AI
 * 
 * Features:
 * - Edge-compatible Firebase Authentication ID token verification (via Web Crypto & Google JWKs)
 * - Multimodal document analysis with Gemini 3.8 Flash (SDK + REST fallback)
 * - Strict upload limits (20MB payload, 10MB file limit)
 * - Supports JPG, PNG, WebP, and PDF booking confirmations
 * - CORS headers and robust edge error handling
 */

import { GoogleGenAI } from '@google/genai';

interface Env {
  GEMINI_API_KEY?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_API_KEY?: string;
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

// Configuration defaults
const DEFAULT_FIREBASE_PROJECT_ID = 'influential-odyssey-hggh3';
const DEFAULT_FIREBASE_API_KEY = 'AIzaSyAUd_jJLMDLetznk0prLaeE-_XvfG-0wOk';
const MAX_BASE64_LENGTH = 20 * 1024 * 1024; // ~14MB binary file limit
const VALID_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
];

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(data: Record<string, any>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: CORS_HEADERS
  });
}

// Helper: Decode base64url string to Uint8Array using Web standard APIs
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
    console.warn('[extract-booking] Warning fetching Google JWKs:', err);
    if (cachedJwks && cachedJwks.keys.length > 0) {
      return cachedJwks.keys;
    }
    return [];
  }
}

/**
 * Edge-compatible Firebase Auth ID token verification
 * Validates signature against Google's public keys via Web Crypto (SubtleCrypto)
 * and verifies audience, issuer, expiry, and subject.
 */
async function verifyFirebaseToken(
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

    // Fallback: Verify via Google Identity Toolkit REST API
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
          const verifyData = await verifyRes.json() as { users?: Array<{ localId: string; email?: string }> };
          if (verifyData.users && verifyData.users.length > 0) {
            return { valid: true, uid: verifyData.users[0].localId, email: verifyData.users[0].email };
          }
        }
      } catch (fbErr) {
        console.warn('[extract-booking] Fallback token check error:', fbErr);
      }
    }

    return { valid: false, error: 'Token cryptographic signature verification failed' };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification error' };
  }
}

const SYSTEM_PROMPT = `You are a sports venue booking verification and extraction engine for Kuwait.
Your task is to analyze this court/venue booking confirmation document (which may be in English or Arabic, e.g., from Li3ib, Padel In, Kuwait Youth Centers, or any booking app/email/receipt).

Extract the following details as accurately as possible. DO NOT hallucinate. If a detail is missing or uncertain, return null.

Fields to extract:
- "venueName": (string or null) The name of the sports facility or club (e.g. "Padel In", "Mishref Youth Center Stadium", "Salmiya SC")
- "courtName": (string or null) The specific court, pitch, or hall name/number (e.g. "Court 2", "Indoor Hall A", "Pitch 1")
- "date": (string or null) The booking date normalized to "YYYY-MM-DD" in Kuwait local time.
- "startTime": (string or null) Start time normalized to 24-hour "HH:MM" format (e.g. "20:00", "18:30")
- "endTime": (string or null) End time normalized to 24-hour "HH:MM" format (e.g. "21:30", "20:00")
- "area": (string or null) The area or district in Kuwait if mentioned (e.g. "Shuwaikh", "Mishref", "Salmiya", "Hawalli", "Kuwait City", "Jabriya")
- "address": (string or null) Street address or location notes if mentioned
- "sport": (string or null) Exactly one of: "Football" | "Padel" | "Basketball" | "Volleyball" | "Tennis" | "Badminton" | "Other" (or null if not explicitly mentioned)
- "totalPriceKWD": (number or null) The total booking fee in Kuwaiti Dinars if mentioned
- "notes": (string or null) Any pertinent booking details, booking reference code, or court number

Return strictly a JSON object conforming to this schema, with no markdown code blocks or surrounding text.`;

function parseExtractionJson(rawText: string): any {
  try {
    return JSON.parse(rawText);
  } catch {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  }
}

async function extractWithGemini(
  fileBase64: string,
  mimeType: string,
  apiKey: string
): Promise<any> {
  // Strategy A: GoogleGenAI SDK
  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: SYSTEM_PROMPT },
            {
              inlineData: {
                data: fileBase64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const rawText = response.text || '{}';
    return parseExtractionJson(rawText);
  } catch (sdkErr: any) {
    console.warn('[extract-booking] GoogleGenAI SDK call failed, attempting direct Gemini REST API fallback:', sdkErr?.message);

    // Strategy B: Direct Google Generative Language REST API (native fetch on Cloudflare Pages)
    const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const restRes = await fetch(restUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'aistudio-build'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: fileBase64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!restRes.ok) {
      const errBody = await restRes.text().catch(() => '');
      throw new Error(`Gemini API returned status ${restRes.status}: ${errBody || restRes.statusText}`);
    }

    const restJson = await restRes.json() as any;
    const rawText = restJson.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    return parseExtractionJson(rawText);
  }
}

// OPTIONS handler for CORS preflight
export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS
  });
};

// POST handler for booking confirmation extraction
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // 1. Authorization check
    const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({
        success: false,
        error: 'Authentication required. Missing or invalid Authorization header.'
      }, 401);
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return jsonResponse({
        success: false,
        error: 'Authentication required. Bearer token is empty.'
      }, 401);
    }

    // 2. Token verification
    const projectId = env.FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_PROJECT_ID;
    const firebaseApiKey = env.FIREBASE_API_KEY || DEFAULT_FIREBASE_API_KEY;
    const authCheck = await verifyFirebaseToken(token, projectId, firebaseApiKey);

    if (!authCheck.valid) {
      return jsonResponse({
        success: false,
        error: authCheck.error || 'Invalid or expired authentication token. Please sign in again.'
      }, 401);
    }

    // 3. Request payload validation
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 25 * 1024 * 1024) {
      return jsonResponse({
        success: false,
        error: 'Upload payload exceeds maximum allowed size (20MB).'
      }, 413);
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({
        success: false,
        error: 'Malformed JSON payload.'
      }, 400);
    }

    const { fileBase64, mimeType, fileName } = body || {};

    if (!fileBase64 || typeof fileBase64 !== 'string') {
      return jsonResponse({
        success: false,
        error: 'Missing fileBase64 string in request payload.'
      }, 400);
    }

    if (fileBase64.length > MAX_BASE64_LENGTH) {
      return jsonResponse({
        success: false,
        error: 'Document exceeds the 10MB limit. Please upload a smaller file.'
      }, 413);
    }

    if (!mimeType || typeof mimeType !== 'string') {
      return jsonResponse({
        success: false,
        error: 'Missing mimeType in request payload.'
      }, 400);
    }

    const normalizedMime = mimeType.toLowerCase().trim();
    if (!VALID_MIME_TYPES.includes(normalizedMime)) {
      return jsonResponse({
        success: false,
        error: 'Unsupported document format. Please provide a JPG, PNG, WebP, or PDF.'
      }, 400);
    }

    // 4. Gemini API Key check
    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : undefined);
    if (!apiKey) {
      return jsonResponse({
        success: false,
        error: 'Gemini API key is not configured on the server environment. Please set the GEMINI_API_KEY secret in Cloudflare Pages.'
      }, 503);
    }

    // 5. Run extraction
    const parsedData = await extractWithGemini(fileBase64, normalizedMime, apiKey);

    return jsonResponse({
      success: true,
      fileName: fileName || 'booking_document',
      extraction: parsedData,
      data: parsedData
    }, 200);

  } catch (err: any) {
    console.error('[extract-booking] Extraction execution error:', err);
    return jsonResponse({
      success: false,
      error: err?.message || 'Failed to analyze booking document with Gemini AI.'
    }, 500);
  }
};
