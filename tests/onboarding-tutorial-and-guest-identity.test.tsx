import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OnboardingTutorial } from '../src/components/OnboardingTutorial';
import { HomeTab } from '../src/components/HomeTab';
import { Sidebar } from '../src/components/Sidebar';
import { BottomNav } from '../src/components/BottomNav';
import { SettingsView } from '../src/components/SettingsView';
import { GUEST_USER } from '../src/context/AppContext';
import { CURRENT_USER, INITIAL_GAMES } from '../src/data/mockData';
import { DEFAULT_GUEST_AVATAR, resolvePlayerAvatar } from '../src/types';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current,
  GUEST_USER: {
    id: 'guest',
    uid: 'guest',
    name: 'Guest',
    nameAr: 'زائر',
    username: 'guest',
    avatar: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' fill='%23262626'/%3E%3Ccircle cx='64' cy='46' r='22' fill='%23737373'/%3E%3Cpath d='M28 108c0-19.882 16.118-36 36-36s36 16.118 36 36' fill='%23737373'/%3E%3C/svg%3E",
    photoURL: undefined,
    bannerUrl: undefined,
    area: 'Kuwait City',
    bio: '',
    favoriteSports: ['Football', 'Padel'],
    skills: { Football: 'Casual', Padel: 'Casual' },
    gamesPlayed: 0,
    gamesHosted: 0,
    attendanceRate: 100,
    isOrganizer: false,
    isAdmin: false,
    isDemoUser: false,
    privacy: { showAge: false, showPhone: false, allowDirectInvites: false }
  }
}));

describe('La3ib — Interactive Onboarding Tutorial & Guest Identity Verification', () => {
  const baseContext = {
    currentUser: GUEST_USER,
    authStatus: 'unauthenticated',
    firebaseUser: null,
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
    blockedPlayersList: [],
    t: (en: string, ar?: string) => (mockAppContextValue.current.language === 'ar' ? (ar || en) : en),
    isTutorialOpen: false,
    setIsTutorialOpen: vi.fn(),
    tutorialStep: 0,
    setTutorialStep: vi.fn(),
    startTutorial: vi.fn(),
    skipTutorial: vi.fn(),
    completeTutorial: vi.fn(),
    isNewlyRegistered: false,
    setIsNewlyRegistered: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Signed-Out User Identity & Guest Standards', () => {
    it('displays "Guest" in English greeting when unauthenticated', () => {
      mockAppContextValue.current = {
        ...baseContext,
        currentUser: GUEST_USER,
        authStatus: 'unauthenticated',
        language: 'en',
      };

      const html = renderToStaticMarkup(<HomeTab />);
      expect(html).toContain('Welcome, Guest');
      expect(html).not.toContain('Ahmed');
      expect(html).not.toContain('Ahmad');
    });

    it('displays "زائر" in Arabic greeting when unauthenticated', () => {
      mockAppContextValue.current = {
        ...baseContext,
        currentUser: GUEST_USER,
        authStatus: 'unauthenticated',
        language: 'ar',
      };

      const html = renderToStaticMarkup(<HomeTab />);
      expect(html).toContain('مرحباً بك، زائر');
      expect(html).not.toContain('أحمد');
      expect(html).not.toContain('Ahmed');
    });

    it('uses neutral silhouette avatar for guest accounts', () => {
      const guestAvatar = resolvePlayerAvatar(GUEST_USER);
      expect(guestAvatar).toBe(DEFAULT_GUEST_AVATAR);
      expect(guestAvatar).not.toContain('unsplash.com');
      expect(guestAvatar.startsWith('data:image/svg+xml')).toBe(true);
    });

    it('displays real authenticated user identity when authenticated', () => {
      const realUser = {
        ...CURRENT_USER,
        name: 'Mishari Al-Bader',
        nameAr: 'مشاري البدر',
      };

      mockAppContextValue.current = {
        ...baseContext,
        currentUser: realUser,
        authStatus: 'authenticated',
        firebaseUser: { uid: 'user-real-123' },
        language: 'en',
      };

      const html = renderToStaticMarkup(<HomeTab />);
      expect(html).toContain('Welcome back, Mishari');
    });
  });

  describe('2. Interactive Spotlight Walkthrough Component', () => {
    it('does not render tutorial when isTutorialOpen is false', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isTutorialOpen: false,
      };

      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toBe('');
    });

    it('renders Step 1 (Welcome) in English with dialog semantics and progress', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isTutorialOpen: true,
        tutorialStep: 0,
        language: 'en',
      };

      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('Welcome to La3ib!');
      expect(html).toContain('Find games, meet players, and organize matches across Kuwait.');
      expect(html).toContain('1 of 6');
      expect(html).toContain('Next');
      expect(html).toContain('Skip');
      expect(html).toContain('mask id="la3ib-spotlight-mask"');
    });

    it('renders Step 1 (Welcome) in Arabic with correct RTL translations', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isTutorialOpen: true,
        tutorialStep: 0,
        language: 'ar',
      };

      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toContain('مرحباً بك في لعيب!');
      expect(html).toContain('اعثر على مباريات، تعرف على لاعبين، ونظم ألعابك في مختلف مناطق الكويت.');
      expect(html).toContain('1 من 6');
      expect(html).toContain('التالي');
      expect(html).toContain('تخطي');
      expect(html).toContain('dir="rtl"');
    });

    it('renders Step 4 (Create Game) with proper content', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isTutorialOpen: true,
        tutorialStep: 3,
        language: 'en',
      };

      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toContain('Organize a game');
      expect(html).toContain('Create a match, choose a location, and invite players.');
      expect(html).toContain('4 of 6');
      expect(html).toContain('Next');
      expect(html).toContain('Back');
    });

    it('renders Step 6 (Profile) with "Get Started" completion button', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isTutorialOpen: true,
        tutorialStep: 5,
        language: 'en',
      };

      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toContain('Make it yours');
      expect(html).toContain('Add your favorite sports, skills, and profile details.');
      expect(html).toContain('6 of 6');
      expect(html).toContain('Get Started');
    });

    it('renders Step 6 (Profile) in Arabic with "ابدأ الآن"', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isTutorialOpen: true,
        tutorialStep: 5,
        language: 'ar',
      };

      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toContain('خصّص ملفك');
      expect(html).toContain('6 من 6');
      expect(html).toContain('ابدأ الآن');
    });
  });

  describe('3. Spotlight Targets in Navigation and Views', () => {
    it('includes data-tutorial="welcome" in HomeTab', () => {
      mockAppContextValue.current = {
        ...baseContext,
        language: 'en',
      };

      const html = renderToStaticMarkup(<HomeTab />);
      expect(html).toContain('data-tutorial="welcome"');
    });

    it('includes data-tutorial attributes for navigation items in Sidebar', () => {
      mockAppContextValue.current = {
        ...baseContext,
        isDesktopSidebarCollapsed: false,
      };

      const html = renderToStaticMarkup(<Sidebar />);
      expect(html).toContain('data-tutorial="nav-create"');
      expect(html).toContain('data-tutorial="nav-home"');
      expect(html).toContain('data-tutorial="nav-community"');
      expect(html).toContain('data-tutorial="nav-map"');
      expect(html).toContain('data-tutorial="nav-my-games"');
      expect(html).toContain('data-tutorial="nav-profile"');
    });

    it('includes data-tutorial attributes in BottomNav', () => {
      mockAppContextValue.current = {
        ...baseContext,
      };

      const html = renderToStaticMarkup(<BottomNav />);
      expect(html).toContain('data-tutorial="nav-home"');
      expect(html).toContain('data-tutorial="nav-community"');
      expect(html).toContain('data-tutorial="nav-create"');
      expect(html).toContain('data-tutorial="nav-map"');
      expect(html).toContain('data-tutorial="nav-profile"');
    });
  });

  describe('4. Settings Replay Tutorial Action', () => {
    it('renders a Replay Tutorial button in SettingsView', () => {
      mockAppContextValue.current = {
        ...baseContext,
        language: 'en',
      };

      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      expect(html).toContain('Replay Tutorial');
      expect(html).toContain('View Community &amp; Safety Guidelines');
    });

    it('renders Replay Tutorial in Arabic', () => {
      mockAppContextValue.current = {
        ...baseContext,
        language: 'ar',
      };

      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      expect(html).toContain('إعادة الجولة التعريفية');
      expect(html).toContain('عرض إرشادات المجتمع والسلامة');
    });
  });
});
