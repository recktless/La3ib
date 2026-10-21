import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { GameDetailModal } from '../src/components/GameDetailModal';
import { GameCard } from '../src/components/GameCard';
import { JoinPaymentModal } from '../src/components/JoinPaymentModal';
import { INITIAL_GAMES, CURRENT_USER } from '../src/data/mockData';
import { Game } from '../src/types';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

// Mock AppContext
vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

// Mock firebase subscriptions
vi.mock('../src/lib/firebase', () => ({
  subscribeToGameChat: vi.fn(() => () => {}),
  subscribeToGameInvitesForGame: vi.fn(() => () => {}),
  calculateGameFinancialSummary: vi.fn(() => ({ totalCollectedKWD: 0, organizerShareKWD: 15 })),
  isGamePast: vi.fn(() => false)
}));

describe('La3ib Cost-Sharing Settings & UI Verification', () => {
  const tHelper = (en: string, _ar: string) => en;

  const baseGame: Game = {
    ...INITIAL_GAMES[0],
    id: 'game-cost-test-1',
    title: 'Friday Night Football ⚽',
    totalCourtCostKWD: 20.0,
    pricePerPlayerKWD: 2.0,
    maxPlayers: 10,
    organizer: {
      ...INITIAL_GAMES[0].organizer,
      id: 'organizer-user-1',
      name: 'Ahmed Organizer',
      username: 'ahmed_org'
    },
    participants: [
      {
        userId: 'organizer-user-1',
        name: 'Ahmed Organizer',
        username: 'ahmed_org',
        avatar: 'https://example.com/avatar.jpg',
        skill: 'Competitive',
        paymentStatus: 'Paid',
        paidAmountKWD: 2.0,
        joinedAt: '2026-09-24T10:00:00Z',
        attendanceConfirmed: false
      },
      {
        userId: 'participant-user-2',
        name: 'Salem Player',
        username: 'salem_p',
        avatar: 'https://example.com/avatar2.jpg',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 2.0,
        joinedAt: '2026-09-24T10:05:00Z',
        attendanceConfirmed: false
      }
    ]
  };

  describe('1. CreateGameModal Cost-Sharing Behavior', () => {
    it('defaults "Split the cost with players" toggle to OFF for new games and hides methods', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: null, // New game
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        updateGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: true },
        firebaseUser: { uid: 'user-1' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        language: 'en',
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      // Toggle label must be present
      expect(html).toContain('Split the cost with players');
      // When OFF: no payment method options (Cash, WAMD, Request Link) should be displayed
      expect(html).not.toContain('Select Cost-Sharing Method');
      expect(html).not.toContain('Players pay the host outside La3ib');
      expect(html).not.toContain('Players pay the host using WAMD outside La3ib');
      // Summary displays Disabled (Free to Join)
      expect(html).toContain('Disabled (Free to Join)');
    });

    it('preserves existing cost-sharing settings (enabled with WAMD) when editing a game', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: {
          ...baseGame,
          costSharing: {
            enabled: true,
            method: 'wamd',
            estimatedShare: 2.0
          }
        },
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        updateGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: true },
        firebaseUser: { uid: 'organizer-user-1' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        language: 'en',
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      // Toggle label present
      expect(html).toContain('Split the cost with players');
      // Method options are shown when enabled
      expect(html).toContain('Select Cost-Sharing Method');
      expect(html).toContain('WAMD');
      expect(html).toContain('Cash');
      expect(html).toContain('Request Link');
      // Estimated Share per Player is clearly labelled as an estimate
      expect(html).toContain('Estimated Share per Player (Estimate)');
      // Editing button label is shown
      expect(html).toContain('Save Match Settings');
    });

    it('preserves existing cost-sharing disabled state when editing a free game', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: {
          ...baseGame,
          costSharing: {
            enabled: false
          }
        },
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        updateGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: true },
        firebaseUser: { uid: 'organizer-user-1' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        language: 'en',
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      expect(html).toContain('Split the cost with players');
      expect(html).not.toContain('Select Cost-Sharing Method');
      expect(html).toContain('Disabled (Free to Join)');
    });
  });

  describe('2. GameDetailModal Cost-Sharing & Payment Request Controls', () => {
    it('displays cost-sharing details and Request Payment Link button for eligible participants when method is Request Link', () => {
      const requestLinkGame: Game = {
        ...baseGame,
        costSharing: {
          enabled: true,
          method: 'request_link',
          estimatedShare: 2.0
        }
      };

      mockAppContextValue.current = {
        selectedGameForDetail: requestLinkGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [requestLinkGame],
        myGames: [requestLinkGame],
        currentUser: { id: 'participant-user-2', name: 'Salem Player' }, // Joined participant, not organizer
        chats: {},
        sendChatMessage: vi.fn(),
        leaveGame: vi.fn(),
        cancelGame: vi.fn(),
        submitReport: vi.fn(),
        reportItem: vi.fn(),
        authStatus: 'authenticated',
        isDemoActive: false,
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        players: [],
        friendIds: [],
        followingUserIds: [],
        sendGameInvite: vi.fn(),
        cancelGameInvite: vi.fn(),
        isGameInviteLoading: false,
        getGameInvitesForGame: vi.fn(),
        joinGame: vi.fn(),
        setCreateGamePrefill: vi.fn(),
        setCreateGameModalOpen: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal />);

      // Should display Cost Sharing Settings and Request Link method
      expect(html).toContain('Cost Sharing Settings');
      expect(html).toContain('Request Link');
      // Should show estimated share with estimate label
      expect(html).toContain('Estimated Share');
      expect(html).toContain('Estimate');
      // Eligible participant should see the Request Payment Link button
      expect(html).toContain('Request Payment Link');
      // Obsolete payment status (Paid ✓) is removed from roster
      expect(html).not.toContain('Paid ✓');
      expect(html).not.toContain('Player Roster &amp; Payment Status');
      expect(html).toContain('Player Roster');
    });

    it('does NOT display payment-request controls when cost sharing is disabled', () => {
      const freeGame: Game = {
        ...baseGame,
        costSharing: {
          enabled: false
        }
      };

      mockAppContextValue.current = {
        selectedGameForDetail: freeGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [freeGame],
        myGames: [freeGame],
        currentUser: { id: 'participant-user-2', name: 'Salem Player' },
        chats: {},
        sendChatMessage: vi.fn(),
        leaveGame: vi.fn(),
        cancelGame: vi.fn(),
        submitReport: vi.fn(),
        reportItem: vi.fn(),
        authStatus: 'authenticated',
        isDemoActive: false,
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        players: [],
        friendIds: [],
        followingUserIds: [],
        sendGameInvite: vi.fn(),
        cancelGameInvite: vi.fn(),
        isGameInviteLoading: false,
        getGameInvitesForGame: vi.fn(),
        joinGame: vi.fn(),
        setCreateGamePrefill: vi.fn(),
        setCreateGameModalOpen: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal />);

      // When cost sharing is disabled:
      // 1. No Cost Sharing Settings card or payment method
      expect(html).not.toContain('Cost Sharing Settings');
      expect(html).not.toContain('Request Link');
      expect(html).not.toContain('WAMD');
      // 2. No Request Payment Link button
      expect(html).not.toContain('Request Payment Link');
      // 3. Displays Cost Sharing: None (Free)
      expect(html).toContain('None (Free)');
    });

    it('does NOT show Request Payment Link button to the match organizer', () => {
      const requestLinkGame: Game = {
        ...baseGame,
        costSharing: {
          enabled: true,
          method: 'request_link',
          estimatedShare: 2.0
        }
      };

      mockAppContextValue.current = {
        selectedGameForDetail: requestLinkGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [requestLinkGame],
        myGames: [requestLinkGame],
        currentUser: { id: 'organizer-user-1', name: 'Ahmed Organizer' }, // Is the host
        chats: {},
        sendChatMessage: vi.fn(),
        leaveGame: vi.fn(),
        cancelGame: vi.fn(),
        submitReport: vi.fn(),
        reportItem: vi.fn(),
        authStatus: 'authenticated',
        isDemoActive: false,
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        players: [],
        friendIds: [],
        followingUserIds: [],
        sendGameInvite: vi.fn(),
        cancelGameInvite: vi.fn(),
        isGameInviteLoading: false,
        getGameInvitesForGame: vi.fn(),
        joinGame: vi.fn(),
        setCreateGamePrefill: vi.fn(),
        setCreateGameModalOpen: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal />);

      // Organizer shouldn't request link from themselves
      expect(html).not.toContain('Request Payment Link');
    });
  });

  describe('3. GameCard Cost-Sharing Presentation', () => {
    it('displays estimated share and method badge when cost sharing is enabled', () => {
      const cashGame: Game = {
        ...baseGame,
        costSharing: {
          enabled: true,
          method: 'cash',
          estimatedShare: 2.0
        }
      };

      mockAppContextValue.current = {
        currentUser: { id: 'other-user', name: 'Guest' },
        setSelectedGameForDetail: vi.fn(),
        joinGame: vi.fn(),
        authStatus: 'authenticated',
        isDemoActive: false,
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameCard game={cashGame} />);

      expect(html).toContain('Estimated Share');
      expect(html).toContain('Estimate');
      expect(html).toContain('💵 Cash');
      expect(html).toContain('Join Game');
    });

    it('displays None (Free) when cost sharing is disabled', () => {
      const freeGame: Game = {
        ...baseGame,
        costSharing: {
          enabled: false
        }
      };

      mockAppContextValue.current = {
        currentUser: { id: 'other-user', name: 'Guest' },
        setSelectedGameForDetail: vi.fn(),
        joinGame: vi.fn(),
        authStatus: 'authenticated',
        isDemoActive: false,
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameCard game={freeGame} />);

      expect(html).toContain('Cost Sharing');
      expect(html).toContain('None (Free)');
      expect(html).not.toContain('💵 Cash');
      expect(html).not.toContain('⚡ WAMD');
      expect(html).not.toContain('🔗 Link');
    });
  });

  describe('4. Obsolete Payment Flow Removal', () => {
    it('JoinPaymentModal returns null and does not render payment gateways or fake bank selectors', () => {
      mockAppContextValue.current = {
        selectedGameForJoin: baseGame,
        setSelectedGameForJoin: vi.fn(),
        joinGame: vi.fn()
      };

      const html = renderToStaticMarkup(<JoinPaymentModal />);

      expect(html).toBe('');
      expect(html).not.toContain('NBK');
      expect(html).not.toContain('KNET');
      expect(html).not.toContain('Apple Pay');
      expect(html).not.toContain('Credit Card');
    });
  });
});
