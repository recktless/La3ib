import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { CURRENT_USER } from '../src/data/mockData';

const mockAppContextValue = {
  current: {
    createGameModalOpen: true,
    setCreateGameModalOpen: vi.fn(),
    createGamePrefill: null as any,
    setCreateGamePrefill: vi.fn(),
    createGame: vi.fn(),
    updateGame: vi.fn(),
    players: [],
    currentUser: { ...CURRENT_USER, canOrganize: true },
    firebaseUser: { uid: 'user-test-organizer' },
    authStatus: 'authenticated',
    setAuthModalOpen: vi.fn(),
    setAuthModalMode: vi.fn(),
    language: 'en',
    t: (en: string, _ar?: string) => en
  }
};

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

// Mock Google Maps and sub-components
vi.mock('../src/components/MapLocationPicker', () => ({
  MapLocationPicker: () => <div data-testid="map-location-picker">Mock MapLocationPicker</div>
}));

vi.mock('../src/components/ManualTimePickerModal', () => ({
  ManualTimePickerModal: () => null
}));

describe('La3ib — Create a Game Form Simplification', () => {
  describe('1. Collapsible Accordion Sections & Initial States', () => {
    it('renders all 6 numbered accordion sections', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Section headers
      expect(html).toContain('Game Basics');
      expect(html).toContain('Date &amp; Time');
      expect(html).toContain('Location &amp; Area');
      expect(html).toContain('Players &amp; Preferences');
      expect(html).toContain('Booking Confirmation');
      expect(html).toContain('Cost Sharing');
    });

    it('starts with Game Basics, Date & Time, Location & Area, and Players expanded', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Check aria-expanded attributes
      expect(html).toMatch(/aria-expanded="true"[^>]*aria-controls="section-basics-content"/);
      expect(html).toMatch(/aria-expanded="true"[^>]*aria-controls="section-datetime-content"/);
      expect(html).toMatch(/aria-expanded="true"[^>]*aria-controls="section-location-content"/);
      expect(html).toMatch(/aria-expanded="true"[^>]*aria-controls="section-players-content"/);
    });

    it('starts with Booking and Cost Sharing collapsed by default', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Booking and Cost Sharing are collapsed
      expect(html).toMatch(/aria-expanded="false"[^>]*aria-controls="section-booking-content"/);
      expect(html).toMatch(/aria-expanded="false"[^>]*aria-controls="section-cost-sharing-content"/);
    });

    it('displays status badges: Not added for Booking and Off for Cost Sharing by default', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Booking badge shows Not added
      expect(html).toContain('Not added');
      // Cost sharing badge shows Off
      expect(html).toContain('Off');
    });

    it('displays Added badge when confirmed booking is attached', () => {
      mockAppContextValue.current.createGamePrefill = {
        title: 'Friday Padel',
        sport: 'Padel',
        bookingConfirmationUrl: 'https://example.com/receipt.jpg',
        linkedBookingId: 'li3ib-123'
      };
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Badge should reflect Added
      expect(html).toContain('Added');
    });

    it('displays On badge when cost sharing is enabled in prefill', () => {
      mockAppContextValue.current.createGamePrefill = {
        title: 'Friday Padel',
        sport: 'Padel',
        costSharing: {
          enabled: true,
          methods: ['cash'],
          totalAmountKWD: 20
        }
      };
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Cost sharing badge should reflect On
      expect(html).toContain('On');
    });
  });

  describe('2. Game Bio / Description Relocated to Game Basics', () => {
    it('places Game Bio inside Section 1 (Game Basics) directly below sport and skill level', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      const sectionBasics = html.substring(
        html.indexOf('id="section-basics-content"'),
        html.indexOf('id="section-datetime-content"')
      );

      expect(sectionBasics).toContain('Game Bio / Description');
      expect(sectionBasics).toContain('<textarea');
      expect(sectionBasics).toContain('rows="3"');
      expect(sectionBasics).toContain('Add notes for players, pitch rules, or directions...');
    });

    it('ensures Section 4 (Players & Preferences) no longer contains the description textarea', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      const sectionPlayers = html.substring(
        html.indexOf('id="section-players-content"'),
        html.indexOf('id="section-booking-content"')
      );

      // Section 4 should have players settings but not description
      expect(sectionPlayers).toContain('Max Players');
      expect(sectionPlayers).toContain('Gender Preference');
      expect(sectionPlayers).toContain('Game Visibility');
      expect(sectionPlayers).not.toContain('<textarea');
    });
  });

  describe('3. Compact Date & Time Layout', () => {
    it('uses responsive grid layout and preserves 12-hour format and 44px touch targets', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      const sectionDateTime = html.substring(
        html.indexOf('id="section-datetime-content"'),
        html.indexOf('id="section-location-content"')
      );

      // Side-by-side grid container
      expect(sectionDateTime).toContain('grid grid-cols-1 md:grid-cols-2 gap-3');
      // 12-hour formatted labels
      expect(sectionDateTime).toContain('8:00 PM');
      expect(sectionDateTime).toContain('9:30 PM');
      // 44px+ touch targets
      expect(sectionDateTime).toContain('w-11 h-11');
      // Clock and Calendar picker buttons with accessibility labels
      expect(sectionDateTime).toContain('Open date picker');
      expect(sectionDateTime).toContain('Open start time picker');
      expect(sectionDateTime).toContain('Open end time picker');
    });
  });

  describe('4. Address / Landmark Field Behavior', () => {
    it('starts with an empty string for newly created games with optional placeholder', () => {
      mockAppContextValue.current.createGamePrefill = null;
      const html = renderToStaticMarkup(<CreateGameModal />);

      // Value should be empty and optional placeholder shown
      expect(html).toContain('id="game-form-address"');
      expect(html).toContain('placeholder="e.g. Block 6, Oasis Road (Optional)"');
      expect(html).toContain('value=""');
    });

    it('preserves existing address when editing an existing game', () => {
      mockAppContextValue.current.createGamePrefill = {
        id: 'existing-game-42',
        title: 'Mishref Match',
        courtName: 'Mishref Stadium',
        area: 'Mishref',
        address: 'Block 6, Street 10, Court 2'
      };
      const html = renderToStaticMarkup(<CreateGameModal />);

      expect(html).toContain('value="Block 6, Street 10, Court 2"');
    });
  });
});
