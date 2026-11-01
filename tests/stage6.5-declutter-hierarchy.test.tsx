import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GameCard } from '../src/components/GameCard';
import { PlayerDiscoveryTab } from '../src/components/PlayerDiscoveryTab';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { HomeTab } from '../src/components/HomeTab';
import { INITIAL_GAMES, CURRENT_USER, MOCK_PLAYERS } from '../src/data/mockData';
import { Game } from '../src/types';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

// Mock Google Maps component
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: any) => <div data-testid="google-maps-provider">{children}</div>,
  Map: ({ children }: any) => <div data-testid="google-map-canvas">{children}</div>,
  Marker: (props: any) => <div data-testid="google-map-marker" data-title={props.title} />,
  useMap: () => ({
    panTo: vi.fn(),
    setZoom: vi.fn()
  }),
  useMapsLibrary: () => null
}));

describe('Stage 6.5: UI Decluttering & Information Hierarchy', () => {
  const tHelper = (en: string, _ar?: string) => en;

  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      players: MOCK_PLAYERS,
      games: INITIAL_GAMES,
      activeTab: 'home',
      setActiveTab: vi.fn(),
      setSelectedGameForDetail: vi.fn(),
      openJoinPaymentModal: vi.fn(),
      setPlayerProfileModalUser: vi.fn(),
      createGameModalOpen: true,
      setCreateGameModalOpen: vi.fn(),
      createGamePrefill: null,
      setCreateGamePrefill: vi.fn(),
      createGame: vi.fn(),
      updateGame: vi.fn(),
      selectedSport: null,
      setSelectedSport: vi.fn(),
      language: 'en',
      t: tHelper,
      followingPlayerIds: [],
      toggleFollowPlayer: vi.fn(),
      isFollowingUser: vi.fn().mockReturnValue(false),
      isFollowActionLoading: vi.fn().mockReturnValue(false),
      friendIds: [],
      sendFriendRequest: vi.fn(),
      getFriendshipStatus: vi.fn().mockReturnValue('none'),
      isFriendActionLoading: vi.fn().mockReturnValue(false),
      incomingFriendRequests: [],
      outgoingFriendRequests: [],
      incomingGameInvites: [],
      blockedUserIds: new Set(),
      firebaseUser: { uid: CURRENT_USER.id },
      authStatus: 'authenticated',
      setAuthModalOpen: vi.fn(),
      setAuthModalMode: vi.fn()
    };
  });

  describe('1. GameCard Compact 2-Second Scannable Hierarchy', () => {
    it('renders the core 5 key data points cleanly without bulky progress bars or bio text', () => {
      const testGame: Game = {
        ...INITIAL_GAMES[0],
        title: 'Friday 5v5 Turf Match ⚽',
        sport: 'Football',
        date: '2026-10-30',
        startTime: '19:00',
        endTime: '20:30',
        courtName: 'Bayan Youth Pitch',
        area: 'Hawalli',
        maxPlayers: 10,
        organizer: {
          ...INITIAL_GAMES[0].organizer,
          id: 'other-organizer-id'
        },
        participants: [
          {
            userId: 'other-user-1',
            name: 'Ali Player',
            username: 'ali_p',
            avatar: 'https://example.com/avatar.jpg',
            skill: 'Intermediate',
            paymentStatus: 'Paid',
            paidAmountKWD: 2.0,
            joinedAt: '2026-10-28T10:00:00Z',
            attendanceConfirmed: false
          }
        ],
        costSharing: {
          enabled: true,
          method: 'wamd',
          estimatedShare: 2.0
        }
      };

      const html = renderToStaticMarkup(<GameCard game={testGame} />);

      // 1. Sport tag
      expect(html).toContain('Football');
      // 2. Title
      expect(html).toContain('Friday 5v5 Turf Match ⚽');
      // 3. Date & Time
      expect(html).toContain('2026-10-30');
      expect(html).toMatch(/7:00 PM|19:00/);
      // 4. Venue & Area
      expect(html).toContain('Bayan Youth Pitch');
      expect(html).toContain('Hawalli');
      // 5. Spots available
      expect(html).toContain('9 spots left');
      // 6. Cost sharing estimate
      expect(html).toContain('Estimated Share');
      expect(html).toContain('2.000');
      expect(html).toContain('(Estimate)');

      // Decluttering check: No bulky progress bar or repetitive paragraphs
      expect(html).not.toContain('bg-gradient-to-r from-[#1246DF]');
    });

    it('renders free games cleanly with Free indicator', () => {
      const freeGame: Game = {
        ...INITIAL_GAMES[1],
        costSharing: { enabled: false }
      };

      const html = renderToStaticMarkup(<GameCard game={freeGame} />);
      expect(html).toContain('None (Free)');
    });
  });

  describe('2. HomeTab Feed Decluttering', () => {
    it('presents a clean match count and fast link to Community without text bloat', () => {
      const html = renderToStaticMarkup(<HomeTab />);

      // Contains clean match count
      expect(html).toContain('matches in Kuwait');
      expect(html).toContain('Community');
    });
  });

  describe('3. Player Card Social Simplicity', () => {
    it('displays player cards with clear Instagram/Strava inspired minimalism', () => {
      const html = renderToStaticMarkup(<PlayerDiscoveryTab />);

      // Displays player display name, username, and primary sport
      const otherPlayer = MOCK_PLAYERS.find(p => p.id !== CURRENT_USER.id)!;
      expect(html).toContain(otherPlayer.name);
      expect(html).toContain(`@${otherPlayer.username}`);
      expect(html).toContain(otherPlayer.favoriteSports[0]);
    });
  });

  describe('4. CreateGameModal 5-Section Progressive Organization', () => {
    it('visually groups the create form into 5 clean sections with numbered headers', () => {
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Section 1: Game Basics
      expect(html).toContain('Game Basics');
      expect(html).toContain('Game Name');
      expect(html).toContain('Sport');
      expect(html).toContain('Skill Level');

      // Section 2: Date & Time
      expect(html).toContain('Date &amp; Time');
      expect(html).toContain('Start Time');
      expect(html).toContain('End Time');
      expect(html).toContain('Open date picker');
      expect(html).toContain('Open start time picker');
      expect(html).toContain('Open end time picker');

      // Section 3: Location
      expect(html).toContain('Location');
      expect(html).toContain('Court / Venue');
      expect(html).toContain('Address / Landmark');

      // Section 4: Players & Preferences
      expect(html).toContain('Players &amp; Preferences');
      expect(html).toContain('Max Players');
      expect(html).toContain('Gender Preference');
      expect(html).toContain('Game Visibility');
      expect(html).toContain('Quick Invite Friends (Optional)');

      // Section 5: Booking & Cost Sharing (Optional)
      expect(html).toContain('Booking &amp; Cost Sharing (Optional)');
      expect(html).toContain('Upload Your Booking');
      expect(html).toContain('Optional');
      expect(html).toContain('booking-file-input');
      expect(html).toContain('Court Cost &amp; Estimates');
      expect(html).toContain('Total Court Cost (KWD)');
      expect(html).toContain('Split the cost with players');
    });
  });
});
