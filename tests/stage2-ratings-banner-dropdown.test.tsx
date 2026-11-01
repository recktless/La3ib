import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatPlayerRating } from '../src/types';
import { Header } from '../src/components/Header';
import { ProfileTab } from '../src/components/ProfileTab';
import { PlayerProfileModal } from '../src/components/PlayerProfileModal';
import { MyGamesTab } from '../src/components/MyGamesTab';
import { CURRENT_USER, MOCK_PLAYERS, INITIAL_GAMES } from '../src/data/mockData';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

describe('La3ib — Stage 2: 5-Star Player Rating System', () => {
  it('formats rated players correctly with 1 decimal precision in English and Arabic', () => {
    const playerWithRating = {
      rating: 4.82,
      ratingAverage: 4.8,
      ratingCount: 16
    };

    const enResult = formatPlayerRating(playerWithRating, 'en');
    expect(enResult.isRated).toBe(true);
    expect(enResult.scoreText).toBe('4.8');
    expect(enResult.countText).toBe('(16)');
    expect(enResult.fullLabel).toContain('★ 4.8/5 (16)');

    const arResult = formatPlayerRating(playerWithRating, 'ar');
    expect(arResult.isRated).toBe(true);
    expect(arResult.scoreText).toBe('4.8');
    expect(arResult.countText).toBe('(16 تقييم)');
  });

  it('formats unrated players gracefully as "Not rated yet" or "لم يتم التقييم بعد"', () => {
    const unratedPlayer = {
      rating: undefined,
      ratingAverage: undefined,
      ratingCount: 0
    };

    const enResult = formatPlayerRating(unratedPlayer, 'en');
    expect(enResult.isRated).toBe(false);
    expect(enResult.scoreText).toBe('—');
    expect(enResult.fullLabel).toBe('Not rated yet');

    const arResult = formatPlayerRating(unratedPlayer, 'ar');
    expect(arResult.isRated).toBe(false);
    expect(arResult.fullLabel).toBe('لم يتم التقييم بعد');
  });

  it('rejects self-rating and rating scores outside 1-5 stars at the security/API layer', async () => {
    const { submitPlayerRatingInFirestore } = await import('../src/lib/firebase');

    // Self-rating must throw
    await expect(
      submitPlayerRatingInFirestore('game-1', 'user-ahmed', 'user-ahmed', 5, 'Football')
    ).rejects.toThrow(/Self-rating is not allowed/i);

    // Score < 1 must throw
    await expect(
      submitPlayerRatingInFirestore('game-1', 'user-ahmed', 'user-salem', 0, 'Football')
    ).rejects.toThrow(/between 1 and 5/i);

    // Score > 5 must throw
    await expect(
      submitPlayerRatingInFirestore('game-1', 'user-ahmed', 'user-salem', 6, 'Football')
    ).rejects.toThrow(/between 1 and 5/i);
  });
});

describe('La3ib — Stage 2: Profile Banner Customization & Visitor Isolation', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: {
        ...CURRENT_USER,
        bannerUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80',
        rating: 4.8,
        ratingAverage: 4.8,
        ratingCount: 16
      },
      authStatus: 'authenticated',
      activeTab: 'profile',
      setActiveTab: vi.fn(),
      selectedPlayerProfile: null,
      setSelectedPlayerProfile: vi.fn(),
      profileSubView: 'profile',
      setProfileSubView: vi.fn(),
      openSettings: vi.fn(),
      followersList: [MOCK_PLAYERS[1]],
      followingList: [MOCK_PLAYERS[0]],
      friendIds: new Set([MOCK_PLAYERS[0].id]),
      blockedUserIds: new Set(),
      blockedPlayersList: [],
      isFollowing: vi.fn().mockReturnValue(false),
      isFollowingUser: vi.fn().mockReturnValue(false),
      isFollowActionLoading: vi.fn().mockReturnValue(false),
      getFriendshipStatus: vi.fn().mockReturnValue('none'),
      isFriendActionLoading: vi.fn().mockReturnValue(false),
      isBlockActionLoading: vi.fn().mockReturnValue(false),
      toggleFollowPlayer: vi.fn(),
      toggleFriendship: vi.fn(),
      updateUserBanner: vi.fn(),
      removeUserBannerAction: vi.fn(),
      updateCurrentUserProfile: vi.fn(),
      loadPlayerActivity: vi.fn().mockResolvedValue({
        gamesPlayed: 14,
        gamesHosted: 3,
        upcomingGames: 1,
        sportsPlayed: ['Football', 'Padel'],
        recentActivities: []
      }),
      t: (en: string) => en,
      language: 'en'
    };
  });

  it('renders banner editing controls and accepted file types on own profile', () => {
    const html = renderToStaticMarkup(<ProfileTab />);
    expect(html).toContain('Change Banner');
    expect(html).toContain('Remove Custom Banner');
    expect(html).toContain('type="file"');
    // Verifies 5-star player rating replaces attendance reliability
    expect(html).toContain('★ 4.8/5');
    expect(html).not.toContain('Attendance Reliability');
  });

  it('strictly hides banner editing controls from visitors in PlayerProfileModal', () => {
    mockAppContextValue.current.selectedPlayerProfile = {
      ...MOCK_PLAYERS[0],
      bannerUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80',
      rating: 4.9,
      ratingAverage: 4.9,
      ratingCount: 8
    };

    const html = renderToStaticMarkup(<PlayerProfileModal />);
    // Visitor should see the banner image
    expect(html).toContain('src="https://images.unsplash.com/photo-1574629810360-7efbbe195018');
    // Visitor MUST NOT see banner edit controls
    expect(html).not.toContain('Change Banner');
    expect(html).not.toContain('Remove Custom Banner');
    // Shows rating chip
    expect(html).toContain('★ 4.9/5');
  });
});

describe('La3ib — Stage 2: Header Account Dropdown Structure', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      authStatus: 'authenticated',
      activeTab: 'home',
      setActiveTab: vi.fn(),
      selectedPlayerProfile: null,
      setSelectedPlayerProfile: vi.fn(),
      profileSubView: 'profile',
      setProfileSubView: vi.fn(),
      openSettings: vi.fn(),
      logout: vi.fn(),
      isDemoActive: false,
      notifications: [],
      unreadNotificationCount: 0,
      t: (en: string) => en,
      language: 'en',
      sidebarCollapsed: false,
      setSidebarCollapsed: vi.fn(),
      isSidebarOpen: false,
      toggleSidebar: vi.fn(),
      isDesktopSidebarCollapsed: false,
      toggleDesktopSidebar: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      themePreference: 'system',
      effectiveTheme: 'light',
      setThemePreference: vi.fn(),
      setNotificationsModalOpen: vi.fn(),
      setSafetyModalOpen: vi.fn(),
      setAdminModalOpen: vi.fn(),
      setBookingModalOpen: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      setCreateGamePrefill: vi.fn()
    };
  });

  it('renders top-right user avatar button with account menu accessibility attributes on Home', () => {
    mockAppContextValue.current.activeTab = 'home';
    const html = renderToStaticMarkup(<Header />);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-label="User account menu"');
  });

  it('renders top-right user avatar button with account menu accessibility attributes on Discover', () => {
    mockAppContextValue.current.activeTab = 'discover';
    const html = renderToStaticMarkup(<Header />);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-label="User account menu"');
  });
});

describe('La3ib — Stage 2: My Games Ratings & Star Player Stats', () => {
  const completedGame: any = {
    id: 'game-completed-1',
    title: 'Completed Derby Clash',
    sport: 'Football',
    date: '2026-01-01',
    startTime: '18:00',
    endTime: '19:30',
    courtName: 'Bayan Sports Complex',
    area: 'Bayan',
    maxPlayers: 10,
    status: 'Completed',
    organizer: CURRENT_USER,
    participantIds: [CURRENT_USER.id, MOCK_PLAYERS[1].id],
    participants: [
      {
        userId: CURRENT_USER.id,
        name: CURRENT_USER.name,
        username: CURRENT_USER.username,
        avatar: CURRENT_USER.avatar,
        skill: 'Advanced'
      },
      {
        userId: MOCK_PLAYERS[1].id,
        name: MOCK_PLAYERS[1].name,
        username: MOCK_PLAYERS[1].username,
        avatar: MOCK_PLAYERS[1].avatar,
        skill: 'Advanced'
      }
    ]
  };

  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      authStatus: 'authenticated',
      myGames: [completedGame],
      games: [completedGame],
      myBookings: [],
      activeTab: 'my-games',
      setActiveTab: vi.fn(),
      getUserGameRatings: vi.fn().mockResolvedValue({}),
      submitPlayerRating: vi.fn().mockResolvedValue(true),
      cancelGame: vi.fn(),
      leaveGame: vi.fn(),
      openGameDetails: vi.fn(),
      setSelectedPlayerProfile: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      t: (en: string) => en,
      language: 'en'
    };
  });

  it('renders 5-star player rating summary stat instead of attendance percentage', () => {
    const html = renderToStaticMarkup(<MyGamesTab />);
    expect(html).toContain('Player Rating');
    expect(html).toContain('4.8/5');
    expect(html).not.toContain('Attendance Rate');
    expect(html).not.toContain('95%');
  });

  it('provides post-match sportsmanship rating widget for completed games', () => {
    const html = renderToStaticMarkup(<MyGamesTab defaultSubTab="past" />);
    expect(html).toContain('Match Ratings &amp; Sportsmanship');
    expect(html).toContain('Rate Match Players');
    expect(html).toContain('Salem Al-Otaibi');
  });
});
