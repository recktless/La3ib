import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { ProfileTab } from '../src/components/ProfileTab';
import { AuthModal } from '../src/components/AuthModal';
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

describe('Targeted UI Fixes, Demo Mode Security & Booking Upload Repair', () => {
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
      authModalOpen: true,
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

  describe('1. Remove Kuwait Community Badge from Player Profiles', () => {
    it('does not render "Kuwait Community" badge anywhere in ProfileTab markup', () => {
      const markup = renderToStaticMarkup(<ProfileTab />);
      expect(markup).not.toContain('Kuwait Community');
      expect(markup).not.toContain('Kuwait Community Badges');
      expect(markup).not.toContain('Fair Play Hero');
    });

    it('verifies ProfileTab source code does not contain "Kuwait Community" badge block', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/components/ProfileTab.tsx'), 'utf-8');
      expect(source).not.toContain('Kuwait Community Badges');
      expect(source).not.toContain('Fair Play Hero');
    });
  });

  describe('2. Restrict Demo Mode to Authenticated Verified Administrators', () => {
    it('does not render any public Demo Mode button on AuthModal login surface', () => {
      const markup = renderToStaticMarkup(<AuthModal />);
      expect(markup).not.toContain('Continue with Demo Mode');
      expect(markup).not.toContain('Explore Demo Mode');
      expect(markup).not.toContain('continueAsDemo');
    });

    it('verifies visitor banner in App.tsx does not expose Demo Mode to guests', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/App.tsx'), 'utf-8');
      expect(source).not.toContain('Explore Demo Mode');
    });

    it('verifies unauthenticated ProfileTab view does not expose Demo Mode to guests', () => {
      mockAppContextValue.current.authStatus = 'unauthenticated';
      mockAppContextValue.current.currentUser = {
        ...CURRENT_USER,
        id: 'guest',
        name: 'Guest Player',
        isDemoUser: false
      };
      const markup = renderToStaticMarkup(<ProfileTab />);
      expect(markup).not.toContain('Use Demo Mode');
    });

    it('verifies continueAsDemo in AppContext strictly guards access with checkIsAdminInFirestore', () => {
      const source = fs.readFileSync(path.resolve(__dirname, '../src/context/AppContext.tsx'), 'utf-8');
      expect(source).toContain('checkIsAdminInFirestore');
      expect(source).toContain('Unauthorized attempt to access Demo Mode');
    });
  });

  describe('3. Create Game Default Game Names & Descriptions', () => {
    it('initializes Title input with empty string and subtle placeholder without emojis', () => {
      const markup = renderToStaticMarkup(<CreateGameModal />);
      // Input should not have prefilled default value
      expect(markup).not.toContain('value="Friday Night Football ⚽"');
      // Placeholder must be "e.g. Friday Football Match"
      expect(markup).toContain('placeholder="e.g. Friday Football Match"');
    });

    it('initializes Description with empty string and clean subtle placeholder', () => {
      const markup = renderToStaticMarkup(<CreateGameModal />);
      expect(markup).not.toContain('Looking for intermediate players. Nothing too serious, just a good competitive match.');
      expect(markup).toContain('placeholder="Add notes for players, pitch rules, or directions..."');
    });
  });

  describe('4. Universal Booking Upload & Repair', () => {
    it('verifies server.ts returns both extraction and data for full client compatibility', () => {
      const serverSource = fs.readFileSync(path.resolve(__dirname, '../server.ts'), 'utf-8');
      expect(serverSource).toContain('extraction: parsedData');
      expect(serverSource).toContain('data: parsedData');
    });

    it('verifies CreateGameModal handles result.extraction and result.data safely', () => {
      const clientSource = fs.readFileSync(path.resolve(__dirname, '../src/components/CreateGameModal.tsx'), 'utf-8');
      expect(clientSource).toContain('const extracted = result.extraction || result.data;');
      expect(clientSource).toContain('fileName: file.name');
      expect(clientSource).toContain('fileInputRef.current.value = \'\'');
    });
  });

  describe('5. Extension — Upload Info Button and Modal', () => {
    it('renders Info button next to "Upload Your Booking"', () => {
      const markup = renderToStaticMarkup(<CreateGameModal />);
      expect(markup).toContain('Upload Your Booking');
      expect(markup).toContain('aria-label="How booking upload works"');
    });

    it('verifies the Booking Upload Info modal explains 3 steps and includes example image asset', () => {
      const clientSource = fs.readFileSync(path.resolve(__dirname, '../src/components/CreateGameModal.tsx'), 'utf-8');
      expect(clientSource).toContain('How Booking Upload Works');
      expect(clientSource).toContain('1. Upload');
      expect(clientSource).toContain('2. Review');
      expect(clientSource).toContain('3. Create');
      expect(clientSource).toContain('/assets/aistudio/Confirmed_Booking_App_Screen_df7a9ec3.png');
      expect(clientSource).toContain('Example of a booking confirmation you can upload.');
    });
  });
});
