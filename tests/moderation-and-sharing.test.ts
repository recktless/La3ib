import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  checkContentModeration, 
  checkAntiSpamRateLimit, 
  resetAntiSpamRateLimiter 
} from '../src/lib/moderation';
import { getGameShareUrl, shareGameNative } from '../src/lib/sharing';

describe('Content Moderation System (English, Arabic, Arabizi)', () => {
  beforeEach(() => {
    resetAntiSpamRateLimiter();
  });

  it('permits clean sports content and ordinary conversation', () => {
    const cleanTexts = [
      'Friday 7v7 Football match at Mishref',
      'Great pass and clean shot on goal!',
      'مباراة بادل حماسية في السالمية',
      'تمريرة رائعة وهدف ممتاز يا شباب',
      'Looking for 2 intermediate padel players',
      'Need a goalkeeper for 90 minutes'
    ];

    for (const text of cleanTexts) {
      const result = checkContentModeration(text);
      expect(result.isValid, `Expected clean text to pass: "${text}"`).toBe(true);
      expect(result.violationReason).toBeUndefined();
    }
  });

  it('preserves legitimate sports terminology without false positives', () => {
    const sportsTerms = [
      'shoot the ball',
      'great pass',
      'awesome goal',
      'padel match',
      'حارس المرمى',
      'شوت الكرة',
      'هدف جميل'
    ];

    for (const term of sportsTerms) {
      const result = checkContentModeration(term);
      expect(result.isValid, `Expected sport term "${term}" to be allowed`).toBe(true);
    }
  });

  it('rejects severe abusive language and slurs in English', () => {
    const toxicEnglish = [
      'you are a f*ckhead',
      'shut up bitch',
      'this asshole ruined the game'
    ];

    for (const text of toxicEnglish) {
      const result = checkContentModeration(text);
      expect(result.isValid, `Expected "${text}" to be blocked`).toBe(false);
      expect(result.violationReason).toBeDefined();
    }
  });

  it('rejects severe abusive language and slurs in Arabic and Arabizi', () => {
    const toxicArabic = [
      'يا كلب يا حقير',
      'شرموط',
      'ksomk',
      'sharmouta'
    ];

    for (const text of toxicArabic) {
      const result = checkContentModeration(text);
      expect(result.isValid, `Expected "${text}" to be blocked`).toBe(false);
      expect(result.violationReason).toBeDefined();
    }
  });

  it('detects simple bypass attempts with repeated letters or symbol insertions', () => {
    const bypassAttempts = [
      'f.u.c.k',
      'shiiiit',
      'b_i_t_c_h'
    ];

    for (const text of bypassAttempts) {
      const result = checkContentModeration(text);
      expect(result.isValid, `Expected bypass "${text}" to be blocked`).toBe(false);
    }
  });

  it('enforces anti-spam rate limiting and duplicate message detection', () => {
    const userId = 'player-rate-test';
    const message = 'Hello players!';

    // First 5 messages should succeed
    for (let i = 0; i < 5; i++) {
      const check = checkAntiSpamRateLimit(userId, `${message} ${i}`);
      expect(check.isValid).toBe(true);
    }

    // 6th message within 10 seconds should trigger rate limit
    const throttled = checkAntiSpamRateLimit(userId, 'One more message quickly');
    expect(throttled.isValid).toBe(false);
    expect(throttled.violationReason).toContain('quickly');

    // Duplicate message detection
    const user2 = 'player-dup-test';
    const firstCheck = checkAntiSpamRateLimit(user2, 'Same message twice');
    expect(firstCheck.isValid).toBe(true);
    const dupCheck = checkAntiSpamRateLimit(user2, 'Same message twice');
    expect(dupCheck.isValid).toBe(false);
    expect(dupCheck.violationReason).toContain('duplicate');
  });
});

describe('Native Game Sharing & Deep Linking Helper', () => {
  it('generates a stable shareable URL with the correct format', () => {
    const gameId = 'game-kw-456';
    const url = getGameShareUrl(gameId);
    expect(url).toContain('/game/game-kw-456');
  });

  it('invokes navigator.share when supported', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true
    });

    const mockGame: any = {
      id: 'game-share-1',
      title: 'Friday Padel Challenge',
      sport: 'Padel',
      area: 'Salmiya'
    };

    const result = await shareGameNative(mockGame, 'en');
    expect(result.shared).toBe(true);
    expect(result.copiedToClipboard).toBe(false);
    expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('Friday Padel Challenge'),
      url: expect.stringContaining('/game/game-share-1')
    }));
  });

  it('gracefully handles AbortError when user cancels native share dialog', async () => {
    const abortError = new Error('Share canceled');
    abortError.name = 'AbortError';
    const mockShare = vi.fn().mockRejectedValue(abortError);

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true
    });

    const mockGame: any = {
      id: 'game-share-2',
      title: 'Saturday Football 8v8',
      sport: 'Football',
      area: 'Mishref'
    };

    const result = await shareGameNative(mockGame, 'en');
    expect(result.shared).toBe(false);
    expect(result.copiedToClipboard).toBe(false);
  });

  it('falls back to clipboard copy when navigator.share is unavailable', async () => {
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true
    });

    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
      writable: true
    });

    const mockGame: any = {
      id: 'game-share-3',
      title: 'Morning Volleyball',
      sport: 'Volleyball',
      area: 'Kuwait City'
    };

    const result = await shareGameNative(mockGame, 'ar');
    expect(result.shared).toBe(true);
    expect(result.copiedToClipboard).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/game/game-share-3'));
  });
});
