import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { moderateText } from './src/lib/contentModeration.ts';
import { sendSupportEmail } from './src/lib/supportMail.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Universal CORS & Preflight Middleware for Mobile & Cross-Origin Compatibility
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(express.json({ limit: '20mb' }));

// Custom middleware to ensure JSON syntax errors return valid JSON instead of HTML
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON request payload.',
      errorAr: 'حمولة الطلب غير صالحة.'
    });
  }
  next(err);
});

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

// Admin Authorization Middleware - ONLY authorizes authentic Firebase admin user
async function checkAdminRequest(req: express.Request): Promise<{ authorized: boolean; uid?: string; error?: string }> {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7).trim() : null;

  if (!token) {
    return { authorized: false, error: 'Authentication required. Missing Bearer token.' };
  }

  // Verify Firebase Auth ID token
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

// Content Moderation API
app.post('/api/moderate-content', async (req, res) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Text field must be a string' });
    }
    const result = moderateText(text);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Moderation check failed.' });
  }
});

// Admin API: Edit Game
app.post('/api/admin/edit-game', async (req, res) => {
  try {
    const adminCheck = await checkAdminRequest(req);
    if (!adminCheck.authorized) {
      return res.status(403).json({ success: false, error: adminCheck.error });
    }

    const { gameId, updates, reason } = req.body;
    if (!gameId) {
      return res.status(400).json({ success: false, error: 'Missing gameId.' });
    }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing or invalid updates payload.' });
    }

    // Capacity validation if maxPlayers is changed
    if (updates.maxPlayers !== undefined) {
      const maxP = Number(updates.maxPlayers);
      if (isNaN(maxP) || maxP < 2 || maxP > 50) {
        return res.status(400).json({ success: false, error: 'Maximum player capacity must be between 2 and 50.' });
      }
    }

    // Content moderation validation on game title / description
    if (updates.title) {
      const mod = moderateText(updates.title);
      if (!mod.allowed) {
        return res.status(400).json({ success: false, error: mod.explanationEn || 'Game title violates safety guidelines.' });
      }
    }
    if (updates.description) {
      const mod = moderateText(updates.description);
      if (!mod.allowed) {
        return res.status(400).json({ success: false, error: mod.explanationEn || 'Game description violates safety guidelines.' });
      }
    }

    const modifiedFields = Object.keys(updates);
    console.log(`[Admin API] Game ${gameId} updated by admin ${adminCheck.uid}. Fields: ${modifiedFields.join(', ')}. Reason: ${reason || 'N/A'}`);

    return res.json({
      success: true,
      message: `Game ${gameId} parameters successfully updated by administrator.`,
      gameId,
      modifiedFields,
      adminUid: adminCheck.uid
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to update game.' });
  }
});

// Admin API: Moderate Player Profile (Strictly public, non-sensitive content only)
app.post('/api/admin/moderate-player-profile', async (req, res) => {
  try {
    const adminCheck = await checkAdminRequest(req);
    if (!adminCheck.authorized) {
      return res.status(403).json({ success: false, error: adminCheck.error });
    }

    const { targetUserId, updates, reason } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Missing targetUserId.' });
    }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: 'Missing or invalid updates payload.' });
    }

    // Strictly prohibited fields:
    const prohibitedFields = ['email', 'phone', 'password', 'age', 'privacy', 'uid', 'id', 'username', 'role', 'isAdmin'];
    const invalidKeys = Object.keys(updates).filter(k => prohibitedFields.includes(k));
    if (invalidKeys.length > 0) {
      return res.status(403).json({
        success: false,
        error: `Administrator access violation: cannot access or modify restricted private fields: ${invalidKeys.join(', ')}.`
      });
    }

    // Permitted fields only:
    const allowedFields = ['name', 'bio', 'avatar', 'favoriteSports', 'skills'];
    const sanitizedUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        sanitizedUpdates[key] = updates[key];
      }
    }

    if (sanitizedUpdates.name) {
      const mod = moderateText(sanitizedUpdates.name);
      if (!mod.allowed) {
        return res.status(400).json({ success: false, error: mod.explanationEn || 'Display name violates safety guidelines.' });
      }
    }
    if (sanitizedUpdates.bio) {
      const mod = moderateText(sanitizedUpdates.bio);
      if (!mod.allowed) {
        return res.status(400).json({ success: false, error: mod.explanationEn || 'Bio violates safety guidelines.' });
      }
    }

    const modifiedFields = Object.keys(sanitizedUpdates);
    console.log(`[Admin API] Player ${targetUserId} profile moderated by admin ${adminCheck.uid}. Fields: ${modifiedFields.join(', ')}. Reason: ${reason || 'N/A'}`);

    return res.json({
      success: true,
      message: `Player ${targetUserId} public profile moderated successfully.`,
      targetUserId,
      modifiedFields,
      adminUid: adminCheck.uid
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to moderate player profile.' });
  }
});

// Admin API: Cancel Game
app.post('/api/admin/cancel-game', async (req, res) => {
  try {
    const adminCheck = await checkAdminRequest(req);
    if (!adminCheck.authorized) {
      return res.status(403).json({ success: false, error: adminCheck.error });
    }

    const { gameId, reason } = req.body || {};
    if (!gameId) {
      return res.status(400).json({ success: false, error: 'Missing gameId.' });
    }

    console.log(`[Admin API] Game ${gameId} cancelled by admin ${adminCheck.uid}. Reason: ${reason || 'Administrative action'}`);
    return res.json({
      success: true,
      message: `Game ${gameId} cancelled successfully by administrator.`,
      gameId,
      adminUid: adminCheck.uid
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to cancel game.' });
  }
});

// Admin API: Set Athlete Organizing Status
app.post('/api/admin/set-organizing-status', async (req, res) => {
  try {
    const adminCheck = await checkAdminRequest(req);
    if (!adminCheck.authorized) {
      return res.status(403).json({ success: false, error: adminCheck.error });
    }

    const { targetUserId, canOrganize, reason } = req.body || {};
    if (!targetUserId) {
      return res.status(400).json({ success: false, error: 'Missing targetUserId.' });
    }

    console.log(`[Admin API] User ${targetUserId} canOrganize set to ${Boolean(canOrganize)} by admin ${adminCheck.uid}. Reason: ${reason || 'N/A'}`);
    return res.json({
      success: true,
      message: `Organizer status for ${targetUserId} set to ${Boolean(canOrganize)}.`,
      targetUserId,
      canOrganize: Boolean(canOrganize),
      adminUid: adminCheck.uid
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to set organizing status.' });
  }
});

// In-memory rate limiting map for Coming Soon Admin Bypass attempts
const bypassAttemptMap = new Map<string, { attempts: number; blockedUntil: number }>();
const BYPASS_SECRET = process.env.ADMIN_BYPASS_SECRET || 'la3ib_admin_bypass_secret_4709_kw_secure';

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function generateAdminBypassToken(): string {
  const payload = {
    role: 'website_visitor',
    access: true,
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', BYPASS_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyAdminBypassToken(token: string): { valid: boolean } {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };
    const [data, signature] = parts;
    const expectedSignature = crypto.createHmac('sha256', BYPASS_SECRET).update(data).digest('base64url');
    if (signature !== expectedSignature) return { valid: false };
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (Date.now() > payload.exp) return { valid: false };
    return { valid: true };
  } catch {
    return { valid: false };
  }
}

// Website Early Access API: Password verification establishing visitor website session
app.post('/api/admin/verify-coming-soon-bypass', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const clientIp = getClientIp(req);
    const now = Date.now();
    const record = bypassAttemptMap.get(clientIp);

    if (record && record.blockedUntil > now) {
      const remainingMinutes = Math.ceil((record.blockedUntil - now) / 60000);
      return res.status(429).json({
        success: false,
        rateLimited: true,
        error: `Too many failed attempts. Please wait ${remainingMinutes} minute(s) before trying again.`,
        errorAr: `محاولات خاطئة متكررة. يرجى الانتظار لمدة ${remainingMinutes} دقيقة قبل المحاولة مرة أخرى.`
      });
    }

    const { password } = req.body || {};

    // 1. Check password securely
    if (password !== '4709') {
      const current = record || { attempts: 0, blockedUntil: 0 };
      current.attempts += 1;
      if (current.attempts >= 5) {
        current.blockedUntil = now + 15 * 60 * 1000; // 15 mins block
      }
      bypassAttemptMap.set(clientIp, current);
      return res.status(401).json({
        success: false,
        error: 'Incorrect administrator bypass password.',
        errorAr: 'رمز الدخول الخاص بالإدارة غير صحيح.'
      });
    }

    // Success: Clear rate-limit attempts
    bypassAttemptMap.delete(clientIp);

    // Generate cryptographic token granting website early access
    const bypassToken = generateAdminBypassToken();
    console.log(`[Website Access] Visitor granted early access via password.`);

    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    res.setHeader('Set-Cookie', `la3ib_admin_session=${bypassToken}; Path=/; SameSite=Lax; Max-Age=86400; HttpOnly${isSecure ? '; Secure' : ''}`);

    return res.status(200).json({
      success: true,
      bypassToken,
      message: 'Website access granted.'
    });
  } catch (err: any) {
    console.error('[Website Access] Server verification unexpected error:', err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred during password verification.',
      errorAr: 'حدث خطأ غير متوقع في الخادم أثناء التحقق.'
    });
  }
});

// Website Early Access API: Validate existing website access session
app.post('/api/admin/check-coming-soon-bypass', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const cookieMatch = req.headers.cookie?.match(/la3ib_admin_session=([^;]+)/);
    const cookieToken = cookieMatch ? cookieMatch[1].trim() : null;
    const token = req.body?.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7).trim() : null) || cookieToken;

    if (!token) {
      return res.status(200).json({ valid: false });
    }
    const result = verifyAdminBypassToken(token);
    return res.status(200).json({ valid: result.valid });
  } catch (err: any) {
    console.error('[Website Access] Server check unexpected error:', err);
    return res.status(200).json({ valid: false });
  }
});

// Admin Bypass API: Clear existing admin bypass session
app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.setHeader(
    'Set-Cookie',
    `la3ib_admin_session=; Path=/; SameSite=Lax; Max-Age=0; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT${isSecure ? '; Secure' : ''}`
  );
  return res.status(200).json({ success: true, message: 'Administrator session cleared successfully.' });
});

// Support notification duplicate tracking & rate limiting
const supportNotificationCache = new Map<string, number>();

// Support Ticket System: Zoho Mail Transactional Notification API
app.post('/api/support/notify', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.slice(7).trim() : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Missing Bearer token.'
      });
    }

    const tokenCheck = await verifyFirebaseToken(token);
    if (!tokenCheck.valid || !tokenCheck.uid) {
      return res.status(401).json({
        success: false,
        error: tokenCheck.error || 'Invalid authentication token.'
      });
    }

    const { event, ticket, messageContent, senderName, isInternalNote } = req.body || {};

    if (!event || !ticket || !ticket.id || !ticket.ticketNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required support ticket notification payload.'
      });
    }

    if (isInternalNote) {
      return res.status(200).json({
        success: true,
        emailSent: false,
        message: 'Internal note skipped from email notification.'
      });
    }

    const isStaff = (tokenCheck.email || '').toLowerCase().trim() === 'khalidalami5555@gmail.com';

    // Verify permissions based on event
    if (event === 'ticket_created' || event === 'user_reply') {
      if (tokenCheck.uid !== ticket.userId && !isStaff) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. You can only dispatch notifications for your own support tickets.'
        });
      }
    } else if (event === 'support_reply' || event === 'ticket_resolved') {
      if (!isStaff) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Only authorized support staff can dispatch staff notification emails.'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported support notification event.'
      });
    }

    // Deduplication (15s bucket per ticket+event)
    const timeBucket = Math.floor(Date.now() / 15000);
    const cacheKey = `${event}_${ticket.id}_${timeBucket}`;
    if (supportNotificationCache.has(cacheKey)) {
      return res.status(200).json({
        success: true,
        emailSent: false,
        message: 'Duplicate notification suppressed (persistent dedup).'
      });
    }
    supportNotificationCache.set(cacheKey, Date.now());

    if (supportNotificationCache.size > 2000) {
      const now = Date.now();
      for (const [k, time] of supportNotificationCache.entries()) {
        if (now - time > 60000) supportNotificationCache.delete(k);
      }
    }

    // Backend configuration flag: disabled by default for launch (in-app only)
    const isEmailEnabled = process.env.SUPPORT_EMAIL_ENABLED === 'true';
    if (!isEmailEnabled) {
      return res.status(200).json({
        success: true,
        emailSent: false,
        message: 'Support email notifications are disabled for launch (SUPPORT_EMAIL_ENABLED=false).'
      });
    }

    const safeTicket = {
      ...ticket,
      status: ticket.status === 'in_progress' ? 'open' : (ticket.status === 'closed' ? 'resolved' : ticket.status)
    };

    const result = await sendSupportEmail({
      event,
      ticket: safeTicket,
      messageContent,
      senderName,
      isInternalNote: false
    });

    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Support Notification API] Unexpected error sending email:', err);
    return res.status(200).json({
      success: true,
      emailSent: false,
      message: 'Email service error recorded safely: ' + (err?.message || 'Unknown error')
    });
  }
});

// Dynamic Open Graph and direct invite endpoint for /game/:gameId
app.get('/game/:gameId', async (req, res, next) => {
  const { gameId } = req.params;
  const isProd = process.env.NODE_ENV === 'production';
  const userAgent = req.headers['user-agent'] || '';
  const isSocialCrawler = /facebookexternalhit|whatsapp|telegrambot|twitterbot|slackbot|discordbot|applebot|linkedinbot/i.test(userAgent);
  const title = `Join Match on La3ib | لاعب`;
  const description = `Join pickup games and court bookings in Kuwait on La3ib. Stable invitation link: https://la3ibkw.com/game/${encodeURIComponent(gameId)}`;
  const url = `https://la3ibkw.com/game/${encodeURIComponent(gameId)}`;

  if (isSocialCrawler) {
    const crawlerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${url}" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:site_name" content="La3ib | لاعب" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
</head>
<body>
  <p>${description}</p>
  <p><a href="${url}">Open Game in La3ib</a></p>
</body>
</html>`;
    return res.status(200).type('html').send(crawlerHtml);
  }

  if (isProd) {
    try {
      const fs = await import('fs/promises');
      const indexPath = path.resolve(__dirname, 'dist', 'index.html');
      let html = await fs.readFile(indexPath, 'utf-8');
      html = html
        .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
        .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${title}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${description}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/, `<meta name="twitter:title" content="${title}" />`);
      return res.send(html);
    } catch {
      return next();
    }
  }
  next();
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
