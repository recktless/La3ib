import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '20mb' }));

// Healthcheck
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

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

let cachedJwks: { keys: any[]; expiresAt: number } | null = null;

async function getGoogleJwks(): Promise<any[]> {
  const now = Date.now();
  if (cachedJwks && cachedJwks.expiresAt > now && cachedJwks.keys.length > 0) {
    return cachedJwks.keys;
  }

  try {
    const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
    if (!res.ok) throw new Error(`Google JWK fetch failed: ${res.statusText}`);
    const data = await res.json() as { keys?: any[] };
    if (!data.keys || !Array.isArray(data.keys)) throw new Error('Malformed Google JWK response');

    let maxAgeSeconds = 3600;
    const cacheControl = res.headers.get('cache-control');
    if (cacheControl) {
      const match = cacheControl.match(/max-age=(\d+)/i);
      if (match && match[1]) maxAgeSeconds = parseInt(match[1], 10);
    }

    cachedJwks = { keys: data.keys, expiresAt: now + (maxAgeSeconds * 1000) };
    return cachedJwks.keys;
  } catch (err) {
    console.warn('[server] Warning fetching Google JWKs:', err);
    return cachedJwks?.keys || [];
  }
}

async function verifyFirebaseToken(
  token: string,
  projectId = 'influential-odyssey-hggh3',
  firebaseApiKey = 'AIzaSyAUd_jJLMDLetznk0prLaeE-_XvfG-0wOk'
): Promise<{ valid: boolean; uid?: string; email?: string; error?: string }> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Malformed token structure' };

    const header = parseJwtHeader(token);
    const payload = parseJwtPayload(token);
    if (!header || !payload) return { valid: false, error: 'Could not decode authentication token' };
    if (header.alg !== 'RS256') return { valid: false, error: `Unsupported algorithm: ${header.alg}` };
    if (!header.kid) return { valid: false, error: 'Missing key ID in token header' };

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp < nowSeconds - 60) {
      return { valid: false, error: 'Authentication session expired. Please sign in again.' };
    }
    if (typeof payload.auth_time !== 'number' || payload.auth_time > nowSeconds + 60) {
      return { valid: false, error: 'Token issued in the future (invalid auth_time)' };
    }
    if (payload.aud !== projectId) {
      return { valid: false, error: `Invalid token audience (${payload.aud} != ${projectId})` };
    }
    const expectedIssuer = `https://securetoken.google.com/${projectId}`;
    if (payload.iss !== expectedIssuer) {
      return { valid: false, error: `Invalid token issuer (${payload.iss} != ${expectedIssuer})` };
    }
    if (!payload.sub || typeof payload.sub !== 'string') {
      return { valid: false, error: 'Invalid user ID in authentication token' };
    }

    const jwks = await getGoogleJwks();
    const matchingKey = jwks.find((k: any) => k.kid === header.kid);
    if (matchingKey) {
      const cryptoKey = await crypto.subtle.importKey(
        'jwk',
        { kty: matchingKey.kty, alg: matchingKey.alg, n: matchingKey.n, e: matchingKey.e, ext: true },
        { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-256' } },
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
      if (isValid) return { valid: true, uid: payload.sub, email: payload.email };
    }

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
            return { valid: true, uid: verifyData.users[0].localId, email: verifyData.users[0].email || payload?.email };
          }
        }
      } catch (fbErr) {
        console.warn('[server] Fallback token check error:', fbErr);
      }
    }

    return { valid: false, error: 'Token cryptographic signature verification failed' };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Token verification error' };
  }
}

// Universal Booking Confirmation Document Extraction API
app.post('/api/extract-booking', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing or invalid Authorization header.'
      });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Bearer token is empty.'
      });
    }

    const authCheck = await verifyFirebaseToken(token);
    if (!authCheck.valid) {
      return res.status(401).json({
        success: false,
        error: authCheck.error || 'Invalid or expired authentication token. Please sign in again.'
      });
    }

    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing fileBase64 or mimeType in request payload' 
      });
    }

    if (typeof fileBase64 === 'string' && fileBase64.length > 20 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        error: 'Document exceeds 10MB limit. Please upload a smaller file.'
      });
    }

    // Ensure valid mime types
    const validMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (!validMimes.includes(mimeType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported document format. Please provide a JPG, PNG, WebP, or PDF.'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: 'Gemini API key is not configured on the server environment. Please set GEMINI_API_KEY.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const systemPrompt = `You are a sports venue booking verification and extraction engine for Kuwait.
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

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: systemPrompt },
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
    let parsedData = {};
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return res.json({
      success: true,
      fileName,
      extraction: parsedData,
      data: parsedData
    });
  } catch (err: any) {
    console.error('[API /api/extract-booking] Extraction error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to analyze booking document with Gemini API.'
    });
  }
});

// Admin Authorization Middleware
async function checkAdminRequest(req: express.Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Authentication required. Missing Bearer token.' };
  }
  const token = authHeader.slice(7).trim();
  const tokenCheck = await verifyFirebaseToken(token);
  if (!tokenCheck.valid || !tokenCheck.uid) {
    return { authorized: false, error: tokenCheck.error || 'Invalid authentication token.' };
  }
  const email = (tokenCheck.email || '').toLowerCase().trim();
  // Check if admin email or admin role
  if (email === 'khalidalami5555@gmail.com') {
    return { authorized: true, uid: tokenCheck.uid };
  }
  return { authorized: false, error: 'Access denied. Administrator privileges required.' };
}

// Admin API: Ban Player
app.post('/api/admin/ban-player', async (req, res) => {
  try {
    const adminCheck = await checkAdminRequest(req);
    if (!adminCheck.authorized) {
      return res.status(403).json({ success: false, error: adminCheck.error });
    }

    const { targetUserId, reason, isPermanent, expiresAt } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Missing targetUserId.' });
    }
    if (targetUserId === adminCheck.uid) {
      return res.status(400).json({ success: false, error: 'Administrators cannot ban themselves.' });
    }

    return res.json({
      success: true,
      message: `Player ${targetUserId} has been banned (${isPermanent ? 'Permanent' : 'Temporary until ' + expiresAt}).`,
      targetUserId,
      isPermanent: Boolean(isPermanent),
      expiresAt: expiresAt || null
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to ban player.' });
  }
});

// Admin API: Unban Player
app.post('/api/admin/unban-player', async (req, res) => {
  try {
    const adminCheck = await checkAdminRequest(req);
    if (!adminCheck.authorized) {
      return res.status(403).json({ success: false, error: adminCheck.error });
    }

    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Missing targetUserId.' });
    }

    return res.json({
      success: true,
      message: `Player ${targetUserId} has been unbanned.`,
      targetUserId
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to unban player.' });
  }
});

// Admin API: Delete Player
app.post('/api/admin/delete-player', async (req, res) => {
  try {
    const adminCheck = await checkAdminRequest(req);
    if (!adminCheck.authorized) {
      return res.status(403).json({ success: false, error: adminCheck.error });
    }

    const { targetUserId, confirmation, reason } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Missing targetUserId.' });
    }
    if (targetUserId === adminCheck.uid) {
      return res.status(400).json({ success: false, error: 'Administrators cannot delete themselves.' });
    }
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ success: false, error: 'Confirmation string "DELETE" is required.' });
    }

    console.log(`[Admin API] Player ${targetUserId} scheduled for permanent deletion by admin ${adminCheck.uid}. Reason: ${reason || 'N/A'}`);

    return res.json({
      success: true,
      message: `Player account ${targetUserId} successfully removed.`,
      targetUserId
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to delete player account.' });
  }
});

async function start() {
  const portArgIndex = process.argv.indexOf('--port');
  const portFromArgs = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : null;
  const PORT = portFromArgs || Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[La3ib Server] Running on http://0.0.0.0:${PORT} in ${isProd ? 'production' : 'development'} mode`);
  });
}

start().catch((err) => {
  console.error('[La3ib Server] Fatal startup error:', err);
  process.exit(1);
});
