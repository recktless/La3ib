import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  resolveGameLocation, 
  coordinatesToLatLng, 
  latLngToCoordinates, 
  getNearestKuwaitLocation, 
  formatLatLngDisplay, 
  getGoogleMapsUrl,
  KUWAIT_BOUNDS 
} from '../src/lib/location';
import { MapLocationPicker } from '../src/components/MapLocationPicker';
import { GoogleMapDiscover } from '../src/components/GoogleMapDiscover';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { GameDetailModal } from '../src/components/GameDetailModal';
import { updateGameInFirestore, _setTestDbInstance, _setTestAuthInstance } from '../src/lib/firebase';
import { CURRENT_USER } from '../src/data/mockData';
import { Game } from '../src/types';

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

const mockDb = { type: 'mock-firestore' } as any;
const mockAuth = { currentUser: { uid: 'user-organizer' } } as any;

// Mock Firestore runTransaction & doc
vi.mock('firebase/firestore', () => {
  const getGameData = (id: string) => {
    if (id === 'game-li3ib-1') {
      return {
        id: 'game-li3ib-1',
        linkedBookingId: 'booking-li3ib-123',
        organizerId: 'user-organizer',
        courtName: 'Mishref Youth Center Stadium',
        venue: 'Mishref Youth Center Stadium',
        sport: 'Football',
        date: '2026-10-25',
        startTime: '19:00',
        endTime: '20:30',
        address: 'Block 6, Mishref Oasis Road',
        coordinates: { x: 55, y: 52 },
        latitude: 29.2731,
        longitude: 48.0536,
        title: 'Locked Li3ib Match'
      };
    }
    if (id === 'game-regular-1') {
      return {
        id: 'game-regular-1',
        organizerId: 'user-organizer',
        courtName: 'Open Pitch',
        sport: 'Football',
        date: '2026-10-26',
        startTime: '18:00',
        endTime: '19:30',
        address: 'Block 1',
        coordinates: { x: 50, y: 50 },
        latitude: 29.3,
        longitude: 47.9,
        title: 'Regular Match'
      };
    }
    return null;
  };

  return {
    doc: vi.fn((_db, collection, id) => ({ collection, id, path: `${collection}/${id}` })),
    runTransaction: vi.fn(async (_db, callback) => {
      const mockTx = {
        get: vi.fn(async (docRef) => {
          const data = getGameData(docRef.id);
          return {
            exists: () => !!data,
            data: () => data
          };
        }),
        update: vi.fn(),
        set: vi.fn(),
        delete: vi.fn()
      };
      return callback(mockTx);
    }),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP')
  };
});

describe('Task 2 Revision: Google Maps + Li3ib Booking Locks', () => {
  const tHelper = (en: string, _ar: string) => en;

  describe('1. Location & Coordinate Utilities (src/lib/location.ts)', () => {
    it('converts relative map coordinates to standard WGS84 lat/lng within Kuwait bounds', () => {
      const coords = { x: 55, y: 52 };
      const latLng = coordinatesToLatLng(coords);

      expect(latLng.latitude).toBeGreaterThanOrEqual(KUWAIT_BOUNDS.minLat);
      expect(latLng.latitude).toBeLessThanOrEqual(KUWAIT_BOUNDS.maxLat);
      expect(latLng.longitude).toBeGreaterThanOrEqual(KUWAIT_BOUNDS.minLng);
      expect(latLng.longitude).toBeLessThanOrEqual(KUWAIT_BOUNDS.maxLng);
    });

    it('converts lat/lng back to relative map coordinates within 0-100%', () => {
      const coords = latLngToCoordinates(29.2731, 48.0536);
      expect(coords.x).toBeGreaterThan(0);
      expect(coords.x).toBeLessThan(100);
      expect(coords.y).toBeGreaterThan(0);
      expect(coords.y).toBeLessThan(100);
    });

    it('resolves legacy games with only { x, y } coordinates seamlessly without errors', () => {
      const legacyGame = {
        courtName: 'Mishref Stadium',
        area: 'Mishref',
        coordinates: { x: 55, y: 52 }
      };
      const resolved = resolveGameLocation(legacyGame);
      expect(resolved.coordinates).toEqual({ x: 55, y: 52 });
      expect(typeof resolved.latitude).toBe('number');
      expect(typeof resolved.longitude).toBe('number');
      expect(resolved.locationLabel).toContain('Mishref');
      expect(resolved.mapsUrl).toContain('google.com/maps');
    });

    it('resolves games with explicit latitude/longitude and preserves them', () => {
      const newGame = {
        courtName: 'Padel In Shuwaikh',
        latitude: 29.3519,
        longitude: 47.9422
      };
      const resolved = resolveGameLocation(newGame);
      expect(resolved.latitude).toBe(29.3519);
      expect(resolved.longitude).toBe(47.9422);
      expect(resolved.coordinates.x).toBeGreaterThan(0);
    });

    it('formats coordinates for clean UI display', () => {
      const formatted = formatLatLngDisplay(29.2731, 48.0536);
      expect(formatted).toContain('29.2731° N');
      expect(formatted).toContain('48.0536° E');
    });

    it('generates working external Google Maps links', () => {
      const url = getGoogleMapsUrl(29.2731, 48.0536, 'Mishref Pitch');
      expect(url).toContain('https://www.google.com/maps/search/?api=1');
      expect(url).toContain('29.2731');
      expect(url).toContain('48.0536');
    });
  });

  describe('2. Google Maps Location Picker (MapLocationPicker)', () => {
    it('renders real Google Map container, Kuwait Places search, and WGS84 coordinates readout for ordinary games', () => {
      const onChange = vi.fn();
      const html = renderToStaticMarkup(
        <MapLocationPicker
          value={{ coordinates: { x: 55, y: 52 }, latitude: 29.2731, longitude: 48.0536, locationLabel: 'Mishref Youth Center' }}
          onChange={onChange}
          isLocked={false}
          venueName="Mishref Pitch"
        />
      );

      // Verify Google Maps container and Places Search input
      expect(html).toContain('data-testid="map"');
      expect(html).toContain('Search venue or area in Kuwait');
      expect(html).toContain('29.2731° N, 48.0536° E');
      expect(html).toContain('Click map or drag pin to adjust location');
      // No large lock badges or repeated notices
      expect(html).not.toContain('Provided by your Li3ib booking');
    });

    it('renders locked location in subtle grey/muted style without large lock badges or repeated notices for Li3ib games', () => {
      const onChange = vi.fn();
      const html = renderToStaticMarkup(
        <MapLocationPicker
          value={{ coordinates: { x: 55, y: 52 }, latitude: 29.2731, longitude: 48.0536, locationLabel: 'Salmiya Sports Club Courts' }}
          onChange={onChange}
          isLocked={true}
          venueName="Salmiya Sports Club Courts"
        />
      );

      // Verify Google Map is rendered
      expect(html).toContain('data-testid="map"');
      // Disabled Places input with muted styling
      expect(html).toContain('disabled=""');
      expect(html).toContain('cursor-not-allowed');
      expect(html).toContain('bg-neutral-900');
      // Repeated "Provided by your Li3ib booking" notice must be removed
      expect(html).not.toContain('Provided by your Li3ib booking');
      expect(html).not.toContain('Click map or drag pin to adjust location');
    });
  });

  describe('3. Create Game & Edit Game: Li3ib Date, Time, Venue, and Sport Locks', () => {
    it('locks Venue, Sport, Date, Start Time, and End Time in subtle muted grey for Li3ib games', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: {
          linkedBookingId: 'booking-li3ib-999',
          bookingRef: '#LIB-999',
          courtName: 'Salmiya Sports Club Courts',
          sport: 'Padel',
          date: '2026-10-30',
          startTime: '19:00',
          endTime: '20:30',
          address: 'Salmiya Coastal Road, Court 3',
          coordinates: { x: 68, y: 44 },
          latitude: 29.3333,
          longitude: 48.0772,
          totalCourtCostKWD: 20
        },
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        updateGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: true },
        firebaseUser: { uid: 'user-organizer' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        language: 'en',
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      // Venue input must be disabled
      expect(html).toMatch(/<input[^>]+disabled=""[^>]+value="Salmiya Sports Club Courts"/);

      // Sport select must be disabled
      expect(html).toMatch(/<select[^>]+disabled=""/);

      // Date input must be disabled
      expect(html).toMatch(/<input[^>]+type="date"[^>]+disabled=""[^>]+value="2026-10-30"/);

      // Start time must be disabled
      expect(html).toMatch(/<input[^>]+type="time"[^>]+disabled=""[^>]+value="19:00"/);

      // End time must be disabled
      expect(html).toMatch(/<input[^>]+type="time"[^>]+disabled=""[^>]+value="20:30"/);

      // Address must be disabled
      expect(html).toMatch(/<input[^>]+disabled=""[^>]+value="Salmiya Coastal Road, Court 3"/);

      // Consistent subtle muted styling applied
      expect(html).toContain('cursor-not-allowed');
      expect(html).toContain('select-none');

      // Requirement 4: Repeated "Provided by your Li3ib booking" notices removed
      expect(html).not.toContain('Provided by your Li3ib booking');

      // Other fields remain editable
      expect(html).toContain('Skill Level');
      expect(html).toContain('Description / Organizer Notes');
    });

    it('allows editing Date, Start Time, End Time, Venue, and Location for regular non-Li3ib games', () => {
      mockAppContextValue.current = {
        createGameModalOpen: true,
        setCreateGameModalOpen: vi.fn(),
        createGamePrefill: null, // Regular new game
        setCreateGamePrefill: vi.fn(),
        createGame: vi.fn(),
        updateGame: vi.fn(),
        players: [],
        currentUser: { ...CURRENT_USER, canOrganize: true },
        firebaseUser: { uid: 'user-organizer' },
        authStatus: 'authenticated',
        setAuthModalOpen: vi.fn(),
        setAuthModalMode: vi.fn(),
        language: 'en',
        t: tHelper
      };

      const html = renderToStaticMarkup(<CreateGameModal />);

      // Date input is NOT disabled
      expect(html).not.toMatch(/<input[^>]+type="date"[^>]+disabled=""/);

      // Time inputs are NOT disabled
      expect(html).not.toMatch(/<input[^>]+type="time"[^>]+disabled=""/);

      // Sport is NOT disabled
      expect(html).not.toMatch(/<select[^>]+disabled=""/);

      // Google Map picker is present
      expect(html).toContain('data-testid="map"');
      expect(html).toContain('Search venue or area in Kuwait');
    });
  });

  describe('4. DiscoverTab: Google Maps Integration (GoogleMapDiscover)', () => {
    it('renders real Google Map with markers for discoverable games with valid coordinates', () => {
      const discoverableGames: Game[] = [
        {
          id: 'game-1',
          title: 'Friday Night Football',
          sport: 'Football',
          courtName: 'Mishref Stadium',
          area: 'Mishref',
          address: 'Block 6',
          coordinates: { x: 55, y: 52 },
          latitude: 29.2731,
          longitude: 48.0536,
          date: '2026-10-25',
          startTime: '20:00',
          endTime: '21:30',
          maxPlayers: 10,
          pricePerPlayerKWD: 1.5,
          totalCourtCostKWD: 15.0,
          isIndoor: false,
          cancellationPolicy: 'Free cancellation',
          skillLevel: 'Intermediate',
          gender: 'Everyone',
          visibility: 'Public',
          status: 'Open',
          organizer: CURRENT_USER,
          participants: [],
          participantIds: [],
          createdAt: new Date().toISOString()
        }
      ];

      const html = renderToStaticMarkup(
        <GoogleMapDiscover
          games={discoverableGames}
          onSelectGame={vi.fn()}
          language="en"
          t={tHelper}
        />
      );

      // Verify Google Map container is rendered
      expect(html).toContain('data-testid="map"');
      expect(html).toContain('Kuwait Google Maps Radar');
      expect(html).toContain('1 game with verified coordinates on map');
    });
  });

  describe('5. GameDetailModal: Location Display & Maps Navigation', () => {
    it('displays venue name, readable address, exact coordinates, and Open in Maps link', () => {
      const regularGame: Game = {
        id: 'game-reg-1',
        title: 'Friday Friendly Padel',
        sport: 'Padel',
        courtName: 'Mishref Youth Center Stadium',
        area: 'Mishref',
        address: 'Block 6, Mishref Oasis Road',
        coordinates: { x: 55, y: 52 },
        latitude: 29.2731,
        longitude: 48.0536,
        locationLabel: 'Mishref Youth Center Stadium, Mishref',
        date: '2026-10-25',
        startTime: '19:00',
        endTime: '20:30',
        maxPlayers: 4,
        pricePerPlayerKWD: 5.0,
        totalCourtCostKWD: 20.0,
        isIndoor: false,
        cancellationPolicy: 'Free cancellation up to 4 hours before match.',
        skillLevel: 'Intermediate',
        gender: 'Everyone',
        visibility: 'Public',
        status: 'Open',
        organizer: CURRENT_USER,
        participants: [
          {
            userId: CURRENT_USER.id,
            name: CURRENT_USER.name,
            username: CURRENT_USER.username,
            avatar: CURRENT_USER.avatar,
            skill: 'Intermediate',
            paymentStatus: 'Paid',
            paidAmountKWD: 5.0,
            joinedAt: 'Yesterday',
            paymentMethod: 'KNET',
            attendanceConfirmed: false
          }
        ],
        participantIds: [CURRENT_USER.id],
        createdAt: new Date().toISOString()
      };

      mockAppContextValue.current = {
        selectedGameForDetail: regularGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [regularGame],
        myGames: [regularGame],
        currentUser: CURRENT_USER,
        chats: {},
        sendChatMessage: vi.fn(),
        leaveGame: vi.fn(),
        cancelGame: vi.fn(),
        submitReport: vi.fn(),
        authStatus: 'authenticated',
        isDemoActive: false,
        players: [],
        friendIds: [],
        followingUserIds: [],
        setCreateGamePrefill: vi.fn(),
        setCreateGameModalOpen: vi.fn(),
        getPaymentLinkRequests: () => [],
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal initialTab="details" />);

      // Venue card with Open in Maps
      expect(html).toContain('Mishref Youth Center Stadium');
      expect(html).toContain('Open in Maps');
      expect(html).toContain('29.2731° N, 48.0536° E');
      expect(html).toContain('https://www.google.com/maps/search');
    });

    it('displays Linked Li3ib Booking badge without claiming unverified status', () => {
      const li3ibGame: Game = {
        id: 'game-li3ib-1',
        linkedBookingId: 'booking-li3ib-123',
        bookingRef: '#LIB-123',
        title: 'Li3ib Reserved Match',
        sport: 'Football',
        courtName: 'Mishref Youth Center Stadium',
        area: 'Mishref',
        address: 'Block 6, Mishref Oasis Road',
        coordinates: { x: 55, y: 52 },
        latitude: 29.2731,
        longitude: 48.0536,
        date: '2026-10-25',
        startTime: '19:00',
        endTime: '20:30',
        maxPlayers: 10,
        pricePerPlayerKWD: 2.0,
        totalCourtCostKWD: 20.0,
        isIndoor: false,
        cancellationPolicy: 'Free cancellation up to 4 hours before match.',
        skillLevel: 'Intermediate',
        gender: 'Everyone',
        visibility: 'Public',
        status: 'Open',
        organizer: CURRENT_USER,
        participants: [],
        participantIds: [],
        createdAt: new Date().toISOString()
      };

      mockAppContextValue.current = {
        selectedGameForDetail: li3ibGame,
        setSelectedGameForDetail: vi.fn(),
        setSelectedGameForJoin: vi.fn(),
        games: [li3ibGame],
        myGames: [li3ibGame],
        currentUser: CURRENT_USER,
        chats: {},
        authStatus: 'authenticated',
        isDemoActive: false,
        players: [],
        friendIds: [],
        followingUserIds: [],
        setCreateGamePrefill: vi.fn(),
        setCreateGameModalOpen: vi.fn(),
        getPaymentLinkRequests: () => [],
        t: tHelper
      };

      const html = renderToStaticMarkup(<GameDetailModal initialTab="details" />);
      expect(html).toContain('Linked Booking');
      expect(html).toContain('Court &amp; location locked to venue reservation');
      expect(html).toContain('#LIB-123');
    });
  });

  describe('6. Data Integrity & Firestore Security Enforcement (Date/Time + Venue/Sport Locks)', () => {
    beforeEach(() => {
      _setTestDbInstance(mockDb);
      _setTestAuthInstance(mockAuth);
    });

    it('rejects attempts to mutate locked date, startTime, or endTime on Li3ib games', async () => {
      await expect(
        updateGameInFirestore('game-li3ib-1', {
          date: '2026-12-01' // Locked field
        }, 'user-organizer')
      ).rejects.toThrow(/date is locked from the original li3ib booking/i);

      await expect(
        updateGameInFirestore('game-li3ib-1', {
          startTime: '10:00' // Locked field
        }, 'user-organizer')
      ).rejects.toThrow(/start time is locked from the original li3ib booking/i);

      await expect(
        updateGameInFirestore('game-li3ib-1', {
          endTime: '12:00' // Locked field
        }, 'user-organizer')
      ).rejects.toThrow(/end time is locked from the original li3ib booking/i);
    });

    it('rejects attempts to mutate locked court, sport, address, or coordinates on Li3ib games', async () => {
      await expect(
        updateGameInFirestore('game-li3ib-1', {
          courtName: 'Hacked Pitch Name', // Locked field
          description: 'New description'
        }, 'user-organizer')
      ).rejects.toThrow(/locked from the original Li3ib booking/i);

      await expect(
        updateGameInFirestore('game-li3ib-1', {
          sport: 'Basketball' // Locked field
        }, 'user-organizer')
      ).rejects.toThrow(/locked from the original Li3ib booking/i);

      await expect(
        updateGameInFirestore('game-li3ib-1', {
          latitude: 30.0, // Locked field
          longitude: 47.0
        }, 'user-organizer')
      ).rejects.toThrow(/locked from the original Li3ib booking/i);
    });

    it('allows updating unrelated fields (e.g. description, skillLevel) on Li3ib games', async () => {
      await expect(
        updateGameInFirestore('game-li3ib-1', {
          description: 'Updated game notes for attendees',
          skillLevel: 'Advanced',
          maxPlayers: 12
        }, 'user-organizer')
      ).resolves.not.toThrow();
    });

    it('allows regular non-Li3ib games to update their date, times, location, and coordinates freely', async () => {
      await expect(
        updateGameInFirestore('game-regular-1', {
          date: '2026-11-05',
          startTime: '19:30',
          endTime: '21:00',
          courtName: 'New Pitch Location',
          coordinates: { x: 60, y: 60 },
          latitude: 29.25,
          longitude: 48.0,
          description: 'Updated regular game'
        }, 'user-organizer')
      ).resolves.not.toThrow();
    });
  });
});
