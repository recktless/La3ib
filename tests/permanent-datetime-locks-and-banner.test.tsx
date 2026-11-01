import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { ProfileTab } from '../src/components/ProfileTab';
import { PlayerProfileModal } from '../src/components/PlayerProfileModal';
import { CURRENT_USER, INITIAL_GAMES } from '../src/data/mockData';
import fs from 'fs';
import path from 'path';

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

describe('Permanent Date & Time Locks and Default Profile Banner', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      activeTab: 'home',
      setActiveTab: vi.fn(),
      createGameModalOpen: true,
      setCreateGameModalOpen: vi.fn(),
      createGamePrefill: null,
      setCreateGamePrefill: vi.fn(),
      createGame: vi.fn(),
      updateGame: vi.fn(),
      players: [],
      followersList: [],
      followingList: [],
      friendsList: [],
      blockedPlayersList: [],
      blockedUserIds: new Set<string>(),
      selectedPlayerProfile: null,
      setSelectedPlayerProfile: vi.fn(),
      getFriendshipStatus: () => 'none',
      isFriendActionLoading: () => false,
      sendFriendRequest: vi.fn(),
      cancelFriendRequest: vi.fn(),
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
      blockPlayer: vi.fn(),
      submitReport: vi.fn(),
      isDemoActive: false,
      loadPlayerActivity: vi.fn(),
      unblockPlayer: vi.fn(),
      isBlockActionLoading: () => false,
      isFollowingUser: () => false,
      toggleFollowPlayer: vi.fn(),
      isFollowActionLoading: () => false,
      firebaseUser: null,
      authStatus: 'authenticated',
      setAuthModalOpen: vi.fn(),
      setAuthModalMode: vi.fn(),
      games: INITIAL_GAMES,
      selectedSport: null,
      setSelectedSport: vi.fn(),
      setSelectedGameForDetail: vi.fn(),
      language: 'en',
      t: (en: string) => en,
      authModalOpen: false,
      authModalMode: 'login',
      loginWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      loginWithGoogleAuth: vi.fn(),
      sendPasswordResetEmailAction: vi.fn(),
      continueAsDemo: vi.fn().mockResolvedValue(false),
      logout: vi.fn(),
      profileSubView: 'profile',
      setProfileSubView: vi.fn()
    };
  });

  describe('Part 1: Permanent Date & Time Locks on Confirmed Bookings', () => {
    it('allows manual editing when no booking is attached', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const markup = renderToStaticMarkup(<CreateGameModal />);

      // Tap to change time is visible for manual games
      expect(markup).toContain('Tap to change time');
      // Inputs are not disabled for date
      expect(markup).not.toMatch(/type="date"[^>]*disabled/);
    });

    it('strictly locks Date, Start Time, and End Time when a confirmed booking is attached', () => {
      mockAppContextValue.current.createGamePrefill = {
        title: 'Argan Bedaya Volleyball',
        sport: 'Volleyball',
        date: '2026-10-25',
        startTime: '15:00',
        endTime: '17:00',
        courtName: 'Argan Bedaya',
        area: 'Sabah Al-Salem',
        totalCourtCostKWD: 30,
        bookingConfirmationUrl: '/assets/aistudio/sample.png'
      };

      const markup = renderToStaticMarkup(<CreateGameModal />);

      // Date input must be disabled
      expect(markup).toMatch(/type="date"[^>]*disabled/);
      // Tap to change time must NOT be present when locked
      expect(markup).not.toContain('Tap to change time');
      // Subtly muted disabled appearance
      expect(markup).toContain('cursor-not-allowed select-none');
    });

    it('ensures no Unlock button exists for Date, Start Time, or End Time in source code', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/components/CreateGameModal.tsx'), 'utf-8');

      // Date section check
      const dateSectionMatch = source.match(/\{\/\* Date Selector \*\/\}[\s\S]*?\{\/\* Side-by-side Start & End Times \*\/\}/);
      expect(dateSectionMatch).toBeTruthy();
      expect(dateSectionMatch![0]).not.toContain('Unlock');
      expect(dateSectionMatch![0]).not.toContain('setLockedFields');

      // Start Time section check
      const startTimeMatch = source.match(/\{\/\* Start Time \*\/\}[\s\S]*?\{\/\* End Time \*\/\}/);
      expect(startTimeMatch).toBeTruthy();
      expect(startTimeMatch![0]).not.toContain('Unlock');
      expect(startTimeMatch![0]).not.toContain('setLockedFields');

      // End Time section check
      const endTimeMatch = source.match(/\{\/\* End Time \*\/\}[\s\S]*?\{\/\* Section 3: Location \*\/\}/);
      expect(endTimeMatch).toBeTruthy();
      expect(endTimeMatch![0]).not.toContain('Unlock');
      expect(endTimeMatch![0]).not.toContain('setLockedFields');
    });

    it('verifies other booking-derived fields (Sport, Court, Cost) retain their unlock controls', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/components/CreateGameModal.tsx'), 'utf-8');

      // Sport has unlock
      expect(source).toContain('lockedFields.sport && !isLinkedLi3ibBooking');
      // Court has unlock
      expect(source).toContain('lockedFields.courtName && !isLinkedLi3ibBooking');
      // Total court cost has unlock
      expect(source).toContain('lockedFields.totalCourtCostKWD && !isLinkedLi3ibBooking');
    });

    it('verifies ManualTimePickerModal instances are guarded with !isDateTimeLocked', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/components/CreateGameModal.tsx'), 'utf-8');

      expect(source).toContain('isOpen={!isDateTimeLocked && activeTimePicker === \'start\'}');
      expect(source).toContain('isOpen={!isDateTimeLocked && activeTimePicker === \'end\'}');
      expect(source).toContain('if (isDateTimeLocked) return;');
    });

    it('verifies handleSubmit enforces strict equality between confirmed booking and submitted date/times', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/components/CreateGameModal.tsx'), 'utf-8');

      expect(source).toContain('if (hasAttachedConfirmedBooking)');
      expect(source).toContain('Submission rejected: Game date does not match');
      expect(source).toContain('Submission rejected: Start time does not match');
      expect(source).toContain('Submission rejected: End time does not match');
    });

    it('verifies booking removal restores manual editing and resets lock state', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/components/CreateGameModal.tsx'), 'utf-8');

      expect(source).toContain('setAttachedBookingRemoved(true)');
      expect(source).toContain('setConfirmedBookingData(null)');
      expect(source).toContain('setPreviewUrl(null)');
      expect(source).toContain('setUploadedFile(null)');
    });
  });

  describe('Part 2: Solid Color Default Profile Banner (#B9C9E0)', () => {
    it('ProfileTab renders solid bg-[#B9C9E0] when user has no custom banner', () => {
      mockAppContextValue.current.currentUser = {
        ...CURRENT_USER,
        bannerUrl: undefined
      };

      const markup = renderToStaticMarkup(<ProfileTab />);
      expect(markup).toContain('bg-[#B9C9E0]');
      // Must not contain gradients in banner container
      expect(markup).not.toContain('bg-gradient-to-r');
      expect(markup).not.toContain('from-[#B9C9E0]');
      // Must not contain decorative circle patterns
      expect(markup).not.toContain('rounded-full bg-white/20');
      expect(markup).not.toContain('rounded-full bg-white/15');
    });

    it('ProfileTab renders image and contrast scrim when user has custom bannerUrl', () => {
      mockAppContextValue.current.currentUser = {
        ...CURRENT_USER,
        bannerUrl: 'https://images.unsplash.com/photo-custom-banner'
      };

      const markup = renderToStaticMarkup(<ProfileTab />);
      expect(markup).toContain('src="https://images.unsplash.com/photo-custom-banner"');
      expect(markup).toContain('from-black/50');
    });

    it('PlayerProfileModal renders solid bg-[#B9C9E0] when player has no custom banner', () => {
      mockAppContextValue.current.selectedPlayerProfile = {
        id: 'p-1',
        name: 'Ahmad Al-Kandari',
        username: 'ahmad_k',
        avatar: '',
        sports: ['Football'],
        skillLevel: 'Intermediate',
        rating: 4.8,
        gamesPlayed: 15,
        location: 'Kuwait City',
        bio: 'Passionate midfielder',
        isOrganizer: true,
        bannerUrl: undefined
      };

      const markup = renderToStaticMarkup(<PlayerProfileModal />);

      expect(markup).toContain('bg-[#B9C9E0]');
      expect(markup).not.toContain('from-[#3A60AA]');
      expect(markup).not.toContain('from-[#06135B]');
      expect(markup).not.toContain('rounded-full bg-white/20');
    });

    it('PlayerProfileModal renders image when player has custom bannerUrl', () => {
      mockAppContextValue.current.selectedPlayerProfile = {
        id: 'p-2',
        name: 'Omar Al-Mutawa',
        username: 'omar_m',
        avatar: '',
        sports: ['Padel'],
        skillLevel: 'Advanced',
        rating: 4.9,
        gamesPlayed: 25,
        location: 'Salmiya',
        bio: 'Padel enthusiast',
        isOrganizer: false,
        bannerUrl: 'https://images.unsplash.com/photo-player-banner'
      };

      const markup = renderToStaticMarkup(<PlayerProfileModal />);

      expect(markup).toContain('src="https://images.unsplash.com/photo-player-banner"');
    });
  });
});
