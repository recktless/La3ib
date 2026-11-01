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

// Universal Booking Confirmation Document Extraction API
app.post('/api/extract-booking', async (req, res) => {
  try {
    const { fileBase64, mimeType, fileName } = req.body;
    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing fileBase64 or mimeType in request payload' 
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
        error: 'Gemini API key is not configured on the server environment.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

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
