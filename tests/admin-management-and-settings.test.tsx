import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminPanelModal } from '../src/components/AdminPanelModal';
import { SettingsView } from '../src/components/SettingsView';
import { OnboardingTutorial } from '../src/components/OnboardingTutorial';
import { CURRENT_USER } from '../src/data/mockData';
import { UserProfile, PublicPlayerProfile } from '../src/types';
import * as firebaseLib from '../src/lib/firebase';

const { mockAppContextValue } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any }
}));

// Mock AppContext
vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

// Mock firebase functions
vi.spyOn(firebaseLib, 'banPlayerInFirestore').mockResolvedValue(undefined as any);
vi.spyOn(firebaseLib, 'unbanPlayerInFirestore').mockResolvedValue(undefined as any);
vi.spyOn(firebaseLib, 'deletePlayerInFirestore').mockResolvedValue(undefined as any);
vi.spyOn(firebaseLib, 'logModerationAction').mockResolvedValue(undefined as any);

describe('Admin Management & Settings Improvements Test Suite', () => {
  const tHelper = (en: string, _ar: string) => en;

  const adminUser: UserProfile = {
    ...CURRENT_USER,
    id: 'admin-user-1',
    uid: 'admin-user-1',
    name: 'Admin Ahmad',
    username: 'admin_ahmad',
    email: 'admin@la3ib.kw',
    isAdmin: true,
    isOrganizer: true,
    privacy: {
      showAge: true,
      showPhone: true,
      allowDirectInvites: true,
      isPrivateProfile: false
    }
  };

  const samplePlayers: PublicPlayerProfile[] = [
    {
      id: 'admin-user-1',
      uid: 'admin-user-1',
      name: 'Admin Ahmad',
      username: 'admin_ahmad',
      bio: 'Platform administrator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      area: 'Kuwait City',
      sports: ['Football', 'Padel'],
      favoriteSports: ['Football', 'Padel'],
      skills: { Football: 'Advanced' },
      rating: 4.9,
      gamesPlayed: 25,
      reliabilityScore: 99,
      mvpCount: 5,
      createdAt: '2026-01-01',
      isAdmin: true,
      isOrganizer: true,
      privacy: { showAge: true, showPhone: true, allowDirectInvites: true }
    },
    {
      id: 'player-regular-2',
      uid: 'player-regular-2',
      name: 'Fahad Al-Salem',
      username: 'fahad_sports',
      bio: 'Enthusiastic padel competitor',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      area: 'Salmiya',
      sports: ['Padel'],
      favoriteSports: ['Padel'],
      skills: { Padel: 'Intermediate' },
      rating: 4.3,
      gamesPlayed: 12,
      reliabilityScore: 92,
      mvpCount: 1,
      createdAt: '2026-02-01',
      isAdmin: false,
      isOrganizer: true,
      privacy: { showAge: true, showPhone: false, allowDirectInvites: true }
    },
    {
      id: 'player-banned-3',
      uid: 'player-banned-3',
      name: 'Suspended Athlete',
      username: 'suspended_user',
      bio: 'Rule violator',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
      area: 'Hawalli',
      sports: ['Football'],
      favoriteSports: ['Football'],
      skills: { Football: 'Casual' },
      rating: 2.5,
      gamesPlayed: 3,
      reliabilityScore: 40,
      mvpCount: 0,
      createdAt: '2026-02-15',
      isAdmin: false,
      isOrganizer: false,
      isBanned: true,
      banReason: 'Severe sportsmanship violation',
      bannedAt: '2026-10-01T10:00:00Z',
      banExpiresAt: '2027-01-01T10:00:00Z',
      bannedBy: 'admin-user-1',
      privacy: { showAge: false, showPhone: false, allowDirectInvites: false }
    }
  ];

  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: adminUser,
      adminModalOpen: true,
      setAdminModalOpen: vi.fn(),
      isAdmin: true,
      games: [],
      players: samplePlayers,
      bannedPlayersList: [samplePlayers[2]],
      banPlayer: vi.fn().mockResolvedValue(undefined),
      unbanPlayer: vi.fn().mockResolvedValue(undefined),
      deletePlayer: vi.fn().mockResolvedValue(undefined),
      isPlayerActionLoading: vi.fn().mockReturnValue(false),
      isAccountBanned: false,
      accountBanDetails: null,
      isTutorialOpen: false,
      tutorialStep: 1,
      isTutorialPreview: false,
      startTutorial: vi.fn(),
      completeTutorial: vi.fn(),
      skipTutorial: vi.fn(),
      nextTutorialStep: vi.fn(),
      prevTutorialStep: vi.fn(),
      totalTutorialSteps: 6,
      authStatus: 'authenticated',
      firebaseUser: {
        uid: 'admin-user-1',
        email: 'admin@la3ib.kw',
        providerData: [{ providerId: 'password' }]
      },
      logout: vi.fn(),
      updateCurrentUserProfile: vi.fn(),
      blockedPlayersList: [],
      unblockPlayer: vi.fn(),
      isBlockActionLoading: vi.fn().mockReturnValue(false),
      language: 'en',
      setLanguage: vi.fn(),
      themePreference: 'light',
      setThemePreference: vi.fn(),
      setActiveTab: vi.fn(),
      sendPasswordResetEmailAction: vi.fn(),
      deleteAccountAction: vi.fn(),
      reports: [],
      moderationReports: [],
      moderationLogs: [],
      cancelGameAsAdmin: vi.fn(),
      toggleOrganizerPermission: vi.fn(),
      t: tHelper
    };
  });

  describe('Task 1 — Admin Tutorial Demo (Preview Mode)', () => {
    it('renders Demo Tutorial button in Admin Panel header', () => {
      const html = renderToStaticMarkup(<AdminPanelModal />);
      expect(html).toContain('Demo Tutorial');
      expect(html).toContain('lucide-sparkles');
    });

    it('renders tutorial spotlight with Demo Preview badge when isTutorialPreview is true', () => {
      mockAppContextValue.current.isTutorialOpen = true;
      mockAppContextValue.current.isTutorialPreview = true;
      mockAppContextValue.current.tutorialStep = 0;

      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toContain('Welcome to La3ib!');
      expect(html).toContain('Demo');
      expect(html).toContain('Skip');
      expect(html).toContain('Next');
    });

    it('does not render tutorial when isTutorialOpen is false', () => {
      mockAppContextValue.current.isTutorialOpen = false;
      const html = renderToStaticMarkup(<OnboardingTutorial />);
      expect(html).toBe('');
    });
  });

  describe('Task 2 — Professional Settings Redesign', () => {
    it('renders all 6 logical groups with Apple/Instagram quiet aesthetic', () => {
      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      // Group 1: Account
      expect(html).toContain('Account');
      expect(html).toContain('Edit Profile');
      expect(html).toContain('Change Password');

      // Group 2: Preferences
      expect(html).toContain('Preferences');
      expect(html).toContain('Appearance');
      expect(html).toContain('Language');
      expect(html).toContain('English');
      expect(html).toContain('العربية');

      // Group 3: Privacy & Safety
      expect(html).toContain('Privacy');
      expect(html).toContain('Privacy &amp; Safety');
      expect(html).toContain('Profile Privacy');
      expect(html).toContain('Public Profile');
      expect(html).toContain('Private Profile');
      expect(html).toContain('Blocked Users');

      // Group 4: Notifications
      expect(html).toContain('Notifications');
      expect(html).toContain('In-App Activity Notifications');

      // Group 5: Help & Support
      expect(html).toContain('Help &amp; Support');
      expect(html).toContain('Community &amp; Safety Guidelines');
      expect(html).toContain('Replay Tutorial');
      expect(html).toContain('La3ib / لاعب');

      // Group 6: Account Actions
      expect(html).toContain('Account Actions');
      expect(html).toContain('Log Out');
      expect(html).toContain('Delete Account');
    });

    it('includes verified badge and athlete details', () => {
      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      expect(html).toContain('Admin Ahmad');
      expect(html).toContain('@admin_ahmad');
      expect(html).toContain('admin@la3ib.kw');
      expect(html).toContain('Verified');
    });
  });

  describe('Task 3 — Admin Player Management (Ban & Delete Player)', () => {
    it('renders athlete controls including Ban Player, Unban Player, and Delete actions', () => {
      const html = renderToStaticMarkup(<AdminPanelModal initialSection="users" />);

      // Athlete section
      expect(html).toContain('Athletes &amp; Permissions');
      expect(html).toContain('Fahad Al-Salem');
      expect(html).toContain('@fahad_sports');
      expect(html).toContain('Ban Player');
      expect(html).toContain('Delete');

      // Banned athlete indicators
      expect(html).toContain('Suspended Athlete');
      expect(html).toContain('@suspended_user');
      expect(html).toContain('Banned');
      expect(html).toContain('Unban Player');

      // Admin protection
      expect(html).toContain('You (Admin)');
    });

    it('displays ban reason and expiration indicator for banned athletes in the list', () => {
      const html = renderToStaticMarkup(<AdminPanelModal initialSection="users" />);
      expect(html).toContain('Suspended Athlete');
      expect(html).toContain('Severe sportsmanship violation');
      expect(html).toContain('Expires:');
    });
  });
});
