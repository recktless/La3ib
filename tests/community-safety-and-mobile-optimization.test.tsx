import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommunityGuidelinesTab } from '../src/components/CommunityGuidelinesTab';
import { La3ibLogo } from '../src/components/La3ibLogo';
import { Header } from '../src/components/Header';
import { Sidebar } from '../src/components/Sidebar';
import { SettingsView } from '../src/components/SettingsView';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock AppContext
const mockAppContextValue = { current: {} as any };

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current,
  AppContext: {
    Provider: ({ children }: any) => children,
    Consumer: ({ children }: any) => children(mockAppContextValue.current),
  },
}));

describe('Community Safety, Universal Mobile Optimization & Logo Consistency', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      activeTab: 'guidelines',
      setActiveTab: vi.fn(),
      profileSubView: 'profile',
      setProfileSubView: vi.fn(),
      language: 'en',
      setLanguage: vi.fn(),
      t: (en: string, ar: string) => mockAppContextValue.current.language === 'ar' ? (ar || en) : en,
      currentUser: {
        id: 'user_1',
        name: 'Fahad Al-Mutawa',
        username: 'fahad',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
        isAdmin: false,
      },
      authStatus: 'authenticated',
      submitReport: vi.fn().mockResolvedValue(undefined),
      blockedUserIds: new Set(['user_2']),
      blockedPlayersList: [
        {
          id: 'user_2',
          name: 'Ahmed Test',
          username: 'ahmed_t',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
        },
      ],
      unblockPlayer: vi.fn().mockResolvedValue(undefined),
      isBlockActionLoading: vi.fn().mockReturnValue(false),
      games: [],
      notifications: [],
      isSidebarOpen: false,
      setIsSidebarOpen: vi.fn(),
      isDesktopSidebarCollapsed: false,
      setIsDesktopSidebarCollapsed: vi.fn(),
      setNotificationsModalOpen: vi.fn(),
      unreadNotificationsCount: 0,
      themePreference: 'system',
      effectiveTheme: 'light',
      setThemePreference: vi.fn(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
    };
  });

  describe('1. Community Guidelines & Safety Page', () => {
    it('renders all 9 required community safety sections in English', () => {
      mockAppContextValue.current.language = 'en';
      const html = renderToStaticMarkup(<CommunityGuidelinesTab />);

      // Section 1: Respect & Sportsmanship
      expect(html).toContain('1. Respect and Sportsmanship');
      // Section 2: Harassment & Discrimination
      expect(html).toContain('2. Harassment and Discrimination');
      // Section 3: Safe Real-World Participation
      expect(html).toContain('3. Safe Real-World Participation');
      // Section 4: Honest Game Listings
      expect(html).toContain('4. Honest Game Listings');
      // Section 5: Organizer Responsibilities
      expect(html).toContain('5. Organizer Responsibilities');
      // Section 6: Payments, Cost-Sharing & Scams
      expect(html).toContain('6. Payments, Cost-Sharing &amp; Scams');
      // Section 7: Privacy and Personal Data
      expect(html).toContain('7. Privacy and Personal Data');
      // Section 8: Reporting and Blocking
      expect(html).toContain('8. Reporting and Blocking');
      // Section 9: Consequences of Violations
      expect(html).toContain('9. Consequences of Violations');

      // Working actions presence
      expect(html).toContain('Report User / Match');
      expect(html).toContain('Manage Blocked Athletes');
      expect(html).toContain('Submit Safety Inquiry');
    });

    it('renders all 9 sections in Arabic when language is ar', () => {
      mockAppContextValue.current.language = 'ar';
      const html = renderToStaticMarkup(<CommunityGuidelinesTab />);

      expect(html).toContain('إرشادات المجتمع والسلامة');
      expect(html).toContain('١. الاحترام والروح الرياضية');
      expect(html).toContain('٢. منع التحرش والتمييز');
      expect(html).toContain('٣. المشاركة الآمنة على أرض الملعب');
      expect(html).toContain('٤. الإعلانات الصادقة للمباريات');
      expect(html).toContain('٥. مسؤوليات المنظمين');
      expect(html).toContain('٦. المدفوعات والتقاسم العادل للتكاليف');
      expect(html).toContain('٧. الخصوصية وحماية البيانات الشخصية');
      expect(html).toContain('٨. الإبلاغ وحظر المستخدمين');
      expect(html).toContain('٩. عواقب مخالفة الإرشادات');
    });
  });

  describe('2. Navigation Entry Points to Guidelines', () => {
    it('provides navigation to guidelines in Header', () => {
      const html = renderToStaticMarkup(<Header />);
      expect(html).toContain('Community &amp; Safety Guidelines');
    });

    it('provides navigation to guidelines in Sidebar', () => {
      const html = renderToStaticMarkup(<Sidebar />);
      expect(html).toContain('Community Guidelines');
    });

    it('provides navigation to guidelines from SettingsView', () => {
      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );
      expect(html).toContain('View Community &amp; Safety Guidelines');
    });
  });

  describe('3. Canonical Logo Consistency', () => {
    it('renders the canonical 3:2 logo asset with aspect ratio containment', () => {
      const html = renderToStaticMarkup(<La3ibLogo size="header" />);

      expect(html).toContain('/assets/aistudio/Playful_LA3IB_Arabic-English_Logo_40596055.png');
      expect(html).toContain('aspect-[3/2]');
      expect(html).toContain('object-contain');
      expect(html).toContain('alt="La3ib"');
      expect(html).toContain('width="1536"');
      expect(html).toContain('height="1024"');
    });

    it('applies the reduced ~25-30% header logo dimensions', () => {
      const html = renderToStaticMarkup(<La3ibLogo size="header" />);
      expect(html).toContain('h-8 sm:h-9 lg:h-10 w-[48px] sm:w-[54px] lg:w-[60px]');
    });

    it('supports multiple standard sizes without distortion', () => {
      const htmlXs = renderToStaticMarkup(<La3ibLogo size="xs" />);
      expect(htmlXs).toContain('h-5 w-[30px]');
      expect(htmlXs).toContain('aspect-[3/2]');

      const htmlMd = renderToStaticMarkup(<La3ibLogo size="md" />);
      expect(htmlMd).toContain('h-9 w-[54px]');
      expect(htmlMd).toContain('aspect-[3/2]');

      const htmlLg = renderToStaticMarkup(<La3ibLogo size="lg" />);
      expect(htmlLg).toContain('h-12 sm:h-14 w-[72px] sm:w-[84px]');
      expect(htmlLg).toContain('aspect-[3/2]');
    });
  });

  describe('4. Mobile Viewport & CSS Optimization', () => {
    it('index.html has viewport-fit=cover and allows user zooming', () => {
      const indexPath = resolve(process.cwd(), 'index.html');
      const indexHtml = readFileSync(indexPath, 'utf-8');

      expect(indexHtml).toContain('viewport-fit=cover');
      expect(indexHtml).not.toContain('user-scalable=no');
      expect(indexHtml).not.toContain('maximum-scale=1.0');
    });

    it('index.css contains 16px font-size protection for mobile inputs', () => {
      const cssPath = resolve(process.cwd(), 'src/index.css');
      const css = readFileSync(cssPath, 'utf-8');

      expect(css).toContain('max-width: 640px');
      expect(css).toMatch(/font-size:\s*16px\s*!important/);
      expect(css).toContain('env(safe-area-inset-bottom');
    });

    it('modals utilize dynamic viewport height (dvh) boundaries', () => {
      const modalFiles = [
        'src/components/CreateGameModal.tsx',
        'src/components/GameDetailModal.tsx',
        'src/components/PlayerProfileModal.tsx',
        'src/components/NotificationsModal.tsx',
        'src/components/AuthModal.tsx',
        'src/components/AdminPanelModal.tsx',
        'src/components/ResetPasswordModal.tsx',
      ];

      for (const file of modalFiles) {
        const filePath = resolve(process.cwd(), file);
        const content = readFileSync(filePath, 'utf-8');
        expect(content).toMatch(/max-h-\[\d+dvh\]/);
      }
    });
  });
});
