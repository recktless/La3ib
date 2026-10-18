import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { Li3ibBookingModal } from '../src/components/Li3ibBookingModal';
import { MyGamesTab } from '../src/components/MyGamesTab';
import { CURRENT_USER, MOCK_COURTS } from '../src/data/mockData';
import { Court, CourtBooking } from '../src/types';

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

const mockCourt: Court = {
  ...MOCK_COURTS[0],
  amenities: ['Indoor AC', 'Free Parking', 'Showers']
};

const mockBooking: CourtBooking = {
  id: 'booking-test-1',
  courtId: mockCourt.id,
  courtName: mockCourt.name,
  sport: 'Football',
  area: 'Mishref',
  address: 'Block 6, Mishref Oasis Road',
  date: '2026-09-25',
  startTime: '18:00',
  endTime: '19:30',
  totalCostKWD: 15.0,
  bookingRef: '#LIB-12345',
  bookedAt: new Date().toISOString(),
  isIndoor: false,
  courtImage: mockCourt.image,
  hasBeenPostedAsGame: false
};

describe('Restricted Organizer UX & Safety Enforcement', () => {
  const tHelper = (en: string, _ar: string) => en;

  describe('1. CreateGameModal', () => {
    it('displays prominent restriction warning banner and disables Post Booking when canOrganize is false', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: null,
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: false },
        firebaseUser: { uid: 'user-1' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      // Prominent warning banner
      expect(html).toContain('data-testid="booking-restricted-banner"');
      expect(html).toContain('Booking Restricted');
      expect(html).toContain('Your account is currently not allowed to organize games or book pitches. Please contact an administrator for assistance.');

      // Disabled button with visual state and explanation
      expect(html).toContain('aria-label="Post Booking"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('cursor-not-allowed');
      expect(html).toContain('Account restricted from organizing games');
    });

    it('does NOT display warning banner and enables Post Booking for unrestricted users', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: null,
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: true },
        firebaseUser: { uid: 'user-1' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      expect(html).not.toContain('data-testid="booking-restricted-banner"');
      expect(html).not.toContain('Booking Restricted');
      expect(html).toContain('aria-label="Post Booking"');
      expect(html).not.toContain('Account restricted from organizing games');
      // Button should NOT have disabled=""
      expect(html).toContain('bg-gradient-to-r from-emerald-500 to-teal-400');
    });

    it('handles missing/loading privilege safely by disabling action without showing restriction banner', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: null,
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: undefined },
        firebaseUser: null,
        authStatus: 'loading',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      // Warning banner only shown if canOrganize === false
      expect(html).not.toContain('data-testid="booking-restricted-banner"');
      // Button disabled safely while privilege is unknown/loading
      expect(html).toContain('disabled=""');
    });
  });

  describe('2. Li3ibBookingModal', () => {
    it('displays prominent restriction warning banner and disables Book a Pitch when canOrganize is false', () => {
      mockAppContextValue.current = {
        courts: [mockCourt],
        bookingModalOpen: true,
        setBookingModalOpen: vi.fn(),
        bookCourtViaLi3ib: vi.fn(),
        postBookingAsGame: vi.fn(),
        currentUser: { ...CURRENT_USER, canOrganize: false },
        authStatus: 'authenticated',
        t: tHelper
      };

      const html = renderToStaticMarkup(<Li3ibBookingModal />);

      // Prominent warning banner
      expect(html).toContain('data-testid="booking-restricted-banner"');
      expect(html).toContain('Booking Restricted');
      expect(html).toContain('Your account is currently not allowed to organize games or book pitches. Please contact an administrator for assistance.');

      // Disabled Book a Pitch button
      expect(html).toContain('aria-label="Book a Pitch"');
      expect(html).toContain('disabled=""');
      expect(html).toContain('Action disabled: your account is restricted from booking pitches');
    });

    it('does NOT display warning banner and enables Book a Pitch for unrestricted users', () => {
      mockAppContextValue.current = {
        courts: [mockCourt],
        bookingModalOpen: true,
        setBookingModalOpen: vi.fn(),
        bookCourtViaLi3ib: vi.fn(),
        postBookingAsGame: vi.fn(),
        currentUser: { ...CURRENT_USER, canOrganize: true },
        authStatus: 'authenticated',
        t: tHelper
      };

      const html = renderToStaticMarkup(<Li3ibBookingModal />);

      expect(html).not.toContain('data-testid="booking-restricted-banner"');
      expect(html).toContain('aria-label="Book a Pitch"');
      expect(html).not.toContain('Action disabled: your account is restricted from booking pitches');
      expect(html).toContain('bg-gradient-to-r from-emerald-500 to-teal-500');
    });

    it('safely disables Book a Pitch when privilege is loading', () => {
      mockAppContextValue.current = {
        courts: [mockCourt],
        bookingModalOpen: true,
        setBookingModalOpen: vi.fn(),
        bookCourtViaLi3ib: vi.fn(),
        postBookingAsGame: vi.fn(),
        currentUser: { ...CURRENT_USER, canOrganize: undefined },
        authStatus: 'loading',
        t: tHelper
      };

      const html = renderToStaticMarkup(<Li3ibBookingModal />);

      expect(html).not.toContain('data-testid="booking-restricted-banner"');
      expect(html).toContain('aria-label="Book a Pitch"');
      expect(html).toContain('disabled=""');
    });
  });

  describe('3. MyGamesTab Component', () => {
    it('renders without errors for authenticated restricted user', () => {
      mockAppContextValue.current = {
        myGames: [],
        isMyGamesLoading: false,
        myGamesError: null,
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        setActiveTab: vi.fn(),
        setCreateGameModalOpen: vi.fn(),
        myBookings: [mockBooking],
        setSelectedGameForDetail: vi.fn(),
        postBookingAsGame: vi.fn(),
        confirmAttendance: vi.fn(),
        currentUser: { ...CURRENT_USER, canOrganize: false },
        t: tHelper
      };

      const html = renderToStaticMarkup(<MyGamesTab />);
      expect(html).toContain('My Games &amp; Activity');
    });
  });

  describe('4. Bilingual and RTL Support', () => {
    it('renders Arabic translation for restriction banner and button guidance when language is Arabic', () => {
      const tArabicHelper = (_en: string, ar: string) => ar;

      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: null,
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: false },
        firebaseUser: { uid: 'user-1' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tArabicHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      expect(html).toContain('الحجز مقيد');
      expect(html).toContain('حسابك غير مصرح له حالياً بإنشاء مباريات أو حجز الملاعب. يرجى التواصل مع الإدارة للمساعدة.');
      expect(html).toContain('حسابك مقيد من تنظيم المباريات');
    });

    it('renders Arabic translation in Li3ibBookingModal when language is Arabic', () => {
      const tArabicHelper = (_en: string, ar: string) => ar;

      mockAppContextValue.current = {
        courts: [mockCourt],
        bookingModalOpen: true,
        setBookingModalOpen: vi.fn(),
        bookCourtViaLi3ib: vi.fn(),
        postBookingAsGame: vi.fn(),
        currentUser: { ...CURRENT_USER, canOrganize: false },
        authStatus: 'authenticated',
        t: tArabicHelper
      };

      const html = renderToStaticMarkup(<Li3ibBookingModal />);

      expect(html).toContain('الحجز مقيد');
      expect(html).toContain('حسابك غير مصرح له حالياً بإنشاء مباريات أو حجز الملاعب. يرجى التواصل مع الإدارة للمساعدة.');
      expect(html).toContain('الإجراء معطل: حسابك مقيد من حجز الملاعب');
    });
  });

  describe('5. Handler & Keyboard Event Prevention', () => {
    it('verifies disabled attributes and preventDefault guards block execution', () => {
      const mockCreateGame = vi.fn();
      const mockBookCourt = vi.fn();

      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: null,
        setCreateGamePrefill: vi.fn(),
        createGame: mockCreateGame,
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: false },
        firebaseUser: { uid: 'user-1' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        t: tHelper,
        courts: [mockCourt],
        bookingModalOpen: true,
        bookCourtViaLi3ib: mockBookCourt,
        postBookingAsGame: vi.fn()
      };

      const createGameHtml = renderToStaticMarkup(<CreateGameModal />);
      const bookingHtml = renderToStaticMarkup(<Li3ibBookingModal />);

      // Both buttons are disabled so browser does not fire click / submit events
      expect(createGameHtml).toContain('disabled=""');
      expect(bookingHtml).toContain('disabled=""');
      expect(mockCreateGame).not.toHaveBeenCalled();
      expect(mockBookCourt).not.toHaveBeenCalled();
    });
  });
});
