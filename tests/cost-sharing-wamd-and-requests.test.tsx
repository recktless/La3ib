import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { GameDetailModal } from '../src/components/GameDetailModal';
import { GameCard } from '../src/components/GameCard';
import { INITIAL_GAMES, CURRENT_USER } from '../src/data/mockData';
import { 
  Game, 
  isValidKuwaitMobile, 
  formatKuwaitMobile, 
  getCostSharingMethods, 
  isCostSharingMethodSelected,
  PaymentLinkRequest 
} from '../src/types';

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
  subscribeToPaymentLinkRequestsForGame: vi.fn(() => () => {}),
  calculateGameFinancialSummary: vi.fn(() => ({ totalCollectedKWD: 0, organizerShareKWD: 15 })),
  isGamePast: vi.fn(() => false),
  isGameExpiredKuwait: vi.fn(() => false)
}));

describe('La3ib WAMD Phone Number & Payment Link Requests Test Suite', () => {
  const tHelper = (en: string, _ar: string) => en;

  const baseGame: Game = {
    ...INITIAL_GAMES[0],
    id: 'game-wamd-test-1',
    title: 'Kuwait Padel Tournament 🎾',
    totalCourtCostKWD: 30.0,
    pricePerPlayerKWD: 7.5,
    maxPlayers: 4,
    organizer: {
      ...INITIAL_GAMES[0].organizer,
      id: 'organizer-user-1',
      name: 'Fahad Organizer',
      username: 'fahad_org'
    },
    participantIds: ['organizer-user-1', 'participant-user-2'],
    participants: [
      {
        userId: 'organizer-user-1',
        name: 'Fahad Organizer',
        username: 'fahad_org',
        avatar: 'https://example.com/avatar.jpg',
        skill: 'Competitive',
        paymentStatus: 'Paid',
        paidAmountKWD: 7.5,
        joinedAt: '2026-09-24T10:00:00Z',
        attendanceConfirmed: false
      },
      {
        userId: 'participant-user-2',
        name: 'Yousef Player',
        username: 'yousef_p',
        avatar: 'https://example.com/avatar2.jpg',
        skill: 'Intermediate',
        paymentStatus: 'Paid',
        paidAmountKWD: 7.5,
        joinedAt: '2026-09-24T10:05:00Z',
        attendanceConfirmed: false
      }
    ]
  };

  describe('1. Kuwait Mobile Phone Number Validation & Formatting', () => {
    it('validates standard 8-digit Kuwait mobile numbers starting with 4, 5, 6, 9', () => {
      expect(isValidKuwaitMobile('51234567')).toBe(true);
      expect(isValidKuwaitMobile('61234567')).toBe(true);
      expect(isValidKuwaitMobile('91234567')).toBe(true);
      expect(isValidKuwaitMobile('41234567')).toBe(true);
    });

    it('validates Kuwait numbers with +965, 965, and 00965 international prefixes', () => {
      expect(isValidKuwaitMobile('+96551234567')).toBe(true);
      expect(isValidKuwaitMobile('+965 61234567')).toBe(true);
      expect(isValidKuwaitMobile('96591234567')).toBe(true);
      expect(isValidKuwaitMobile('0096541234567')).toBe(true);
      expect(isValidKuwaitMobile('+965-5123-4567')).toBe(true);
    });

    it('rejects invalid mobile numbers (wrong lengths or invalid prefixes)', () => {
      expect(isValidKuwaitMobile('12345678')).toBe(false); // Does not start with 4, 5, 6, 9
      expect(isValidKuwaitMobile('22345678')).toBe(false); // Landline range
      expect(isValidKuwaitMobile('5123456')).toBe(false);  // 7 digits (too short)
      expect(isValidKuwaitMobile('512345678')).toBe(false); // 9 digits (too long)
      expect(isValidKuwaitMobile('')).toBe(false);
      expect(isValidKuwaitMobile('not-a-number')).toBe(false);
      expect(isValidKuwaitMobile(null as any)).toBe(false);
      expect(isValidKuwaitMobile(undefined as any)).toBe(false);
    });

    it('formats valid Kuwait numbers into standard "+965 XXXXXXXX"', () => {
      expect(formatKuwaitMobile('51234567')).toBe('+965 51234567');
      expect(formatKuwaitMobile('+96599887766')).toBe('+965 99887766');
      expect(formatKuwaitMobile('00965 65432109')).toBe('+965 65432109');
    });
  });

  describe('2. WAMD Phone Number in CreateGameModal', () => {
    it('displays "WAMD Phone Number" input when WAMD is among the selected cost-sharing methods', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: {
          ...baseGame,
          costSharing: {
            enabled: true,
            methods: ['cash', 'wamd'],
            wamdPhoneNumber: '+965 51234567',
            estimatedShare: 7.5
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

      expect(html).toContain('WAMD Phone Number');
      expect(html).toContain('+965 51234567');
      expect(html).toContain('Kuwait mobile (8 digits)');
    });

    it('does NOT display WAMD Phone Number input when only Cash or Request Link is selected', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: {
          ...baseGame,
          costSharing: {
            enabled: true,
            methods: ['cash', 'request_link'],
            estimatedShare: 7.5
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
      expect(html).toContain('Select Cost-Sharing Method');
      expect(html).not.toContain('WAMD Phone Number');
    });
  });

  describe('3. WAMD Privacy in Game Details & Public Game Cards', () => {
    const wamdGame: Game = {
      ...baseGame,
      costSharing: {
        enabled: true,
        methods: ['wamd', 'cash', 'request_link'],
        wamdPhoneNumber: '+965 99887766',
        estimatedShare: 7.5
      }
    };

    it('displays WAMD phone number and Copy button to joined participants', () => {
      mockAppContextValue.current = {
        selectedGameForDetail: wamdGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [wamdGame],
        myGames: [],
        currentUser: { id: 'participant-user-2', name: 'Yousef Player' }, // Joined participant
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
        getGameWamdPhoneNumber: vi.fn().mockResolvedValue('+965 99887766'),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal />);

      // Participant sees host WAMD details and copy button
      expect(html).toContain('Host WAMD Details');
      expect(html).toContain('+965 99887766');
      expect(html).toContain('Copy Number');
      // Displays clear disclaimer that it's host-provided, not verified payment account
      expect(html).toContain('Number provided by the host. Not a verified payment account.');
    });

    it('HIDES WAMD phone number from non-participants viewing game details', () => {
      mockAppContextValue.current = {
        selectedGameForDetail: wamdGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [wamdGame],
        myGames: [],
        currentUser: { id: 'stranger-user-999', name: 'Stranger' }, // Not a participant
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
        getGameWamdPhoneNumber: vi.fn().mockResolvedValue(null),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal />);

      // Does NOT expose host phone number to strangers
      expect(html).not.toContain('+965 99887766');
      expect(html).not.toContain('Copy Number');
      expect(html).toContain('Visible after joining');
      expect(html).toMatch(/Join this game to view the host(&#x27;|')s WAMD phone number for payment\./);
    });

    it('NEVER exposes WAMD phone number on public GameCard cards', () => {
      mockAppContextValue.current = {
        currentUser: { id: 'guest-user', name: 'Guest' },
        setSelectedGameForDetail: vi.fn(),
        joinGame: vi.fn(),
        authStatus: 'unauthenticated',
        isDemoActive: true,
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameCard game={wamdGame} />);

      // Shows badge WAMD
      expect(html).toContain('WAMD');
      // Strictly does not expose the host phone number
      expect(html).not.toContain('99887766');
      expect(html).not.toContain('+965');
    });
  });

  describe('4. Request Payment Link Functionality', () => {
    const requestLinkGame: Game = {
      ...baseGame,
      costSharing: {
        enabled: true,
        methods: ['request_link'],
        estimatedShare: 7.5
      }
    };

    it('shows "Request Payment Link" to a joined participant when no request is pending', () => {
      mockAppContextValue.current = {
        selectedGameForDetail: requestLinkGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [requestLinkGame],
        myGames: [],
        currentUser: { id: 'participant-user-2', name: 'Yousef Player' },
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
        getPaymentLinkRequests: vi.fn().mockReturnValue([]),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal />);

      expect(html).toContain('Request Payment Link');
      expect(html).not.toContain('Request Pending');
    });

    it('displays "Request Pending" state when participant has an outstanding request', () => {
      const pendingReq: PaymentLinkRequest = {
        id: 'participant-user-2',
        gameId: requestLinkGame.id,
        requesterId: 'participant-user-2',
        requesterName: 'Yousef Player',
        hostId: 'organizer-user-1',
        status: 'pending',
        createdAt: '2026-09-24T12:00:00Z'
      };

      mockAppContextValue.current = {
        selectedGameForDetail: requestLinkGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [requestLinkGame],
        myGames: [],
        currentUser: { id: 'participant-user-2', name: 'Yousef Player' },
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
        getPaymentLinkRequests: vi.fn().mockReturnValue([pendingReq]),
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal />);

      // Shows outstanding Request Pending state
      expect(html).toContain('Request Pending');
    });

    it('allows host to view outstanding requests and shows "Mark Handled" and chat buttons in dashboard', () => {
      const pendingReq: PaymentLinkRequest = {
        id: 'participant-user-2',
        gameId: requestLinkGame.id,
        requesterId: 'participant-user-2',
        requesterName: 'Yousef Player',
        hostId: 'organizer-user-1',
        status: 'pending',
        createdAt: '2026-09-24T12:00:00Z'
      };

      mockAppContextValue.current = {
        selectedGameForDetail: requestLinkGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [requestLinkGame],
        myGames: [requestLinkGame],
        currentUser: { id: 'organizer-user-1', name: 'Fahad Organizer' }, // Is Host
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
        getPaymentLinkRequests: vi.fn().mockReturnValue([pendingReq]),
        t: tHelper
      };

      // In Organizer Dashboard view, host sees payment link requests, mark handled, and chat button
      const html = renderToStaticMarkup(<GameDetailModal initialTab="organizer" />);
      expect(html).toContain('Organizer Dashboard');
      expect(html).toContain('Payment Link Requests');
      expect(html).toContain('Yousef Player');
      expect(html).toContain('Mark Handled');
      expect(html).toContain('Chat with Player');
      expect(html).not.toContain('Request Payment Link'); // Host cannot request from themselves
    });
  });
});
