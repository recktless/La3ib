/**
 * Centralized Content Moderation Utility for La3ib
 * Supports:
 * - Multilingual moderation: English, Arabic (Standard & Gulf/Levant/Egyptian colloquial), and Arabizi (3arabizi).
 * - Character repetition collapsing (e.g. "shhhhiiit" -> "shit", "ككككس" -> "كس", "3eeeeer" -> "3er").
 * - Symbol/separator bypass detection (e.g. "k.s.o.m.k", "s-h-i-t", "f*u*c*k").
 * - Anti-false positive protection for sports terminology (e.g. "pass", "shoot", "attack", "defense", "padel", "match", "kick", "goal", "court", "شوت", "هدف", "تمريرة", "هجوم", "دفاع").
 * - Anti-spam & message rate limiting.
 */

export interface ModerationResult {
  isValid: boolean;
  violationReason?: string;
  violationReasonAr?: string;
  category?: 'profanity' | 'harassment' | 'hate_speech' | 'spam' | 'rate_limit';
}

// Normalized sports terms allowlist to prevent false positives
const SPORTS_ALLOWLIST = new Set([
  'pass', 'shoot', 'shooting', 'attack', 'attacker', 'defense', 'defender', 
  'padel', 'match', 'kick', 'goal', 'court', 'assist', 'tackle', 'striker',
  'referee', 'whistle', 'ball', 'half', 'quarter', 'dribble', 'cross', 'foul',
  'penalty', 'corner', 'freekick', 'pitch', 'field', 'basket', 'rebound', 'block',
  'spike', 'serve', 'smash', 'volley', 'lob', 'drop', 'rally', 'racket', 'deuce',
  'شوت', 'تسديد', 'تسديدة', 'تمرير', 'تمريرة', 'هجوم', 'مهاجم', 'دفاع', 'مدافع',
  'هدف', 'أهداف', 'بادل', 'كورة', 'كرة', 'ملعب', 'مباراة', 'ماتش', 'حارس', 'مرمى',
  'فاول', 'بلنتي', 'جزاء', 'ركينة', 'ركنية', 'سلة', 'طائرة', 'قدم', 'صافرة', 'حكم'
]);

// Map of Arabizi numerals to phonetic Arabic sounds & English approximations
const ARABIZI_MAP: Record<string, string> = {
  '2': 'a', // ء / ق
  '3': 'e', // ع
  '5': 'kh', // خ
  '7': 'h', // ح
  '8': 'gh', // غ
  '9': 'q', // ق / ص
};

// Prohibited root patterns (severe profanity, sexual terms, hate speech, slurs)
// Stored as normalized base tokens to catch variations
const PROHIBITED_ROOTS = [
  // English severe profanity & slurs
  'fuck', 'fuk', 'fck', 'fcker', 'fucking', 'shit', 'bitch', 'asshole', 'cunt', 'dick',
  'pussy', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'bastard', 'motherfucker',
  
  // Arabic severe insults & sexual profanity (normalized letters)
  'شرموط', 'شرموطة', 'شرموطه', 'قحب', 'قحبة', 'قحبه', 'منيوك', 'منيوكه', 'عرص', 'ديوث',
  'كس', 'كسم', 'كسمك', 'كسختك', 'كسامك', 'طيز', 'طيزك', 'زب', 'زبي', 'زبك', 'نيك', 'منيك',
  'متناك', 'سكس', 'نيكك', 'لعن', 'يلعن', 'ابن الكلب', 'يا كلب', 'يا حمار', 'سافل', 'حقير',
  'وسخ', 'واطي', 'لوطي', 'مخنث', 'خول',
  
  // Arabizi equivalents
  'sharmouta', 'sharmuta', 'sharmota', 'sharmoota', 'qahba', 'gahba', '7mara',
  'manyook', 'mnyook', 'manyak', '3ars', '3ar9', 'dayouth', 'kosom', 'kosomk', 'ksomk', 'ksom', 'ksmk', 'ksoom',
  'kosk', 'koss', 'kuss', 'teez', 'tezk', 'zebi', 'zebby', 'zebb', 'nik', 'neek', 'nyek',
  'mnayak', 'metnak', 'kolkhara', 'kol_khara', 'ebn_elkalb', 'yal3an', '3eer', '3eir'
];

/**
 * Normalizes input text by:
 * 1. Lowercasing.
 * 2. Replacing diacritics and Arabic tashkeel.
 * 3. Normalizing Arabic letters (أ, إ, آ -> ا; ة -> ه; ى -> ي).
 * 4. Removing non-alphanumeric separators (., -, _, *, ~, etc.) except spaces.
 * 5. Collapsing repeated consecutive characters (e.g. "shhhhiiiit" -> "shit").
 */
export function normalizeText(text: string): { normalized: string; collapsed: string; words: string[] } {
  if (!text) return { normalized: '', collapsed: '', words: [] };

  let t = text.toLowerCase();

  // Remove Arabic diacritics (harakat / tashkeel)
  t = t.replace(/[\u064B-\u065F\u0670]/g, '');

  // Normalize Arabic letters
  t = t
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ؤ]/g, 'و')
    .replace(/[ئ]/g, 'ي');

  // Replace common leetspeak numbers/symbols when surrounded by letters
  const leetSubstituted = t
    .replace(/[@]/g, 'a')
    .replace(/[$]/g, 's')
    .replace(/[!]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'i');

  // Strip punctuation/symbols between letters using positive lookahead (e.g. "k.s.o.m.k" -> "ksomk", "f-u-c-k" -> "fuck", "b_i_t_c_h" -> "bitch")
  const strippedSeparators = leetSubstituted.replace(/([a-z\u0621-\u064A0-9])[\.\*_\-\+~#\/\\|]+(?=[a-z\u0621-\u064A0-9])/gi, '$1');

  // Collapse repeated characters: 3 or more of any letter down to 1 (e.g. "shhhhiiiit" -> "shit", "كككككس" -> "كس")
  const collapsed = strippedSeparators.replace(/(.)\1{2,}/gu, '$1');

  // Also build words token list
  const words = collapsed
    .split(/\s+/)
    .map(w => w.replace(/[^\w\u0621-\u064A]/gu, ''))
    .filter(Boolean);

  return {
    normalized: strippedSeparators,
    collapsed,
    words
  };
}

/**
 * Checks if a specific token or text contains prohibited content
 */
export function checkContentModeration(text: string): ModerationResult {
  if (!text || !text.trim()) {
    return { isValid: true };
  }

  const { normalized, collapsed, words } = normalizeText(text);

  // Check whole phrase or individual tokens against allowlist first
  const cleanTokens = words.filter(w => !SPORTS_ALLOWLIST.has(w));

  // If every word is in the sports allowlist, it's valid
  if (words.length > 0 && cleanTokens.length === 0) {
    return { isValid: true };
  }

  // Check prohibited roots against words and collapsed string
  for (const root of PROHIBITED_ROOTS) {
    // 1. Direct word or substring match for severe compound terms
    for (const w of words) {
      if (w === root || (root.length >= 4 && w.includes(root)) || (root === 'fck' && w.includes('fck'))) {
        return {
          isValid: false,
          violationReason: 'Content contains language that violates community safety standards.',
          violationReasonAr: 'المحتوى يتضمن كلمات تخالف معايير المجتمع والسلامة.',
          category: 'profanity'
        };
      }
    }

    // 2. Substring match inside collapsed or normalized text with boundary/length safety
    // Only check if root is at least 3 characters long to prevent over-matching short words
    if (root.length >= 3) {
      // Regex boundary or separated token
      const rootPattern = new RegExp(`(^|[^a-z\u0621-\u064A0-9])${root}([^a-z\u0621-\u064A0-9]|$)`, 'iu');
      if (rootPattern.test(collapsed) || rootPattern.test(normalized)) {
        return {
          isValid: false,
          violationReason: 'Content contains inappropriate language or prohibited terms.',
          violationReasonAr: 'المحتوى يتضمن عبارات غير لائقة أو كلمات محظورة.',
          category: 'profanity'
        };
      }
    }
  }

  // Check Arabizi phonetic translation
  let arabiziConverted = collapsed;
  for (const [num, char] of Object.entries(ARABIZI_MAP)) {
    arabiziConverted = arabiziConverted.split(num).join(char);
  }

  for (const root of PROHIBITED_ROOTS) {
    if (root.length >= 4 && arabiziConverted.includes(root)) {
      return {
        isValid: false,
        violationReason: 'Content contains prohibited language or harassment.',
        violationReasonAr: 'المحتوى يتضمن ألفاظاً تخالف معايير الاحترام والمجتمع.',
        category: 'profanity'
      };
    }
  }

  return { isValid: true };
}

// In-memory anti-spam rate limiter for chat and message submissions
interface RateLimitRecord {
  timestamps: number[];
  lastMessageHash: string;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Validates message frequency and rejects duplicate spam
 */
export function checkAntiSpamRateLimit(
  userId: string,
  messageText: string,
  maxPerWindow = 5,
  windowMs = 10000
): ModerationResult {
  if (!userId) return { isValid: true };

  const now = Date.now();
  const cleanText = messageText.trim().toLowerCase();
  const record = rateLimitStore.get(userId) || { timestamps: [], lastMessageHash: '' };

  // 1. Filter timestamps within the rolling window
  record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

  // 2. Reject duplicate identical messages in short window
  if (record.lastMessageHash === cleanText && record.timestamps.length > 0) {
    return {
      isValid: false,
      violationReason: 'Please avoid sending duplicate identical messages.',
      violationReasonAr: 'يرجى تجنب إرسال رسائل مكررة.',
      category: 'spam'
    };
  }

  // 3. Rate limit check: maximum messages per window
  if (record.timestamps.length >= maxPerWindow) {
    return {
      isValid: false,
      violationReason: 'You are sending messages too quickly. Please wait a few seconds.',
      violationReasonAr: 'أنت ترسل الرسائل بسرعة كبيرة. يرجى الانتظار بضع ثوانٍ.',
      category: 'rate_limit'
    };
  }

  // Record this message
  record.timestamps.push(now);
  record.lastMessageHash = cleanText;
  rateLimitStore.set(userId, record);

  return { isValid: true };
}

/**
 * Resets the in-memory anti-spam rate limiter store (useful for testing and session teardowns).
 */
export function resetAntiSpamRateLimiter(): void {
  rateLimitStore.clear();
}

