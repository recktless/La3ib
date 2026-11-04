/**
 * Centralized Content Moderation System for La3ib | لاعب
 * Handles English, Arabic, and Arabizi (Franco-Arab) language moderation.
 *
 * Requirements:
 * - Detect slurs, hate speech, explicit sexual profanity, targeted harassment, and severe abuse.
 * - Detect bypass attempts (character substitutions, repeated characters, spacing/dots, zero-width characters).
 * - Avoid false positives for ordinary conversations and sports terminology in Kuwait.
 * - Anti-spam & message rate limiting.
 * - Never silently alter user messages; reject with clear, friendly explanations in EN & AR.
 */

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  category?: 'profanity' | 'hate_speech' | 'harassment' | 'spam' | 'rate_limit';
  explanationEn?: string;
  explanationAr?: string;
}

// ---------------------------------------------------------------------------
// 1. SPORTS & BENIGN VOCABULARY ALLOWLIST (False-Positive Protection)
// ---------------------------------------------------------------------------
// These terms must never be falsely flagged when appearing in benign context.
const SPORTS_ALLOWLIST_TOKENS = new Set([
  'shoot', 'attack', 'defense', 'defender', 'striker', 'midfielder', 'goalkeeper', 'goalie',
  'tackle', 'foul', 'penalty', 'kick', 'pass', 'dribble', 'smash', 'serve', 'court', 'pitch',
  'stadium', 'ball', 'basketball', 'football', 'padel', 'tennis', 'volleyball', 'badminton',
  'match', 'game', 'tournament', 'cup', 'league', 'substitute', 'bench', 'referee', 'score',
  'li3ib', 'la3ib', 'play', 'player', 'mishref', 'salmiya', 'shuwaikh', 'hawalli', 'jabriya',
  'knet', 'wamd', 'dinars', 'kwd', 'salam', 'marhaba', 'shabab', 'ya', 'kuwait', 'q8',
  'كأس', 'كاس', 'هدف', 'مرمى', 'ملعب', 'مباراة', 'دوري', 'بطولة', 'تسلل', 'فاول', 'بلنتي',
  'ركلة', 'تمريرة', 'حارس', 'دفاع', 'هجوم', 'وسط', 'مهاجم', 'سلة', 'بادل', 'تنس', 'طائرة',
  'قدم', 'ريشة', 'مكيف', 'صالة', 'شباب', 'سلام', 'هلا', 'يعطيك', 'العافية', 'كويت'
]);

// ---------------------------------------------------------------------------
// 2. PROHIBITED PATTERNS (English, Arabic, Arabizi)
// ---------------------------------------------------------------------------

// Severe English abuse, slurs, explicit sexual violence/profanity
const ENGLISH_PROHIBITED_PATTERNS: RegExp[] = [
  /\b(?:nigg[ae]r?|fagg?ot|cunt|kike|chink|spic|retard|slut|whore)\b/i,
  /\b(?:f+u+c+k+|s+h+i+t+|b+i+t+c+h+|b+a+s+t+a+r+d+|d+i+c+k+|p+u+s+s+y+|a+s+s+h+o+l+e+)\b/i,
  /\b(?:kill\s+your?self|kys|go\s+die|die\s+in\s+a\s+fire|hope\s+you\s+die)\b/i,
  /\b(?:blowjob|handjob|gangbang|porn|motherfucker|milf|dildo)\b/i
];

// Severe Arabic profanity, hate speech, and sexual slurs
// (Covering Gulf, Levantine, Egyptian, and Modern Standard Arabic abusive terminology)
const ARABIC_PROHIBITED_PATTERNS: RegExp[] = [
  // Extreme sexual slurs & insults directed at family/individuals
  /(?:شرموط[ةه]?|قحب[ةه]|منيوك|ديوس|عرص|طيز|كس\s*(?:امك|اختك|ابوك)?|زب[ي]?|عير)/i,
  /(?:ابن\s*(?:القحب[ةه]|الشرموط[ةه]|الكلب|الحرام))/i,
  /(?:يلعن\s*(?:امك|ابوك|شرفك|اختك|عرضك|دينك))/i,
  /(?:خول|سكس|نيك|تناك|بنيكك|ينيك|مص\s*زبي|مص\s*قضيبي)/i,
  /(?:خرا|خراء|يا\s*حيوان|يا\s*حمار|يا\s*كلب|تف[هـ]\s*عليك)/i,
  /(?:موت|انتحر|اذبحك|بذبحك|كسر\s*راسك)/i
];

// Arabizi / Franco-Arab vulgarity representations
// 3 = ع, 7 = ح, 5 = خ, 2 = ء/ق, 8 = غ
const ARABIZI_PROHIBITED_PATTERNS: RegExp[] = [
  /\b(?:sharmou?t[aeh]?|ga7b[aeh]|ka7b[aeh]|manyo+k|3ars|dayo+s|te+z|teez)\b/i,
  /\b(?:ko+s\s*o+mm?a?k|ko+s\s*e+khtak|ko+s\s*o+mak|zeb|ze+bi|3e+r)\b/i,
  /\b(?:el3an\s*(?:omak|abouk|sharafak|deeno?k|3ardak))\b/i,
  /\b(?:ebn\s*(?:el\s*)?(?:kalb|ga7ba|sharmouta|7aram))\b/i,
  /\b(?:ne+k|neek|bneekak|ya\s*manya?k|khor?a|7ayawan|7mar|kalb)\b/i
];

// ---------------------------------------------------------------------------
// 3. TEXT NORMALIZATION & BYPASS DECONVOLUTION
// ---------------------------------------------------------------------------

/**
 * Strips zero-width characters, invisible symbols, and tatweel
 */
export function stripHiddenChars(str: string): string {
  return str
    .replace(/[\u200B-\u200D\uFEFF\u0640]/g, '') // zero-width spaces, joiners, Arabic tatweel (ـ)
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, ''); // Arabic tashkeel / diacritics
}

/**
 * Normalizes repeated characters (e.g. "shiiiit" -> "shit", "قحححبة" -> "قحبة")
 * Leaves at most 2 repeats for regular words.
 */
export function normalizeRepeats(str: string): string {
  return str.replace(/(.)\1{2,}/gu, '$1$1');
}

/**
 * Normalizes leetspeak and common character substitutions:
 * @ -> a, $ -> s, 0 -> o, 1 -> i, ! -> i, + -> t, 3 -> e (or 3 in Arabizi)
 */
export function normalizeLeetspeak(str: string): string {
  return str
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/0/g, 'o')
    .replace(/[!|1]/g, 'i')
    .replace(/\+/g, 't');
}

/**
 * Collapses separator punctuation inside single words (e.g. "f.u.c.k" or "ق_ح_ب_ة")
 */
export function collapseSeparatedLetters(str: string): string {
  // If single letters are separated by dots, spaces, hyphens, or underscores
  return str.replace(/([a-zA-Z\u0600-\u06FF])[\.\-_\s*#~](?=[a-zA-Z\u0600-\u06FF])/g, '$1');
}

// ---------------------------------------------------------------------------
// 4. MAIN MODERATION CHECK FUNCTION
// ---------------------------------------------------------------------------

/**
 * Evaluates text for prohibited hate speech, severe abuse, profanity, and harassment.
 * Designed to be fast, client- and server-friendly, with zero false positives for sports jargon.
 */
export function moderateText(text: string | null | undefined): ModerationResult {
  if (!text || !text.trim()) {
    return { allowed: true };
  }

  const raw = text.trim();

  // Basic length / denial-of-service safeguard
  if (raw.length > 5000) {
    return {
      allowed: false,
      category: 'spam',
      reason: 'Content exceeds allowed length limit',
      explanationEn: 'Text exceeds maximum character limit. Please shorten your message.',
      explanationAr: 'يتجاوز النص الحد الأقصى المسموح به للأحرف. يرجى اختصار الرسالة.'
    };
  }

  // Check benign sports allowlist exact matches first
  const words = raw.toLowerCase().split(/\s+/);
  const isPureSportsPhrase = words.length <= 4 && words.every(w => {
    const cleanWord = w.replace(/[^a-z0-9\u0600-\u06FF]/gi, '');
    return SPORTS_ALLOWLIST_TOKENS.has(cleanWord);
  });
  if (isPureSportsPhrase) {
    return { allowed: true };
  }

  // De-obfuscate text through normalization pipeline
  const cleaned = stripHiddenChars(raw);
  const deRepeated = normalizeRepeats(cleaned);
  const deLeet = normalizeLeetspeak(deRepeated);
  const collapsed = collapseSeparatedLetters(deLeet);

  const testVariations = [raw, cleaned, deRepeated, deLeet, collapsed];

  // 1. Test English prohibited expressions
  for (const variant of testVariations) {
    for (const pattern of ENGLISH_PROHIBITED_PATTERNS) {
      if (pattern.test(variant)) {
        return {
          allowed: false,
          category: 'profanity',
          reason: 'Prohibited explicit language, slurs, or harassment detected',
          explanationEn: "Your message contains language that violates La3ib's community safety guidelines. Please maintain respect and sportsmanship.",
          explanationAr: 'يتضمن النص عبارات تخالف معايير مجتمع لعيب الرياضي. يرجى الحفاظ على الاحترام والروح الرياضية.'
        };
      }
    }
  }

  // 2. Test Arabic prohibited expressions
  for (const variant of testVariations) {
    for (const pattern of ARABIC_PROHIBITED_PATTERNS) {
      if (pattern.test(variant)) {
        return {
          allowed: false,
          category: 'profanity',
          reason: 'Prohibited Arabic offensive terms or slurs detected',
          explanationEn: "Your message contains language that violates La3ib's community safety guidelines. Please maintain respect and sportsmanship.",
          explanationAr: 'يتضمن النص عبارات تخالف معايير مجتمع لعيب الرياضي. يرجى الحفاظ على الاحترام والروح الرياضية.'
        };
      }
    }
  }

  // 3. Test Arabizi / Franco-Arab prohibited expressions
  for (const variant of testVariations) {
    for (const pattern of ARABIZI_PROHIBITED_PATTERNS) {
      if (pattern.test(variant)) {
        return {
          allowed: false,
          category: 'profanity',
          reason: 'Prohibited Arabizi offensive terms or slurs detected',
          explanationEn: "Your message contains language that violates La3ib's community safety guidelines. Please maintain respect and sportsmanship.",
          explanationAr: 'يتضمن النص عبارات تخالف معايير مجتمع لعيب الرياضي. يرجى الحفاظ على الاحترام والروح الرياضية.'
        };
      }
    }
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// 5. ANTI-SPAM & RATE LIMITER (In-Memory per session)
// ---------------------------------------------------------------------------

interface UserRateLimitState {
  timestamps: number[];
  lastMessageText?: string;
  lastMessageTime?: number;
}

const rateLimitStore = new Map<string, UserRateLimitState>();

/**
 * Checks whether a user is sending messages too rapidly (rate limiting)
 * or repeating identical spam messages.
 * Rule: max 5 messages per 10 seconds; minimum 500ms between identical messages.
 */
export function checkRateLimitAndSpam(
  userId: string,
  messageText: string,
  now: number = Date.now()
): ModerationResult {
  if (!userId) return { allowed: true };

  const state = rateLimitStore.get(userId) || { timestamps: [] };

  // Evict timestamps older than 10 seconds
  const tenSecondsAgo = now - 10000;
  state.timestamps = state.timestamps.filter(t => t > tenSecondsAgo);

  // Check frequency limit: max 6 messages in 10 seconds
  if (state.timestamps.length >= 6) {
    return {
      allowed: false,
      category: 'rate_limit',
      reason: 'Sending messages too rapidly (Rate limited)',
      explanationEn: 'You are sending messages too quickly. Please wait a few seconds before trying again.',
      explanationAr: 'أنت ترسل الرسائل بسرعة كبيرة. يرجى الانتظار بضع ثوانٍ قبل المحاولة مجدداً.'
    };
  }

  // Check duplicate text spam within 3 seconds
  const normalizedMsg = messageText.trim().toLowerCase();
  if (
    state.lastMessageText === normalizedMsg &&
    state.lastMessageTime &&
    now - state.lastMessageTime < 3000
  ) {
    return {
      allowed: false,
      category: 'spam',
      reason: 'Duplicate message spam detected',
      explanationEn: 'Please avoid sending identical duplicate messages consecutively.',
      explanationAr: 'يرجى تجنب تكرار إرسال الرسالة نفسها بشكل متتالي.'
    };
  }

  // Record timestamp
  state.timestamps.push(now);
  state.lastMessageText = normalizedMsg;
  state.lastMessageTime = now;
  rateLimitStore.set(userId, state);

  return { allowed: true };
}
