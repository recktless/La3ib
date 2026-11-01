import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SettingsView } from '../src/components/SettingsView';
import { ProfileTab } from '../src/components/ProfileTab';
import { PlayerProfileModal } from '../src/components/PlayerProfileModal';
import { CURRENT_USER } from '../src/data/mockData';
import { UserProfile, PublicPlayerProfile } from '../src/types';

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

describe('La3ib Task 5: Functional Profile Settings & Privacy Suite', () => {
  const tHelper = (en: string, _ar: string) => en;

  const baseUser: UserProfile = {
    ...CURRENT_USER,
    id: 'user-athlete-1',
    uid: 'user-athlete-1',
    name: 'Talal Al-Mutawa',
    username: 'talal_sports',
    email: 'talal@example.com',
    privacy: {
      showAge: true,
      showPhone: false,
      allowDirectInvites: true,
      isPrivateProfile: false
    }
  };

  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: baseUser,
      selectedPlayerProfile: null,
      setSelectedPlayerProfile: vi.fn(),
      updateCurrentUserProfile: vi.fn(),
      loadPlayerActivity: vi.fn().mockResolvedValue({
        matchesPlayed: 14,
        matchesOrganized: 3,
        mvpCount: 2,
        reliabilityScore: 98,
        activeSports: ['Football', 'Padel'],
        recentMatches: []
      }),
      blockedUserIds: new Set<string>(),
      blockedPlayersList: [],
      unblockPlayer: vi.fn(),
      isBlockActionLoading: vi.fn().mockReturnValue(false),
      isFollowingUser: vi.fn().mockReturnValue(false),
      isFollowActionLoading: vi.fn().mockReturnValue(false),
      toggleFollowPlayer: vi.fn(),
      getFriendshipStatus: vi.fn().mockReturnValue('none'),
      isFriendActionLoading: vi.fn().mockReturnValue(false),
      sendFriendRequest: vi.fn(),
      cancelFriendRequest: vi.fn(),
      acceptFriendRequest: vi.fn(),
      declineFriendRequest: vi.fn(),
      blockPlayer: vi.fn(),
      submitReport: vi.fn(),
      authStatus: 'authenticated',
      isDemoActive: false,
      firebaseUser: {
        uid: 'user-athlete-1',
        email: 'talal@example.com',
        providerData: [{ providerId: 'password' }]
      },
      setAuthModalOpen: vi.fn(),
      setAuthModalMode: vi.fn(),
      logout: vi.fn(),
      continueAsDemo: vi.fn(),
      sendPasswordResetEmailAction: vi.fn(),
      deleteAccountAction: vi.fn(),
      reauthenticateAction: vi.fn(),
      checkUsername: vi.fn().mockResolvedValue(true),
      language: 'en',
      setLanguage: vi.fn(),
      t: tHelper
    };
  });

  describe('1. ProfileTab Settings Navigation', () => {
    it('renders a dedicated Settings button with gear icon in Profile', () => {
      const html = renderToStaticMarkup(<ProfileTab />);
      expect(html).toContain('Settings');
      expect(html).toContain('lucide-settings');
    });
  });

  describe('2. SettingsView - 4 Mandatory Sections', () => {
    it('renders the Settings view with Account, Preferences, Privacy & Safety, and About sections', () => {
      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      // Section 1: Account
      expect(html).toContain('Account');
      expect(html).toContain('Edit Profile');
      expect(html).toContain('Change Password');
      expect(html).toContain('Log Out');
      expect(html).toContain('Delete Account');

      // Section 2: Preferences
      expect(html).toContain('Preferences');
      expect(html).toContain('Language');
      expect(html).toContain('English');
      expect(html).toContain('العربية');

      // Section 3: Privacy & Safety
      expect(html).toContain('Privacy &amp; Safety');
      expect(html).toContain('Profile Privacy');
      expect(html).toContain('Public Profile');
      expect(html).toContain('Private Profile');
      expect(html).toContain('Blocked Users');

      // Section 4: About
      expect(html).toContain('About');
      expect(html).toContain('La3ib');
      expect(html).toContain('لاعب');
    });

    it('displays the user current details in the Account section', () => {
      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      expect(html).toContain('Talal Al-Mutawa');
      expect(html).toContain('@talal_sports');
      expect(html).toContain('talal@example.com');
      expect(html).toContain('Verified');
    });

    it('correctly displays Google account badge and message when user logs in with Google', () => {
      mockAppContextValue.current.firebaseUser = {
        uid: 'user-athlete-1',
        email: 'talal@gmail.com',
        providerData: [{ providerId: 'google.com' }]
      };

      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      expect(html).toContain('Your account is secured directly via Google OAuth');
    });

    it('shows Demo Mode information badge when exploring in demo mode', () => {
      mockAppContextValue.current.authStatus = 'demo';
      mockAppContextValue.current.firebaseUser = null;

      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      expect(html).toContain('Demo Account');
      expect(html).toContain('You are exploring in Demo Mode');
    });

    it('renders blocked players list with Unblock action when users are blocked', () => {
      const blockedPlayer: PublicPlayerProfile = {
        id: 'blocked-player-99',
        uid: 'blocked-player-99',
        name: 'Disruptive Athlete',
        username: 'disruptive_99',
        bio: 'Just playing around',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        area: 'Salmiya',
        sports: ['Football'],
        favoriteSports: ['Football'],
        skills: { Football: 'Casual' },
        rating: 3.2,
        gamesPlayed: 5,
        reliabilityScore: 70,
        mvpCount: 0,
        createdAt: '2026-01-01',
        privacy: { showAge: false, showPhone: false, allowDirectInvites: false }
      };

      mockAppContextValue.current.blockedUserIds = new Set(['blocked-player-99']);
      mockAppContextValue.current.blockedPlayersList = [blockedPlayer];

      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      expect(html).toContain('Disruptive Athlete');
      expect(html).toContain('@disruptive_99');
      expect(html).toContain('Unblock');
    });

    it('does NOT render non-functional placeholder links for privacy policy, terms, or notifications', () => {
      const html = renderToStaticMarkup(
        <SettingsView onBackToProfile={vi.fn()} onOpenEditProfile={vi.fn()} />
      );

      // Notification settings must not exist as system cannot enforce them
      expect(html).not.toContain('Push Notifications');
      expect(html).not.toContain('Email Notifications');
      expect(html).not.toContain('Notification Preferences');

      // No dead placeholder links
      expect(html).not.toContain('Terms of Service');
      expect(html).not.toContain('Privacy Policy');
      expect(html).not.toContain('Help &amp; Support');
      expect(html).not.toContain('Help & Support');
    });
  });

  describe('3. Privacy Enforcement in PlayerProfileModal', () => {
    const targetPlayer: PublicPlayerProfile = {
      id: 'target-player-55',
      uid: 'target-player-55',
      name: 'Private Athlete',
      username: 'private_champ',
      bio: 'Competitive padel player',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      area: 'Mishref',
      sports: ['Padel'],
      favoriteSports: ['Padel'],
      skills: { Padel: 'Advanced' },
      rating: 4.8,
      gamesPlayed: 40,
      reliabilityScore: 99,
      mvpCount: 8,
      createdAt: '2026-01-01',
      privacy: {
        showAge: false,
        showPhone: false,
        allowDirectInvites: true,
        isPrivateProfile: true
      }
    };

    it('displays private profile banner and locks match activity from non-friends', () => {
      mockAppContextValue.current.selectedPlayerProfile = targetPlayer;
      mockAppContextValue.current.getFriendshipStatus = vi.fn().mockReturnValue('none');

      const html = renderToStaticMarkup(<PlayerProfileModal />);

      expect(html).toContain('Private Profile');
      expect(html).toContain('match history and activity are private');
      // Normal activity stats should be shielded
      expect(html).not.toContain('Played');
    });

    it('shows full match activity when profile is public', () => {
      mockAppContextValue.current.selectedPlayerProfile = {
        ...targetPlayer,
        privacy: {
          ...targetPlayer.privacy,
          isPrivateProfile: false
        }
      };

      const html = renderToStaticMarkup(<PlayerProfileModal />);

      expect(html).not.toContain('Private Profile');
      expect(html).toContain('Played');
      expect(html).toContain('Hosted');
    });

    it('allows confirmed friends to view activity even if profile is private', () => {
      mockAppContextValue.current.selectedPlayerProfile = targetPlayer;
      mockAppContextValue.current.getFriendshipStatus = vi.fn().mockReturnValue('friends');

      const html = renderToStaticMarkup(<PlayerProfileModal />);

      // Should not show locked private banner to friends
      expect(html).not.toContain('Private Profile');
      expect(html).toContain('Played');
    });
  });
});
