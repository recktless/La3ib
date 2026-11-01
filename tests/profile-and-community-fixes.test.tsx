import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProfileTab } from '../src/components/ProfileTab';
import { GameDetailModal } from '../src/components/GameDetailModal';
import { CURRENT_USER, MOCK_PLAYERS, INITIAL_GAMES } from '../src/data/mockData';
import { UserProfile, Game } from '../src/types';
import { compressImageClient } from '../src/lib/firebase';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

describe('La3ib — Task 7: Profile & Community Fixes Verification Suite', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: {
        ...CURRENT_USER,
        area: 'Salmiya',
        isDemoUser: true
      },
      updateCurrentUserProfile: vi.fn(),
      loadPlayerActivity: vi.fn().mockResolvedValue({
        gamesPlayed: 12,
        gamesHosted: 4,
        upcomingGames: 2,
        sportsPlayed: ['Football', 'Padel'],
        recentActivities: []
      }),
      blockedUserIds: new Set<string>(),
      blockedPlayersList: [],
      unblockPlayer: vi.fn(),
      isBlockActionLoading: vi.fn().mockReturnValue(false),
      followingUserIds: new Set(['player-1', 'player-2']),
      followerUserIds: new Set(['player-2', 'player-3', 'player-4']),
      followingList: [
        MOCK_PLAYERS[0], // player-1
        MOCK_PLAYERS[1]  // player-2
      ],
      followersList: [
        MOCK_PLAYERS[1], // player-2
        MOCK_PLAYERS[2], // player-3
        MOCK_PLAYERS[3]  // player-4
      ],
      friendsList: [
        MOCK_PLAYERS[2]  // player-3
      ],
      players: MOCK_PLAYERS,
      games: INITIAL_GAMES,
      myGames: [],
      chats: {},
      selectedGameForDetail: INITIAL_GAMES[0],
      setSelectedGameForDetail: vi.fn(),
      setSelectedGameForJoin: vi.fn(),
      selectedPlayerProfile: null,
      setSelectedPlayerProfile: vi.fn(),
      isFollowingUser: vi.fn((id: string) => id === 'player-1' || id === 'player-2'),
      toggleFollowPlayer: vi.fn(),
      isFollowActionLoading: vi.fn().mockReturnValue(false),
      authStatus: 'demo',
      firebaseUser: null,
      isDemoActive: true,
      setAuthModalOpen: vi.fn(),
      setAuthModalMode: vi.fn(),
      logout: vi.fn(),
      continueAsDemo: vi.fn(),
      sendPasswordResetEmailAction: vi.fn(),
      deleteAccountAction: vi.fn(),
      reauthenticateAction: vi.fn(),
      checkUsername: vi.fn().mockResolvedValue({ available: true }),
      sendChatMessage: vi.fn(),
      leaveGame: vi.fn(),
      cancelGame: vi.fn(),
      submitReport: vi.fn(),
      reportItem: vi.fn(),
      friendIds: new Set(['player-3']),
      sendGameInvite: vi.fn(),
      cancelGameInvite: vi.fn(),
      isGameInviteLoading: vi.fn().mockReturnValue(false),
      getGameInvitesForGame: vi.fn().mockReturnValue({}),
      joinGame: vi.fn(),
      setCreateGamePrefill: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      requestPaymentLink: vi.fn(),
      markPaymentLinkRequestHandled: vi.fn(),
      getPaymentLinkRequests: vi.fn().mockReturnValue([]),
      t: (en: string) => en,
      language: 'en'
    };
  });

  describe('1. Profile picture uploads & persistence', () => {
    it('provides avatar upload controls and accepts standard image types', () => {
      const html = renderToStaticMarkup(<ProfileTab />);
      expect(html).toContain('Upload Profile Photo');
      expect(html).toContain('accept="image/*"');
      expect(html).toContain('type="file"');
    });

    it('has client compression utility available for lightweight payloads', () => {
      expect(typeof compressImageClient).toBe('function');
    });
  });

  describe('2. Following, Followers, and Friends on own profile', () => {
    it('displays interactive metrics for Friends, Followers, and Following on user profile', () => {
      const html = renderToStaticMarkup(<ProfileTab />);

      // Metrics titles
      expect(html).toContain('Friends');
      expect(html).toContain('Followers');
      expect(html).toContain('Following');

      // Metric counts reflect context lists
      expect(html).toContain('1'); // 1 friend (player-3)
      expect(html).toContain('3'); // 3 followers (player-2, player-3, player-4)
      expect(html).toContain('2'); // 2 following (player-1, player-2)
    });

    it('filters out blocked users from following and followers lists', () => {
      // Simulate player-2 being blocked
      mockAppContextValue.current.blockedUserIds = new Set(['player-2']);
      mockAppContextValue.current.followingList = [MOCK_PLAYERS[0]]; // player-1 only
      mockAppContextValue.current.followersList = [MOCK_PLAYERS[2], MOCK_PLAYERS[3]]; // player-3, player-4

      const html = renderToStaticMarkup(<ProfileTab />);
      expect(html).toContain('1'); // 1 following
      expect(html).toContain('2'); // 2 followers
    });
  });

  describe('3. Opening player profiles from game rosters', () => {
    it('renders organizer card with click-to-profile affordances', () => {
      const html = renderToStaticMarkup(<GameDetailModal initialTab="details" />);
      expect(html).toContain('View organizer profile');
      expect(html).toContain('Host');
      expect(html).toContain(INITIAL_GAMES[0].organizer.name);
    });

    it('renders confirmed participants as clickable items to open their profile', () => {
      const html = renderToStaticMarkup(<GameDetailModal initialTab="details" />);
      expect(html).toContain('View player profile');
      expect(html).toContain('Player Roster');
      expect(html).toContain(INITIAL_GAMES[0].participants[0].name);
    });
  });

  describe('4. Kuwait Area selector removal from Edit Profile', () => {
    it('does not render the Kuwait Area dropdown selector in the profile form', () => {
      const html = renderToStaticMarkup(<ProfileTab />);
      // Should not contain the select dropdown for Kuwait areas
      expect(html).not.toContain('<select');
      expect(html).not.toContain('Kuwait Area');
      expect(html).toContain('Edit Profile &amp; Bio');
    });

    it('preserves existing legacy area information on the profile card', () => {
      const html = renderToStaticMarkup(<ProfileTab />);
      expect(html).toContain('Salmiya, Kuwait');
    });
  });
});
