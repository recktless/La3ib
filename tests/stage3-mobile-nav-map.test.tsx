import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BottomNav } from '../src/components/BottomNav';
import { Sidebar } from '../src/components/Sidebar';
import { Header } from '../src/components/Header';
import { CommunityTab } from '../src/components/CommunityTab';
import { KuwaitMapTab } from '../src/components/KuwaitMapTab';
import { CURRENT_USER, MOCK_PLAYERS, INITIAL_GAMES } from '../src/data/mockData';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

// Mock @vis.gl/react-google-maps for static test environments
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

describe('La3ib — Stage 3: Mobile-First Navigation', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      activeTab: 'home',
      setActiveTab: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      setCreateGamePrefill: vi.fn(),
      setBookingModalOpen: vi.fn(),
      setSafetyModalOpen: vi.fn(),
      setAdminModalOpen: vi.fn(),
      openSettings: vi.fn(),
      isSidebarOpen: false,
      setIsSidebarOpen: vi.fn(),
      isDesktopSidebarCollapsed: false,
      toggleDesktopSidebar: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      games: INITIAL_GAMES,
      language: 'en',
      setLanguage: vi.fn(),
      themePreference: 'system',
      setThemePreference: vi.fn(),
      t: (en: string) => en
    };
  });

  it('renders exactly five destinations in Mobile Bottom Navigation in strict order: Home, Community, Create, Map, Profile', () => {
    const html = renderToStaticMarkup(<BottomNav />);

    // Verify presence of all 5 destinations
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-label="Community"');
    expect(html).toContain('aria-label="Create Game"');
    expect(html).toContain('aria-label="Map"');
    expect(html).toContain('aria-label="Profile"');

    // Verify ordering
    const homePos = html.indexOf('aria-label="Home"');
    const commPos = html.indexOf('aria-label="Community"');
    const createPos = html.indexOf('aria-label="Create Game"');
    const mapPos = html.indexOf('aria-label="Map"');
    const profilePos = html.indexOf('aria-label="Profile"');

    expect(homePos).toBeLessThan(commPos);
    expect(commPos).toBeLessThan(createPos);
    expect(createPos).toBeLessThan(mapPos);
    expect(mapPos).toBeLessThan(profilePos);

    // Verify touch target size (~44px minimum touch targets)
    expect(html).toContain('min-h-[44px]');
    // Verify safe area insets
    expect(html).toContain('env(safe-area-inset-bottom)');
  });

  it('renders Desktop Sidebar with Home, Community, Map, My Games, and Profile', () => {
    const html = renderToStaticMarkup(<Sidebar />);

    expect(html).toContain('Home');
    expect(html).toContain('Community');
    expect(html).toContain('Map');
    expect(html).toContain('My Games');
    expect(html).toContain('Profile');

    // Quick actions
    expect(html).toContain('Create Game');
    expect(html).toContain('Book Directly');
  });

  it('renders My Games in the Mobile Drawer navigation', () => {
    mockAppContextValue.current.isSidebarOpen = true;
    const html = renderToStaticMarkup(<Sidebar />);

    expect(html).toContain('role="dialog"');
    expect(html).toContain('My Games');
    expect(html).toContain('Community Guidelines');
    expect(html).toContain('Settings');
  });
});

describe('La3ib — Stage 3: Community Games & Players View', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      games: INITIAL_GAMES,
      players: MOCK_PLAYERS,
      selectedSport: 'All',
      setSelectedSport: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      isGamesLoading: false,
      gamesError: null,
      refetchGames: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      setCreateGamePrefill: vi.fn(),
      setSelectedGameForDetail: vi.fn(),
      setSelectedPlayerProfile: vi.fn(),
      language: 'en',
      t: (en: string) => en
    };
  });

  it('provides Games and Players tab switcher beneath heading and does NOT contain the legacy List/Map toggle', () => {
    const html = renderToStaticMarkup(<CommunityTab />);

    expect(html).toContain('Community');
    expect(html).toContain('Games');
    expect(html).toContain('Players');

    // Legacy List / Map toggle must be removed from Community
    expect(html).not.toContain('>List<');
    expect(html).not.toContain('View Mode: Map');
  });

  it('includes expandable filters panel with Skill, Gender, Indoor AC, and Max Price', () => {
    const html = renderToStaticMarkup(<CommunityTab />);

    // Has filter toggle button and horizontal sport chips
    expect(html).toContain('Filters');
    expect(html).toContain('All Sports');
    expect(html).toContain('Football');
    expect(html).toContain('Padel');
  });
});

describe('La3ib — Stage 3: Dedicated Kuwait Google Map & Carousel', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      games: INITIAL_GAMES,
      selectedSport: 'All',
      setSelectedSport: vi.fn(),
      setSelectedGameForDetail: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      setCreateGamePrefill: vi.fn(),
      language: 'en',
      t: (en: string) => en
    };
  });

  it('renders Google Map canvas and compact game cards carousel', () => {
    const html = renderToStaticMarkup(<KuwaitMapTab />);

    // Renders map provider and canvas
    expect(html).toContain('data-testid="google-maps-provider"');
    expect(html).toContain('data-testid="google-map-canvas"');

    // Renders pins for available games
    expect(html).toContain('data-testid="google-map-marker"');

    // Renders floating recenter button
    expect(html).toContain('Recenter on Kuwait');

    // Renders compact horizontal game cards
    expect(html).toContain('spots left');
    expect(html).toContain('Details');
  });

  it('strictly excludes completed and cancelled games from map pins and carousel', () => {
    const cancelledOrCompletedGame: any = {
      id: 'game-cancelled-xyz',
      title: 'Cancelled Match Never On Map',
      sport: 'Football',
      date: '2026-10-30',
      startTime: '19:00',
      endTime: '20:30',
      courtName: 'Nowhere Court',
      area: 'Salmiya',
      maxPlayers: 10,
      status: 'Cancelled',
      organizer: CURRENT_USER,
      participants: []
    };

    mockAppContextValue.current.games = [cancelledOrCompletedGame];
    const html = renderToStaticMarkup(<KuwaitMapTab />);

    expect(html).not.toContain('Cancelled Match Never On Map');
    expect(html).toContain('No games found for this filter');
  });
});
