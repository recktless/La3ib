import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BookDirectlyTab } from '../src/components/BookDirectlyTab';
import { Sidebar } from '../src/components/Sidebar';
import { BottomNav } from '../src/components/BottomNav';
import { GameCard } from '../src/components/GameCard';
import { HomeTab } from '../src/components/HomeTab';
import { CommunityTab } from '../src/components/CommunityTab';
import { MyGamesTab } from '../src/components/MyGamesTab';
import { Game } from '../src/types';

// Mock AppContext
const mockAppContextValue: { current: any } = {
  current: {
    activeTab: 'home',
    setActiveTab: vi.fn(),
    isSidebarOpen: false,
    setIsSidebarOpen: vi.fn(),
    isDesktopSidebarCollapsed: false,
    setIsDesktopSidebarCollapsed: vi.fn(),
    currentUser: {
      id: 'usr_me',
      uid: 'usr_me',
      name: 'Bader Al-Mutawa',
      username: 'bader_mutawa',
      area: 'Kuwait City',
      favoriteSports: ['Football'],
      privacy: { showAge: true, showPhone: false, allowDirectInvites: true }
    },
    games: [
      {
        id: 'game_1',
        title: 'Friday Morning Padel',
        sport: 'Padel',
        area: 'Salmiya',
        courtName: 'Padel Time Kuwait',
        date: '2026-11-01',
        startTime: '08:00',
        endTime: '09:30',
        maxPlayers: 4,
        participants: [
          { userId: 'usr_me', name: 'Bader Al-Mutawa', joinedAt: '2026-10-25' }
        ],
        organizer: { id: 'usr_me', name: 'Bader Al-Mutawa', username: 'bader_mutawa' },
        pricePerPlayerKWD: 5.0,
        skillLevel: 'Intermediate',
        gender: 'Men',
        status: 'Open'
      } as Game
    ],
    myGames: [],
    selectedSport: 'All',
    setSelectedSport: vi.fn(),
    selectedArea: 'All Kuwait',
    setSelectedArea: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    theme: 'system',
    setTheme: vi.fn(),
    language: 'en',
    setLanguage: vi.fn(),
    t: (en: string, ar: string) => en,
    formatTime: (time: string) => time,
    getParticipantCount: () => 1,
    isUserOrganizer: () => true,
    isUserParticipant: () => true,
    isGameFull: () => false,
    joinGame: vi.fn(),
    leaveGame: vi.fn(),
    setCreateGameModalOpen: vi.fn(),
    setCreateGamePrefill: vi.fn(),
    setSelectedGameForDetail: vi.fn(),
    authStatus: 'authenticated',
    blockedUserIds: new Set(),
    incomingFriendRequests: [],
    incomingGameInvites: [],
    myBookings: []
  }
};

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

describe('La3ib — Combined Stage 5 & 6: Book Directly & UI Softness', () => {
  describe('Task 1: Book Directly — Dedicated Coming Soon View', () => {
    it('renders BookDirectlyTab with clean, restrained coming soon content', () => {
      const html = renderToStaticMarkup(<BookDirectlyTab />);

      // Verify title & badges
      expect(html).toContain('Book Directly');
      expect(html).toContain('Coming Soon');

      // Verify authentic copy explaining the feature
      expect(html).toContain('simpler way to book sports venues directly through La3ib');
      expect(html).toContain('without leaving the app');

      // Verify soft aesthetic card
      expect(html).toContain('rounded-3xl');
      expect(html).toContain('shadow-sm');

      // Verify Back to Home action button with soft corners
      expect(html).toContain('Back to Home');
      expect(html).toContain('rounded-xl');

      // Must NOT contain fake courts or fake booking flow
      expect(html).not.toContain('Checkout');
      expect(html).not.toContain('Pay with KNET');
    });

    it('renders Sidebar with Book Directly navigation and Coming Soon pill', () => {
      const html = renderToStaticMarkup(<Sidebar />);

      expect(html).toContain('Book Directly');
      expect(html).toContain('Coming Soon');
      expect(html).not.toContain('Book Court (Li3ib)');
    });
  });

  describe('Task 2: UI Softness & Token Scale Refinement', () => {
    it('applies soft rounded tokens to GameCard (rounded-2xl card, rounded-full chips, rounded-xl buttons)', () => {
      const game = mockAppContextValue.current.games[0];
      const html = renderToStaticMarkup(<GameCard game={game} />);

      // Container card: rounded-2xl
      expect(html).toContain('rounded-2xl');

      // Status & sport chips: rounded-full
      expect(html).toContain('rounded-full');

      // Action buttons: rounded-xl
      expect(html).toContain('rounded-xl');
    });

    it('applies soft rounded-2xl styling to BottomNav primary Create action', () => {
      const html = renderToStaticMarkup(<BottomNav />);

      // Main center action button has softened rounded-2xl radius
      expect(html).toContain('rounded-2xl');
      expect(html).toContain('shadow-md');
    });

    it('softens HomeTab sports filters to rounded-full pills and quick action to rounded-xl', () => {
      const html = renderToStaticMarkup(<HomeTab />);

      expect(html).toContain('rounded-full');
      expect(html).toContain('rounded-xl');
      expect(html).toContain('Book Directly');
    });

    it('softens CommunityTab segmented switch to rounded-xl and sports chips to rounded-full', () => {
      const html = renderToStaticMarkup(<CommunityTab />);

      expect(html).toContain('rounded-xl');
      expect(html).toContain('rounded-full');
      expect(html).toContain('rounded-2xl');
    });

    it('uses neutral Court Bookings in MyGamesTab and softens cards to rounded-2xl', () => {
      const html = renderToStaticMarkup(<MyGamesTab />);

      expect(html).toContain('Court Bookings');
      expect(html).not.toContain('Li3ib Bookings');
      expect(html).toContain('rounded-2xl');
    });
  });
});
