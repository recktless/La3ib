import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sidebar } from '../src/components/Sidebar';
import { Header } from '../src/components/Header';
import { HomeTab } from '../src/components/HomeTab';
import { CURRENT_USER, INITIAL_GAMES } from '../src/data/mockData';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

describe('La3ib — Desktop Sidebar, Navigation & Visual Cleanup', () => {
  const baseContext = {
    currentUser: CURRENT_USER,
    authStatus: 'authenticated',
    games: INITIAL_GAMES,
    activeTab: 'home',
    setActiveTab: vi.fn(),
    selectedArea: 'All Kuwait',
    setSelectedArea: vi.fn(),
    selectedSport: 'All',
    setSelectedSport: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    language: 'en',
    setLanguage: vi.fn(),
    themePreference: 'light',
    effectiveTheme: 'light',
    setThemePreference: vi.fn(),
    isSidebarOpen: false,
    setIsSidebarOpen: vi.fn(),
    toggleSidebar: vi.fn(),
    isDesktopSidebarCollapsed: false,
    setIsDesktopSidebarCollapsed: vi.fn(),
    toggleDesktopSidebar: vi.fn(),
    setBookingModalOpen: vi.fn(),
    setCreateGameModalOpen: vi.fn(),
    setCreateGamePrefill: vi.fn(),
    setNotificationsModalOpen: vi.fn(),
    setSafetyModalOpen: vi.fn(),
    setAdminModalOpen: vi.fn(),
    notifications: [],
    t: (en: string, _ar?: string) => en,
  };

  describe('1. Expanded Desktop Sidebar State', () => {
    it('renders official logo in sidebar and keeps header desktop logo hidden', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isDesktopSidebarCollapsed: false,
      };

      const sidebarHtml = renderToStaticMarkup(<Sidebar />);
      const headerHtml = renderToStaticMarkup(<Header />);

      // Sidebar has official logo
      expect(sidebarHtml).toContain('Playful_LA3IB_Arabic-English_Logo_40596055.png');
      expect(sidebarHtml).toContain('Collapse sidebar');

      // Desktop header does NOT display the logo (it has lg:hidden)
      expect(headerHtml).toContain('lg:hidden');
      // No duplicate "+ Create Game" button in header when sidebar is expanded
      expect(headerHtml).not.toContain('أنشئ مباراة');
      // No duplicate language or theme toggle on desktop in header
      expect(headerHtml).not.toContain('hidden sm:flex" title="Switch Language"');
    });

    it('HomeTab hides greeting quick-action buttons on desktop when sidebar is expanded', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isDesktopSidebarCollapsed: false,
      };

      const homeHtml = renderToStaticMarkup(<HomeTab />);
      expect(homeHtml).toContain('flex lg:hidden');
    });
  });

  describe('2. Collapsed Desktop Sidebar State', () => {
    it('collapses sidebar completely and renders official logo and expand button in desktop header', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isDesktopSidebarCollapsed: true,
      };

      const sidebarHtml = renderToStaticMarkup(<Sidebar />);
      const headerHtml = renderToStaticMarkup(<Header />);

      // Sidebar aside is hidden
      expect(sidebarHtml).toContain('hidden flex-col');

      // Header displays desktop expand button and official logo on desktop
      expect(headerHtml).toContain('Expand sidebar');
      expect(headerHtml).toContain('Playful_LA3IB_Arabic-English_Logo_40596055.png');

      // Header displays + Create Game and overflow menu
      expect(headerHtml).toContain('Create Game');
      expect(headerHtml).toContain('More actions &amp; settings');
    });

    it('HomeTab displays greeting quick actions when sidebar is collapsed', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isDesktopSidebarCollapsed: true,
      };

      const homeHtml = renderToStaticMarkup(<HomeTab />);
      expect(homeHtml).toContain('flex items-center gap-2 shrink-0');
      expect(homeHtml).not.toContain('flex lg:hidden');
    });
  });
});
