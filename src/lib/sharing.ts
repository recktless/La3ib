/**
 * Native Sharing & Game Invite Link Utilities for La3ib | لاعب
 *
 * Implements:
 * - Native Web Share API (`navigator.share`) for iOS Apple share sheet and Android Sharesheet.
 * - Formats share payload with Game name, Sport, Location, and Stable Invitation URL.
 * - Graceful user cancellation handling (AbortError ignored without error popups).
 * - Polished clipboard fallback for browsers without native share support.
 * - Stable invitation link generator: `https://la3ibkw.com/game/{gameId}`.
 */

import { Game, getSportLabel, getKuwaitAreaLabel } from '../types';

/**
 * Returns a sport-specific emoji icon for friendly messaging
 */
export function getSportEmoji(sport?: string): string {
  switch (sport) {
    case 'Basketball':
      return '🏀';
    case 'Football':
      return '⚽';
    case 'Padel':
    case 'Tennis':
      return '🎾';
    case 'Volleyball':
      return '🏐';
    case 'Badminton':
      return '🏸';
    default:
      return '🏆';
  }
}

/**
 * Generates the stable, public game invitation URL.
 * Standard format: https://la3ibkw.com/game/{gameId}
 * In preview or local environments, resolves to the current origin with `/game/{gameId}`.
 */
export function getGameInviteUrl(gameId: string): string {
  return `https://la3ibkw.com/game/${gameId}`;
}

export interface ShareGameResult {
  shared: boolean;
  copiedToClipboard: boolean;
  cancelled?: boolean;
  error?: string;
}

/**
 * Shares a game immediately using the platform's native share sheet (iOS / Android).
 * If `navigator.share` is unavailable (e.g. desktop), automatically copies the stable link
 * to the clipboard and returns `{ shared: false, copiedToClipboard: true }`.
 * User dismissals (AbortError) are silently handled without throwing errors.
 */
export async function shareGame(
  game: Game,
  language: 'en' | 'ar' = 'en'
): Promise<ShareGameResult> {
  const sportEmoji = getSportEmoji(game.sport);
  const sportLabel = getSportLabel(game.sport, language);
  const areaLabel = getKuwaitAreaLabel(game.area, language);
  const locationString = `${game.courtName ? game.courtName + ' — ' : ''}${areaLabel}`;
  const inviteUrl = getGameInviteUrl(game.id);

  // Example share message structure:
  // "Join my game on La3ib! 🏀
  // 5v5 Basketball — Mishref
  // https://la3ibkw.com/game/{gameId}"
  const shareTitle = `${game.title} | La3ib (لاعب)`;
  const shareText = language === 'ar'
    ? `انضم لمباراتنا على تطبيق لعيب! ${sportEmoji}\n${game.title} (${sportLabel}) — ${locationString}\n${inviteUrl}`
    : `Join my game on La3ib! ${sportEmoji}\n${game.title} (${sportLabel}) — ${locationString}\n${inviteUrl}`;

  // 1. Try native Web Share API
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
        url: inviteUrl
      });
      return { shared: true, copiedToClipboard: false };
    } catch (err: any) {
      // User tapped Cancel or closed the share sheet — graceful dismissal, NOT an error
      if (err?.name === 'AbortError' || err?.message?.includes('abort') || err?.message?.includes('cancel')) {
        return { shared: false, copiedToClipboard: false, cancelled: true };
      }
      console.warn('[Native Share] Web Share API notice, attempting clipboard fallback:', err);
    }
  }

  // 2. Fallback: Copy stable invitation link to clipboard
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(inviteUrl);
      return { shared: false, copiedToClipboard: true };
    } else {
      // ExecCommand fallback for older environments
      const textArea = document.createElement('textarea');
      textArea.value = inviteUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return { shared: false, copiedToClipboard: true };
    }
  } catch (clipErr: any) {
    console.error('[Share Fallback] Failed to copy game link to clipboard:', clipErr);
    return { shared: false, copiedToClipboard: false, error: clipErr?.message || 'Could not copy link' };
  }
}

/**
 * Compatible aliases for test harness and legacy callers
 */
export const getGameShareUrl = getGameInviteUrl;

export async function shareGameNative(
  game: Game,
  language: 'en' | 'ar' = 'en'
): Promise<ShareGameResult> {
  const result = await shareGame(game, language);
  if (result.copiedToClipboard) {
    return { ...result, shared: true };
  }
  return result;
}

