import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatTime12Hour } from '../src/types';
import { CreateGameModal } from '../src/components/CreateGameModal';
import { KuwaitMapTab } from '../src/components/KuwaitMapTab';
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

describe('Stage 4: Universal Booking Upload, Map Carousel Fix & Date/Time Improvements', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      activeTab: 'map',
      setActiveTab: vi.fn(),
      createGameModalOpen: true,
      setCreateGameModalOpen: vi.fn(),
      createGamePrefill: null,
      setCreateGamePrefill: vi.fn(),
      createGame: vi.fn(),
      updateGame: vi.fn(),
      players: [],
      firebaseUser: null,
      authStatus: 'authenticated',
      setAuthModalOpen: vi.fn(),
      setAuthModalMode: vi.fn(),
      games: INITIAL_GAMES,
      selectedSport: null,
      setSelectedSport: vi.fn(),
      setSelectedGameForDetail: vi.fn(),
      language: 'en',
      t: (en: string) => en
    };
  });

  describe('Task 3: 12-Hour AM/PM Time Formatter', () => {
    it('formats morning times in English and Arabic', () => {
      expect(formatTime12Hour('09:00', 'en')).toBe('9:00 AM');
      expect(formatTime12Hour('09:00', 'ar')).toBe('9:00 ص');
      expect(formatTime12Hour('00:30', 'en')).toBe('12:30 AM');
      expect(formatTime12Hour('00:30', 'ar')).toBe('12:30 ص');
    });

    it('formats afternoon and evening times in English and Arabic', () => {
      expect(formatTime12Hour('12:00', 'en')).toBe('12:00 PM');
      expect(formatTime12Hour('12:00', 'ar')).toBe('12:00 م');
      expect(formatTime12Hour('20:00', 'en')).toBe('8:00 PM');
      expect(formatTime12Hour('20:00', 'ar')).toBe('8:00 م');
      expect(formatTime12Hour('21:30', 'en')).toBe('9:30 PM');
      expect(formatTime12Hour('21:30', 'ar')).toBe('9:30 م');
      expect(formatTime12Hour('23:45', 'en')).toBe('11:45 PM');
    });

    it('gracefully handles missing or malformed inputs', () => {
      expect(formatTime12Hour('')).toBe('');
      expect(formatTime12Hour(null as any)).toBe('');
      expect(formatTime12Hour(undefined as any)).toBe('');
      expect(formatTime12Hour('invalid')).toBe('invalid');
    });
  });

  describe('Task 1: Universal Booking Upload in CreateGameModal', () => {
    it('renders the "Upload Your Booking" section with optional badge and accepted formats', () => {
      const html = renderToStaticMarkup(<CreateGameModal />);

      expect(html).toContain('Upload Your Booking');
      expect(html).toContain('Optional');
      expect(html).toContain('booking-file-input');
      expect(html).toContain('image/jpeg,image/png,image/webp,application/pdf');
    });

    it('verifies storage.rules enforces secure isolation for bookings', () => {
      const storageRulesPath = path.resolve(process.cwd(), 'storage.rules');
      const content = fs.readFileSync(storageRulesPath, 'utf-8');

      // Must protect /bookings/{userId}/{fileName}
      expect(content).toContain('/bookings/{userId}/{fileName}');
      expect(content).toContain('request.auth.uid == userId');
      expect(content).toContain('10 * 1024 * 1024'); // 10MB limit
      expect(content).toContain('application/pdf');
    });

    it('verifies server.ts exposes /api/extract-booking endpoint with gemini-3.8-flash', () => {
      const serverPath = path.resolve(process.cwd(), 'server.ts');
      const content = fs.readFileSync(serverPath, 'utf-8');

      expect(content).toContain('/api/extract-booking');
      expect(content).toContain('gemini-3.8-flash');
      expect(content).toContain('fileBase64');
      expect(content).toContain('mimeType');
    });
  });

  describe('Task 2: Stationary Map and Continuous Smooth Carousel', () => {
    it('verifies KuwaitMapTab implementation uses requestAnimationFrame without panning map camera on ticks', () => {
      const mapTabPath = path.resolve(process.cwd(), 'src/components/KuwaitMapTab.tsx');
      const content = fs.readFileSync(mapTabPath, 'utf-8');

      // Continuous rAF animation on scrollLeft
      expect(content).toContain('requestAnimationFrame');
      expect(content).toContain('scrollLeft');
      // Stationary camera: targetCenter passed to MapCameraController is cameraTargetCenter, not derived from carousel scroll
      expect(content).toContain('targetCenter={cameraTargetCenter}');
      expect(content).toContain('setCameraTargetCenter');
      // Pauses on hover/touch/focus
      expect(content).toContain('onMouseEnter={handleUserInteractionStart}');
      expect(content).toContain('onTouchStart');
      expect(content).toContain('prefers-reduced-motion');

      const html = renderToStaticMarkup(<KuwaitMapTab />);
      expect(html).toContain('google-map-canvas');

      // Verify bottom navigation safety clearance (4.75rem + safe-area-inset-bottom)
      expect(content).toContain('bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]');
      // Verify mobile card dimensions (single full card per viewport width)
      expect(content).toContain('w-[calc(100vw-3.25rem)]');
      expect(content).toContain('max-w-[340px]');
      // Verify seamless wrap logic without abrupt jumps
      expect(content).toContain('scrollLeft >= halfWidth');
    });
  });

  describe('Task 3: Touch-Friendly Date and Time Inputs with 44px+ Buttons & Single Icon', () => {
    it('verifies CreateGameModal renders touch button surfaces and 12-hour AM/PM label', () => {
      const html = renderToStaticMarkup(<CreateGameModal />);

      // 44px touch targets (w-11 h-11 is 44px in Tailwind)
      expect(html).toContain('w-11 h-11');
      // 12-hour label for initial 20:00 (8:00 PM) and 21:30 (9:30 PM)
      expect(html).toContain('8:00 PM');
      expect(html).toContain('9:30 PM');
      // Date and time inputs present
      expect(html).toContain('type="date"');
      expect(html).toContain('type="time"');
    });

    it('verifies native browser calendar and clock picker indicators are hidden in CSS and inputs', () => {
      const indexCssPath = path.resolve(process.cwd(), 'src/index.css');
      const cssContent = fs.readFileSync(indexCssPath, 'utf-8');

      // Native indicator disabled in global CSS
      expect(cssContent).toContain('::-webkit-calendar-picker-indicator');
      expect(cssContent).toContain('display: none !important');

      const modalPath = path.resolve(process.cwd(), 'src/components/CreateGameModal.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf-8');

      // Inputs have utility class hiding native indicators
      expect(modalContent).toContain('[&::-webkit-calendar-picker-indicator]:hidden');
      // Manual time picker modal support with hours 1-12, exact minutes 0-59, AM/PM
      expect(modalContent).toContain('ManualTimePickerModal');
      expect(modalContent).toContain('Exact: 00-59');
    });
  });
});
