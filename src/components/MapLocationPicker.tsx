import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  APIProvider, 
  Map, 
  Marker, 
  useMap, 
  useMapsLibrary 
} from '@vis.gl/react-google-maps';
import { 
  latLngToCoordinates, 
  getNearestKuwaitLocation, 
  formatLatLngDisplay, 
  resolveGameLocation 
} from '../lib/location';
import { MapPin, Search, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  KUWAIT_CAMERA_BOUNDS,
  KUWAIT_MIN_ZOOM,
  KUWAIT_DEFAULT_CENTER,
  KUWAIT_DEFAULT_ZOOM,
  isLocationInKuwait
} from '../lib/kuwaitGeo';

export { KUWAIT_DEFAULT_CENTER, KUWAIT_DEFAULT_ZOOM, KUWAIT_CAMERA_BOUNDS, KUWAIT_MIN_ZOOM };

export const GOOGLE_MAPS_API_KEY = 
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDhptS1jdCokoThPk61B9DdE-WGzdotF8s';

const GoogleMapsAPIProvider = APIProvider as React.ComponentType<any>;

export interface MapLocationValue {
  coordinates: { x: number; y: number };
  latitude: number;
  longitude: number;
  locationLabel: string;
  area: string;
}

export interface MapLocationPickerProps {
  value?: {
    coordinates?: { x: number; y: number } | null;
    latitude?: number | null;
    longitude?: number | null;
    area?: string | null;
    address?: string | null;
    locationLabel?: string | null;
  } | null;
  onChange: (val: MapLocationValue) => void;
  isLocked?: boolean;
  lockReason?: string;
  venueName?: string;
}

/**
 * Places Search Bar restricted and prioritized to Kuwait
 */
function PlacesSearchBar({
  onSelectPlace,
  disabled,
  placeholder
}: {
  onSelectPlace: (place: { name?: string; formatted_address?: string; lat: number; lng: number }) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');
  let language = 'en';
  try {
    const ctx = useApp();
    if (ctx?.language) language = ctx.language;
  } catch {
    // Rendered outside AppProvider
  }

  useEffect(() => {
    if (!places || !inputRef.current || disabled) return;

    try {
      const autocomplete = new places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'kw' },
        fields: ['geometry', 'name', 'formatted_address']
      });

      const listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          onSelectPlace({
            name: place.name || undefined,
            formatted_address: place.formatted_address || undefined,
            lat,
            lng
          });
        }
      });

      return () => {
        if (typeof google !== 'undefined' && google.maps?.event?.removeListener) {
          google.maps.event.removeListener(listener);
        }
      };
    } catch (e) {
      console.warn('[Google Maps Places] Could not initialize autocomplete:', e);
    }
  }, [places, disabled, onSelectPlace]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none text-neutral-500">
        <Search className="w-3.5 h-3.5" />
      </div>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        placeholder={placeholder || (language === 'ar' ? 'ابحث عن ملعب أو منطقة في الكويت...' : 'Search venue or area in Kuwait...')}
        className={`w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none transition-colors ${
          disabled
            ? 'bg-slate-100 dark:bg-[#1B253D] border-slate-200 dark:border-[#22304E] text-slate-400 dark:text-slate-500 cursor-not-allowed select-none'
            : 'bg-white dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#1246DF] dark:focus:border-[#05BCD1]'
        }`}
      />
    </div>
  );
}

/**
 * Map controller for panning and click-to-drop pin
 */
function MapController({
  center,
  onClick,
  isLocked
}: {
  center: { lat: number; lng: number };
  onClick: (lat: number, lng: number) => void;
  isLocked: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center.lat, center.lng]);

  useEffect(() => {
    if (!map || isLocked) return;

    const clickListener = map.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onClick(e.latLng.lat(), e.latLng.lng());
      }
    });

    return () => {
      if (typeof google !== 'undefined' && google.maps?.event?.removeListener) {
        google.maps.event.removeListener(clickListener);
      }
    };
  }, [map, isLocked, onClick]);

  return null;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onChange,
  isLocked = false,
  venueName
}) => {
  let t: (en: string, ar: string) => string = (en: string, _ar: string) => en;
  let language = 'en';
  try {
    const ctx = useApp();
    if (ctx && typeof ctx.t === 'function') t = ctx.t;
    if (ctx?.language) language = ctx.language;
  } catch {
    // Rendered outside AppProvider
  }
  // Derive initial resolved location from saved game values or default to Kuwait Center
  const resolved = resolveGameLocation(value || {});

  const [latLng, setLatLng] = useState<{ latitude: number; longitude: number }>({
    latitude: resolved.latitude,
    longitude: resolved.longitude
  });
  const [locationLabel, setLocationLabel] = useState<string>(
    value?.locationLabel || resolved.locationLabel
  );
  const [geoWarning, setGeoWarning] = useState<string | null>(null);
  const warningTimerRef = useRef<any>(null);

  // Synchronize internal state if value prop changes (e.g. opening edit modal with saved coordinates)
  useEffect(() => {
    if (value) {
      const res = resolveGameLocation(value);
      setLatLng({ latitude: res.latitude, longitude: res.longitude });
      setLocationLabel(value.locationLabel || res.locationLabel);
    }
  }, [value?.latitude, value?.longitude, value?.locationLabel]);

  // Clean up warning timer on unmount
  useEffect(() => {
    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, []);

  const handleLocationUpdate = useCallback((
    lat: number, 
    lng: number, 
    placeName?: string, 
    placeAddress?: string
  ) => {
    if (isLocked) return;

    // Validate coordinates lie within Kuwait sovereign territory
    if (!isLocationInKuwait(lat, lng)) {
      setGeoWarning(
        t(
          'Selected location must be within Kuwait. Previous location retained.',
          'يجب أن يكون الموقع المختار داخل دولة الكويت. تم الاحتفاظ بالموقع السابق.'
        )
      );
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      warningTimerRef.current = setTimeout(() => {
        setGeoWarning(null);
      }, 5000);
      return;
    }

    setGeoWarning(null);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    const clampedLat = parseFloat(lat.toFixed(6));
    const clampedLng = parseFloat(lng.toFixed(6));
    const nearest = getNearestKuwaitLocation({ latitude: clampedLat, longitude: clampedLng });
    const coords = latLngToCoordinates(clampedLat, clampedLng);
    const resolvedLabel = placeAddress || placeName || `${venueName || nearest.name}, ${nearest.area}`;

    setLatLng({ latitude: clampedLat, longitude: clampedLng });
    setLocationLabel(resolvedLabel);

    onChange({
      coordinates: coords,
      latitude: clampedLat,
      longitude: clampedLng,
      locationLabel: resolvedLabel,
      area: nearest.area
    });
  }, [isLocked, venueName, onChange, t]);

  const currentCenter = { lat: latLng.latitude, lng: latLng.longitude };

  return (
    <div className={`space-y-3 p-3.5 rounded-xl border transition-colors ${
      isLocked 
        ? 'bg-slate-100 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800' 
        : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-[#22304E]'
    }`}>
      {/* Header Readout */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <MapPin className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1] shrink-0" />
          <span>{t('Location & Coordinates', 'الموقع والإحداثيات')}</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          {formatLatLngDisplay(latLng.latitude, latLng.longitude)}
        </div>
      </div>

      <GoogleMapsAPIProvider 
        apiKey={GOOGLE_MAPS_API_KEY} 
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      >
        {/* Places Search Autocomplete (prioritized/restricted to Kuwait) */}
        <PlacesSearchBar
          disabled={isLocked}
          onSelectPlace={(place) => {
            handleLocationUpdate(place.lat, place.lng, place.name, place.formatted_address);
          }}
          placeholder={
            isLocked
              ? locationLabel || t('Location locked', 'الموقع مقفل')
              : t('Search venue or area in Kuwait...', 'ابحث عن ملعب أو منطقة في الكويت...')
          }
        />

        {/* Unobtrusive Kuwait boundary rejection alert banner */}
        {geoWarning && (
          <div 
            role="alert"
            className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-200 animate-in fade-in duration-200 shadow-xs"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="flex-1 font-medium leading-tight">{geoWarning}</span>
          </div>
        )}

        {/* Real Interactive Google Map */}
        <div className="relative w-full h-52 sm:h-60 rounded-xl overflow-hidden border border-slate-200 dark:border-[#22304E]">
          <Map
            defaultCenter={currentCenter}
            defaultZoom={KUWAIT_DEFAULT_ZOOM}
            minZoom={KUWAIT_MIN_ZOOM}
            restriction={{
              latLngBounds: KUWAIT_CAMERA_BOUNDS,
              strictBounds: true
            }}
            clickableIcons={false}
            streetViewControl={false}
            mapTypeControl={false}
            fullscreenControl={false}
            mapId="DEMO_MAP_ID"
            disableDefaultUI={false}
            gestureHandling={isLocked ? 'none' : 'greedy'}
            style={{ width: '100%', height: '100%' }}
          >
            <MapController
              center={currentCenter}
              onClick={(lat, lng) => handleLocationUpdate(lat, lng)}
              isLocked={isLocked}
            />

            <Marker
              position={currentCenter}
              draggable={!isLocked}
              onDragEnd={(e) => {
                if (e.latLng && !isLocked) {
                  handleLocationUpdate(e.latLng.lat(), e.latLng.lng());
                }
              }}
            />
          </Map>

          {!isLocked && (
            <div className="absolute bottom-2 left-2 right-2 bg-white/95 dark:bg-[#131C31]/95 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#22304E] text-[10px] text-slate-700 dark:text-slate-300 flex items-center justify-between pointer-events-none">
              <span>{t('Click map or drag pin to adjust location', 'انقر على الخريطة أو اسحب الدبوس لتحديد الموقع')}</span>
              <span className="text-[#1246DF] dark:text-[#05BCD1] font-semibold">{t('Kuwait WGS84', 'الكويت WGS84')}</span>
            </div>
          )}
        </div>
      </GoogleMapsAPIProvider>

      {/* Selected Location Address Summary */}
      {locationLabel && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
          {locationLabel}
        </p>
      )}
    </div>
  );
};
