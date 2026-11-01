import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BottomNav } from '../src/components/BottomNav';
import { Header } from '../src/components/Header';
import { CURRENT_USER } from '../src/data/mockData';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

describe('La3ib UI Redesign V2: Layout & Visual Identity', () => {
  it('Header displays ONLY the official logo and no accompanying brand text', () => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      authStatus: 'authenticated',
      selectedCity: 'All Kuwait',
      searchQuery: '',
      setSearchQuery: vi.fn(),
      theme: 'light',
      toggleTheme: vi.fn(),
      language: 'en',
      toggleLanguage: vi.fn(),
      notifications: [],
      setNotificationsModalOpen: vi.fn(),
      setAuthModalOpen: vi.fn(),
      setAuthModalMode: vi.fn(),
      setActiveTab: vi.fn(),
      unreadNotificationsCount: 0,
      t: (en: string) => en,
    };

    const html = renderToStaticMarkup(<Header />);

    // Official logo image must be rendered
    expect(html).toMatch(/Playful_LA3IB_Arabic-English_Logo_40596055\.png|la3ib_logo_transparent\.png/);
    expect(html).toContain('alt="La3ib"');

    // No accompanying "La3ib" or "لاعب" text beside the logo in the brand container
    expect(html).not.toContain('<span class="text-xl font-black text-slate-900 dark:text-white tracking-tight">La3ib</span>');
    expect(html).not.toContain('لاعب');
  });

  it('Mobile Bottom Navigation does NOT contain the Players button', () => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      games: [],
      activeTab: 'home',
      setActiveTab: vi.fn(),
      setCreateGamePrefill: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      t: (en: string) => en,
    };

    const html = renderToStaticMarkup(<BottomNav />);

    // Players button must be removed from mobile bottom nav
    expect(html).not.toContain('aria-label="Players"');
    expect(html).not.toContain('>Players<');

    // Remaining 4 primary tabs + center action must be present in Stage 3
    expect(html).toContain('aria-label="Home"');
    expect(html).toContain('aria-label="Community"');
    expect(html).toContain('aria-label="Create Game"');
    expect(html).toContain('aria-label="Map"');
    expect(html).toContain('aria-label="Profile"');
  });
});
