import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatTime12Hour, formatTimeRange12Hour } from '../src/types';
import { WheelTimePickerModal } from '../src/components/WheelTimePickerModal';
import { GameCard } from '../src/components/GameCard';
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

// Mock Google Maps
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

describe('Inter Font, 12-Hour Time & iOS-Style Wheel Picker', () => {
  beforeEach(() => {
    mockAppContextValue.current = {
      currentUser: CURRENT_USER,
      activeTab: 'home',
      setActiveTab: vi.fn(),
      games: INITIAL_GAMES,
      language: 'en',
      t: (en: string, ar: string) => (mockAppContextValue.current.language === 'ar' ? (ar || en) : en),
      setSelectedGameForDetail: vi.fn(),
      setSelectedGameForJoin: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      joinGame: vi.fn(),
      isPlayerBlocked: () => false,
    };
  });

  describe('1. Typography — Inter Globally & Cairo for Arabic', () => {
    it('verifies index.html loads Inter (weights 400-900) and Cairo (weights 400-900)', () => {
      const indexPath = path.resolve(process.cwd(), 'index.html');
      const indexHtml = fs.readFileSync(indexPath, 'utf-8');

      expect(indexHtml).toContain('family=Inter:wght@400;500;600;700;800;900');
      expect(indexHtml).toContain('family=Cairo:wght@400;500;600;700;800;900');
      // Must not contain DM Sans
      expect(indexHtml).not.toContain('DM+Sans');
      expect(indexHtml).not.toContain('DM Sans');
    });

    it('verifies src/index.css sets Inter as primary English font and Cairo for RTL', () => {
      const cssPath = path.resolve(process.cwd(), 'src/index.css');
      const css = fs.readFileSync(cssPath, 'utf-8');

      // Theme variables
      expect(css).toContain("--font-sans: 'Inter', 'Cairo'");
      expect(css).toContain("--font-cairo: 'Cairo', 'Inter'");

      // Base layer
      expect(css).toContain("body {\n    font-family: 'Inter', 'Cairo'");
      expect(css).toContain("[dir=\"rtl\"] {\n    font-family: 'Cairo', 'Inter'");

      // No DM Sans
      expect(css).not.toContain('DM Sans');
    });
  });

  describe('2. Universal 12-Hour Time Formatting', () => {
    it('correctly converts all test case times to 12-hour AM/PM format in English', () => {
      expect(formatTime12Hour('08:00', 'en')).toBe('8:00 AM');
      expect(formatTime12Hour('12:00', 'en')).toBe('12:00 PM');
      expect(formatTime12Hour('13:30', 'en')).toBe('1:30 PM');
      expect(formatTime12Hour('18:45', 'en')).toBe('6:45 PM');
      expect(formatTime12Hour('00:00', 'en')).toBe('12:00 AM');
      expect(formatTime12Hour('23:15', 'en')).toBe('11:15 PM');
    });

    it('correctly converts times with Arabic AM/PM (ص / م) localization', () => {
      expect(formatTime12Hour('08:00', 'ar')).toBe('8:00 ص');
      expect(formatTime12Hour('12:00', 'ar')).toBe('12:00 م');
      expect(formatTime12Hour('13:30', 'ar')).toBe('1:30 م');
      expect(formatTime12Hour('18:45', 'ar')).toBe('6:45 م');
      expect(formatTime12Hour('00:00', 'ar')).toBe('12:00 ص');
      expect(formatTime12Hour('23:15', 'ar')).toBe('11:15 م');
    });

    it('formats time ranges cleanly with formatTimeRange12Hour', () => {
      expect(formatTimeRange12Hour('20:00', '21:30', 'en')).toBe('8:00 PM – 9:30 PM');
      expect(formatTimeRange12Hour('20:00', '21:30', 'ar')).toBe('8:00 م – 9:30 م');
      expect(formatTimeRange12Hour('08:00', '09:00', 'en')).toBe('8:00 AM – 9:00 AM');
    });

    it('renders 12-hour AM/PM time in GameCard', () => {
      const sampleGame = {
        ...INITIAL_GAMES[0],
        startTime: '18:45',
        endTime: '20:15',
      };

      const htmlEn = renderToStaticMarkup(<GameCard game={sampleGame} />);
      expect(htmlEn).toContain('6:45 PM – 8:15 PM');

      mockAppContextValue.current.language = 'ar';
      const htmlAr = renderToStaticMarkup(<GameCard game={sampleGame} />);
      expect(htmlAr).toContain('6:45 م – 8:15 م');
    });

    it('renders 12-hour AM/PM time in KuwaitMapTab carousel', () => {
      mockAppContextValue.current.games = [
        {
          ...INITIAL_GAMES[0],
          startTime: '20:00',
          endTime: '21:30',
        },
      ];

      const html = renderToStaticMarkup(<KuwaitMapTab />);
      expect(html).toContain('8:00 PM');
    });
  });

  describe('3. Apple-Inspired Scrolling Wheel Time Picker', () => {
    it('renders all three columns: Hour (1-12), Minute (00-59), and Period (AM/PM)', () => {
      const onChange = vi.fn();
      const onClose = vi.fn();

      const html = renderToStaticMarkup(
        <WheelTimePickerModal
          isOpen={true}
          value="20:30"
          onChange={onChange}
          onClose={onClose}
          title="Select Start Time"
          language="en"
        />
      );

      // Dialog title & Action buttons
      expect(html).toContain('Select Start Time');
      expect(html).toContain('Cancel');
      expect(html).toContain('Set Time');
      expect(html).toContain('Done');

      // Live 12-hour digital preview
      expect(html).toContain('8:30 PM');

      // Hour column (1 to 12)
      for (let h = 1; h <= 12; h++) {
        expect(html).toContain(`>${h}<`);
      }

      // Minute column (includes 00, 15, 30, 45, 59)
      expect(html).toContain('>00<');
      expect(html).toContain('>15<');
      expect(html).toContain('>30<');
      expect(html).toContain('>45<');
      expect(html).toContain('>59<');

      // Period column
      expect(html).toContain('>AM<');
      expect(html).toContain('>PM<');

      // Wheels container is strictly dir="ltr" to preserve Hour : Minute Period order
      expect(html).toContain('dir="ltr"');
    });

    it('renders Arabic labels and localized period in Arabic mode', () => {
      const onChange = vi.fn();
      const onClose = vi.fn();

      const html = renderToStaticMarkup(
        <WheelTimePickerModal
          isOpen={true}
          value="08:15"
          onChange={onChange}
          onClose={onClose}
          title="تحديد وقت البداية"
          language="ar"
          t={(en: string, ar: string) => ar || en}
        />
      );

      expect(html).toContain('تحديد وقت البداية');
      expect(html).toContain('إلغاء');
      expect(html).toContain('تأكيد الوقت');
      // Live Arabic preview
      expect(html).toContain('8:15 ص');
      // Period buttons in Arabic
      expect(html).toContain('>ص<');
      expect(html).toContain('>م<');
    });
  });
});
