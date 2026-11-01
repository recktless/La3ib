import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  isLocationInKuwait, 
  KUWAIT_CAMERA_BOUNDS, 
  KUWAIT_MIN_ZOOM,
  KUWAIT_DEFAULT_CENTER 
} from '../src/lib/kuwaitGeo';
import { MapLocationPicker } from '../src/components/MapLocationPicker';
import { KuwaitMapTab } from '../src/components/KuwaitMapTab';
import { INITIAL_GAMES, CURRENT_USER } from '../src/data/mockData';

const { mockAppContextValue, capturedMapProps } = vi.hoisted(() => ({
  mockAppContextValue: { current: {} as any },
  capturedMapProps: { list: [] as any[] }
}));

vi.mock('../src/context/AppContext', () => ({
  useApp: () => mockAppContextValue.current
}));

// Mock Google Maps component to inspect props
vi.mock('@vis.gl/react-google-maps', () => ({
  APIProvider: ({ children }: any) => <div data-testid="google-maps-api-provider">{children}</div>,
  Map: (props: any) => {
    capturedMapProps.list.push(props);
    return (
      <div 
        data-testid="mock-google-map" 
        data-clickable-icons={String(props.clickableIcons)}
        data-min-zoom={props.minZoom}
        data-strict-bounds={String(props.restriction?.strictBounds)}
        data-street-view={String(props.streetViewControl)}
        data-map-type={String(props.mapTypeControl)}
        data-fullscreen={String(props.fullscreenControl)}
      >
        {props.children}
      </div>
    );
  },
  Marker: (props: any) => (
    <div 
      data-testid="mock-marker" 
      data-position={JSON.stringify(props.position)}
      data-draggable={String(props.draggable)}
    />
  ),
  useMap: () => ({
    panTo: vi.fn(),
    setZoom: vi.fn(),
    addListener: vi.fn(() => ({ remove: vi.fn() }))
  }),
  useMapsLibrary: () => null
}));

describe('Kuwait Map Restrictions & Geographic Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedMapProps.list = [];
    mockAppContextValue.current = {
      games: INITIAL_GAMES,
      selectedSport: 'All',
      setSelectedSport: vi.fn(),
      setSelectedGameForDetail: vi.fn(),
      setCreateGameModalOpen: vi.fn(),
      setCreateGamePrefill: vi.fn(),
      language: 'en',
      t: (en: string, _ar: string) => en
    };
  });

  describe('isLocationInKuwait Boundary Check', () => {
    it('accepts locations across Kuwait mainland, coast, and islands', () => {
      // Kuwait City Capital
      expect(isLocationInKuwait(29.3759, 47.9774)).toBe(true);
      // Mishref sports stadium
      expect(isLocationInKuwait(29.2731, 48.0536)).toBe(true);
      // Salmiya coastline
      expect(isLocationInKuwait(29.3333, 48.0772)).toBe(true);
      // Marina Beach Volleyball
      expect(isLocationInKuwait(29.3400, 48.0650)).toBe(true);
      // Jahra
      expect(isLocationInKuwait(29.3375, 47.6581)).toBe(true);
      // Abdali (North Kuwait border)
      expect(isLocationInKuwait(30.0400, 47.7200)).toBe(true);
      // Wafra (South Kuwait border)
      expect(isLocationInKuwait(28.5900, 48.1000)).toBe(true);
      // Sabah Al Ahmad Sea City / Khiran
      expect(isLocationInKuwait(28.6300, 48.3500)).toBe(true);
      // Failaka Island
      expect(isLocationInKuwait(29.4300, 48.3300)).toBe(true);
      // Boubyan Island
      expect(isLocationInKuwait(29.8000, 48.2000)).toBe(true);
    });

    it('strictly rejects coordinates in neighboring countries and overseas', () => {
      // Basra, Iraq (North)
      expect(isLocationInKuwait(30.5085, 47.7804)).toBe(false);
      // Safwan, Iraq (immediately North of Abdali border)
      expect(isLocationInKuwait(30.1300, 47.7200)).toBe(false);
      // Khafji, Saudi Arabia (immediately South of Nuwaiseeb border)
      expect(isLocationInKuwait(28.4200, 48.4900)).toBe(false);
      // Hafr Al Batin, Saudi Arabia (West of Salmi)
      expect(isLocationInKuwait(28.4328, 45.9708)).toBe(false);
      // Riyadh, Saudi Arabia
      expect(isLocationInKuwait(24.7136, 46.6753)).toBe(false);
      // London, UK
      expect(isLocationInKuwait(51.5074, -0.1278)).toBe(false);
      // Null Island / Origin
      expect(isLocationInKuwait(0, 0)).toBe(false);
      // Malformed / Non-numeric
      expect(isLocationInKuwait(null, null)).toBe(false);
      expect(isLocationInKuwait(undefined, undefined)).toBe(false);
      expect(isLocationInKuwait(NaN, NaN)).toBe(false);
    });
  });

  describe('KuwaitMapTab Map Configuration', () => {
    it('enforces camera restrictions, minZoom, clickableIcons: false, and disables POI popups', () => {
      const html = renderToStaticMarkup(<KuwaitMapTab />);

      expect(html).toContain('data-testid="mock-google-map"');
      expect(html).toContain('data-clickable-icons="false"');
      expect(html).toContain(`data-min-zoom="${KUWAIT_MIN_ZOOM}"`);
      expect(html).toContain('data-strict-bounds="true"');
      expect(html).toContain('data-street-view="false"');
      expect(html).toContain('data-map-type="false"');
      expect(html).toContain('data-fullscreen="false"');

      // Verify the restriction props passed to Map
      const mapProp = capturedMapProps.list.find(p => p.mapId === 'KUWAIT_GAMES_MAP_ID');
      expect(mapProp).toBeDefined();
      expect(mapProp.clickableIcons).toBe(false);
      expect(mapProp.minZoom).toBe(KUWAIT_MIN_ZOOM);
      expect(mapProp.restriction).toEqual({
        latLngBounds: KUWAIT_CAMERA_BOUNDS,
        strictBounds: true
      });
      expect(mapProp.streetViewControl).toBe(false);
      expect(mapProp.mapTypeControl).toBe(false);
      expect(mapProp.fullscreenControl).toBe(false);
    });
  });

  describe('MapLocationPicker Interaction & Boundary Enforcement', () => {
    it('renders with strict Kuwait restrictions and clickableIcons: false', () => {
      const handleChange = vi.fn();
      const html = renderToStaticMarkup(
        <MapLocationPicker
          value={{ latitude: 29.3759, longitude: 47.9774, locationLabel: 'Kuwait City' }}
          onChange={handleChange}
        />
      );

      expect(html).toContain('data-testid="mock-google-map"');
      expect(html).toContain('data-clickable-icons="false"');
      expect(html).toContain(`data-min-zoom="${KUWAIT_MIN_ZOOM}"`);
      expect(html).toContain('data-strict-bounds="true"');
      expect(html).toContain('data-street-view="false"');
      expect(html).toContain('data-map-type="false"');
      expect(html).toContain('data-fullscreen="false"');

      const mapProp = capturedMapProps.list.find(p => p.mapId === 'DEMO_MAP_ID');
      expect(mapProp).toBeDefined();
      expect(mapProp.clickableIcons).toBe(false);
      expect(mapProp.minZoom).toBe(KUWAIT_MIN_ZOOM);
      expect(mapProp.restriction).toEqual({
        latLngBounds: KUWAIT_CAMERA_BOUNDS,
        strictBounds: true
      });
    });

    it('renders locked state correctly when location is locked by booking', () => {
      const handleChange = vi.fn();
      const html = renderToStaticMarkup(
        <MapLocationPicker
          value={{ latitude: 29.3759, longitude: 47.9774, locationLabel: 'Locked Court' }}
          onChange={handleChange}
          isLocked={true}
        />
      );

      expect(html).toContain('data-draggable="false"');
    });
  });
});
