import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGameShareUrl, shareGame, getSportEmoji } from '../src/lib/sharing';
import { Game } from '../src/types';

describe('Native Game Sharing and Stable Invitation Links', () => {
  const sampleGame = {
    id: 'game-kw-test-789',
    title: 'Friday 7v7 Football Derby',
    sport: 'Football',
    area: 'Mishref',
    courtName: 'Mishref Youth Pitch A',
    date: '2026-11-20',
    startTime: '18:00',
    endTime: '19:30',
    maxPlayers: 14,
    pricePerPlayerKWD: 3.5,
    participants: [],
    participantIds: [],
    status: 'Open',
    organizer: {
      id: 'org-123',
      name: 'Ahmad Al-Kandari',
      username: 'ahmad_k',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'
    }
  } as unknown as Game;

  it('generates the exact stable invitation URL format', () => {
    const url = getGameShareUrl(sampleGame.id);
    expect(url).toBe('https://la3ibkw.com/game/game-kw-test-789');
  });

  it('invokes native navigator.share with sport, title, area and stable link', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true
    });

    const res = await shareGame(sampleGame, 'en');
    expect(res.shared).toBe(true);
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Friday 7v7 Football Derby | La3ib (لاعب)',
      text: expect.stringContaining('Join my game on La3ib!'),
      url: 'https://la3ibkw.com/game/game-kw-test-789'
    });
  });

  it('provides Arabic localized content when language is Arabic', async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true
    });

    const res = await shareGame(sampleGame, 'ar');
    expect(res.shared).toBe(true);
    expect(mockShare).toHaveBeenCalledWith(expect.objectContaining({
      title: expect.stringContaining('لاعب'),
      text: expect.stringContaining('انضم لمباراتنا على تطبيق لعيب!'),
      url: 'https://la3ibkw.com/game/game-kw-test-789'
    }));
  });

  it('copies stable link to clipboard when navigator.share is unavailable', async () => {
    // Simulate desktop or unsupported browser
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true
    });

    const mockClipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockClipboardWrite },
      configurable: true,
      writable: true
    });

    const res = await shareGame(sampleGame, 'en');
    expect(res.shared).toBe(false);
    expect(res.copiedToClipboard).toBe(true);
    expect(mockClipboardWrite).toHaveBeenCalledWith('https://la3ibkw.com/game/game-kw-test-789');
  });

  it('handles user cancellation of native share dialog silently without error', async () => {
    const abortErr = new Error('User dismissed share dialog');
    abortErr.name = 'AbortError';
    const mockShare = vi.fn().mockRejectedValue(abortErr);
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true
    });

    const res = await shareGame(sampleGame, 'en');
    expect(res.shared).toBe(false);
    expect(res.cancelled).toBe(true);
    expect(res.copiedToClipboard).toBe(false);
  });

  it('returns appropriate sport emojis for sports', () => {
    expect(getSportEmoji('Football')).toBe('⚽');
    expect(getSportEmoji('Padel')).toBe('🎾');
    expect(getSportEmoji('Basketball')).toBe('🏀');
    expect(getSportEmoji('Volleyball')).toBe('🏐');
  });
});
