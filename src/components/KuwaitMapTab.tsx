import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  APIProvider, 
  Map, 
  Marker, 
  useMap 
} from '@vis.gl/react-google-maps';
import { useApp } from '../context/AppContext';
import { 
  Game, 
  SportType, 
  getSportLabel, 
  getKuwaitAreaLabel,
  formatTime12Hour,
  formatTimeRange12Hour
} from '../types';
import { resolveGameLocation } from '../lib/location';
import { GOOGLE_MAPS_API_KEY } from './MapLocationPicker';
import { 
  KUWAIT_CAMERA_BOUNDS, 
  KUWAIT_MIN_ZOOM, 
  KUWAIT_DEFAULT_CENTER, 
  KUWAIT_DEFAULT_ZOOM 
} from '../lib/kuwaitGeo';
import { 
  Crosshair, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  ChevronRight,
  Filter
} from 'lucide-react';

const GoogleMapsAPIProvider = APIProvider as React.ComponentType<any>;

const SPORTS: (SportType | 'All')[] = [
  'All',
  'Football',
  'Padel',
  'Basketball',
  'Volleyball',
  'Tennis',
  'Badminton',
  'Other'
];

interface ResolvedGameItem {
  game: Game;
  lat: number;
  lng: number;
  locationLabel: string;
  spotsLeft: number;
}

/**
 * Controller inside GoogleMapsAPIProvider for imperative camera motions
 */
function MapCameraController({
  targetCenter,
  recenterTrigger
}: {
  targetCenter: { lat: number; lng: number } | null;
  recenterTrigger: number;
}) {
  const map = useMap();

  // Smoothly pan when target center changes
  useEffect(() => {
    if (map && targetCenter) {
      map.panTo(targetCenter);
    }
  }, [map, targetCenter]);

  // Recenter to default Kuwait view
  useEffect(() => {
    if (map && recenterTrigger > 0) {
      map.panTo(KUWAIT_DEFAULT_CENTER);
      map.setZoom(KUWAIT_DEFAULT_ZOOM);
    }
  }, [map, recenterTrigger]);

  return null;
}

export const KuwaitMapTab: React.FC = () => {
  const { 
    games, 
    selectedSport, 
    setSelectedSport, 
    setSelectedGameForDetail, 
    setCreateGameModalOpen,
    setCreateGamePrefill,
    language, 
    t 
  } = useApp();

  const [activeSportFilter, setActiveSportFilter] = useState<SportType | 'All'>(selectedSport || 'All');
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [cameraTargetCenter, setCameraTargetCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [recenterCount, setRecenterCount] = useState<number>(0);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);

  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const resumeTimerRef = useRef<any>(null);
  const isInteractingRef = useRef<boolean>(false);
  isInteractingRef.current = isInteracting;

  // Sync external selectedSport if changed outside
  useEffect(() => {
    if (selectedSport) {
      setActiveSportFilter(selectedSport);
    }
  }, [selectedSport]);

  // Real, available games with valid coordinates (strictly excluding completed, cancelled, or moderated)
  const availableGames = useMemo<ResolvedGameItem[]>(() => {
    return (games || [])
      .filter((g) => {
        if (g.status === 'Completed' || g.status === 'Cancelled' || g.visibility === 'Private' || g.moderated === true) {
          return false;
        }
        if (activeSportFilter !== 'All' && g.sport !== activeSportFilter) {
          return false;
        }
        const hasLatLng = typeof g.latitude === 'number' && typeof g.longitude === 'number' && !isNaN(g.latitude) && !isNaN(g.longitude);
        const hasCoords = g.coordinates && typeof g.coordinates.x === 'number' && typeof g.coordinates.y === 'number';
        return hasLatLng || hasCoords;
      })
      .map((g) => {
        const resolved = resolveGameLocation(g);
        const participantCount = Array.isArray(g.participants) ? g.participants.length : 0;
        const spotsLeft = Math.max(0, (g.maxPlayers || 0) - participantCount);
        return {
          game: g,
          lat: resolved.latitude,
          lng: resolved.longitude,
          locationLabel: resolved.locationLabel,
          spotsLeft
        };
      });
  }, [games, activeSportFilter]);

  // Scroll card into view in carousel smoothly when user explicitly selects a marker
  const scrollToCard = useCallback((gameId: string) => {
    const el = cardRefs.current[gameId];
    if (el && carouselRef.current) {
      el.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, []);

  // Handle marker click (explicit user action: pan map and scroll carousel to card)
  const handleMarkerClick = useCallback((gameId: string) => {
    setSelectedGameId(gameId);
    const match = availableGames.find(item => item.game.id === gameId);
    if (match) {
      setCameraTargetCenter({ lat: match.lat, lng: match.lng });
    }
    scrollToCard(gameId);
    // Pause auto-scroll on manual marker click
    setIsInteracting(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 6000);
  }, [availableGames, scrollToCard]);

  // Visual clones for seamless looping without jumps (only if > 1 game)
  const displayGames = useMemo(() => {
    return availableGames.length > 1 
      ? [...availableGames, ...availableGames] 
      : availableGames;
  }, [availableGames]);

  // Continuous, smooth horizontal card gliding via requestAnimationFrame.
  // The Google Map remains 100% stationary during this animation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const el = carouselRef.current;
    if (!el || availableGames.length <= 1) return;

    let animId: number;
    let lastTime = performance.now();

    const glideStep = (now: number) => {
      const delta = Math.min(now - lastTime, 64); // Guard against giant delta on tab switch
      lastTime = now;

      if (!isInteractingRef.current && el) {
        // Smooth continuous travel: ~35px per second
        const speed = 0.035;
        el.scrollLeft += delta * speed;

        // Seamless infinite looping: when we have scrolled through the first set,
        // subtract half scrollWidth so transition is 100% imperceptible and jitter-free
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > 20 && el.scrollLeft >= halfWidth) {
          el.scrollLeft -= halfWidth;
        }
      }

      animId = requestAnimationFrame(glideStep);
    };

    animId = requestAnimationFrame(glideStep);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [availableGames.length]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, []);

  // Pause interaction triggers on hover, touch, focus
  const handleUserInteractionStart = () => {
    setIsInteracting(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };

  const handleUserInteractionEnd = () => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
    }, 3500);
  };

  return (
    <div className="relative w-full h-full min-h-[500px] flex-1 flex flex-col bg-[#EEF3F9] dark:bg-[#06135B] select-none overflow-hidden">
      {/* 1. Google Maps Canvas filling the entire available viewport */}
      <div className="absolute inset-0 w-full h-full">
        <GoogleMapsAPIProvider 
          apiKey={GOOGLE_MAPS_API_KEY} 
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <Map
            defaultCenter={KUWAIT_DEFAULT_CENTER}
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
            mapId="KUWAIT_GAMES_MAP_ID"
            disableDefaultUI={false}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
          >
            <MapCameraController 
              targetCenter={cameraTargetCenter} 
              recenterTrigger={recenterCount} 
            />

            {availableGames.map(({ game, lat, lng }) => {
              const isSelected = selectedGameId === game.id;
              return (
                <Marker
                  key={game.id}
                  position={{ lat, lng }}
                  title={`${game.title} - ${game.courtName}`}
                  onClick={() => handleMarkerClick(game.id)}
                  zIndex={isSelected ? 999 : 20}
                />
              );
            })}
          </Map>
        </GoogleMapsAPIProvider>
      </div>

      {/* 2. Floating Top Controls: Sport filter strip & Recenter Button */}
      <div className="absolute top-3 left-0 right-0 z-20 px-3 sm:px-6 pointer-events-none">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          {/* Horizontally scrollable sport filter pill strip */}
          <div 
            className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pointer-events-auto bg-white/95 dark:bg-[#0D1629]/95 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 p-1.5 rounded-2xl shadow-md max-w-[calc(100vw-5.5rem)] sm:max-w-none"
            onTouchStart={(e) => e.stopPropagation()}
          >
            {SPORTS.map(s => {
              const isSelected = activeSportFilter === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setActiveSportFilter(s);
                    setSelectedSport(s);
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-[#3A60AA] text-white border-[#3A60AA] shadow-xs'
                      : 'bg-[#EEF3F9] dark:bg-[#142578] text-[#06135B] dark:text-[#B9C9E0] border-[#B9C9E0]/40 dark:border-[#1F3590]/50 hover:bg-[#DCE5F2] dark:hover:bg-[#1B3088]'
                  }`}
                >
                  {s === 'All' ? t('All Kuwait', 'كل الكويت') : getSportLabel(s as SportType, language)}
                </button>
              );
            })}
          </div>

          {/* Quick Recenter Button */}
          <button
            type="button"
            onClick={() => {
              setCameraTargetCenter(null);
              setRecenterCount(c => c + 1);
            }}
            title={t('Recenter on Kuwait', 'إعادة التوسيط على الكويت')}
            className="pointer-events-auto w-9.5 h-9.5 rounded-2xl bg-white/95 dark:bg-[#0D1629]/95 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 shadow-md text-slate-700 dark:text-slate-200 hover:text-[#3A60AA] dark:hover:text-[#B9C9E0] hover:bg-[#EEF3F9] dark:hover:bg-[#142578] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            aria-label={t('Recenter on Kuwait', 'إعادة التوسيط')}
          >
            <Crosshair className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
          </button>
        </div>
      </div>

      {/* 3. Floating Bottom Game Cards Carousel */}
      <div 
        className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] lg:bottom-4 left-0 right-0 z-20 px-3 sm:px-6 pointer-events-none"
      >
        <div className="max-w-4xl mx-auto">
          {availableGames.length === 0 ? (
            /* Minimal Unobtrusive Empty State */
            <div className="pointer-events-auto bg-white/95 dark:bg-[#0D1629]/95 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 text-center shadow-md max-w-sm mx-auto flex items-center justify-between gap-3">
              <div className="text-left rtl:text-right min-w-0">
                <p className="text-xs font-bold text-[#06135B] dark:text-white truncate">
                  {t('No games found for this filter', 'لا توجد مباريات مطابقة')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80 truncate">
                  {t('Host a game and pin it to the map', 'أنشئ مباراة وثبتها على الخريطة')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCreateGamePrefill(null);
                  setCreateGameModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-[5px] bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold text-xs shrink-0 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('Create', 'أنشئ')}</span>
              </button>
            </div>
          ) : (
            /* Horizontally Continuous Traveling Card Carousel */
            <div
              ref={carouselRef}
              dir="ltr"
              onMouseEnter={handleUserInteractionStart}
              onMouseLeave={handleUserInteractionEnd}
              onTouchStart={(e) => {
                e.stopPropagation();
                handleUserInteractionStart();
              }}
              onTouchMove={(e) => {
                e.stopPropagation();
              }}
              onTouchEnd={handleUserInteractionEnd}
              onFocus={handleUserInteractionStart}
              onBlur={handleUserInteractionEnd}
              className="pointer-events-auto flex items-stretch gap-2.5 sm:gap-3 overflow-x-auto scrollbar-none py-1 touch-pan-x"
            >
              {displayGames.map(({ game, lat, lng, spotsLeft }, index) => {
                const isSelected = selectedGameId === game.id;
                const priceFormatted = game.pricePerPlayerKWD > 0 
                  ? `${game.pricePerPlayerKWD.toFixed(3)} ${t('KWD', 'د.ك')}`
                  : t('Free', 'مجاناً');

                return (
                  <div
                    key={`${game.id}-${index}`}
                    ref={(el) => { if (index < availableGames.length) cardRefs.current[game.id] = el; }}
                    onClick={() => {
                      setSelectedGameId(game.id);
                      setCameraTargetCenter({ lat, lng });
                      setSelectedGameForDetail(game);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedGameForDetail(game);
                      }
                    }}
                    className={`w-[calc(100vw-3.25rem)] sm:w-[320px] max-w-[340px] shrink-0 bg-white dark:bg-[#0D1629] border rounded-2xl p-4 text-left rtl:text-right cursor-pointer transition-all duration-200 shadow-md ${
                      isSelected 
                        ? 'border-[#3A60AA] ring-2 ring-[#3A60AA]/30 dark:ring-[#B9C9E0]/40' 
                        : 'border-slate-200/80 dark:border-slate-800 hover:border-[#3A60AA]'
                    }`}
                  >
                    {/* Top Row: Sport Label & Price */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase text-[#3A60AA] dark:text-[#B9C9E0] bg-[#EEF3F9] dark:bg-[#142578] px-2.5 py-0.5 rounded-full border border-[#B9C9E0]/50 dark:border-[#1F3590]/60">
                        {getSportLabel(game.sport, language)}
                      </span>

                      <span className="text-xs font-bold text-[#06135B] dark:text-white">
                        {priceFormatted}
                      </span>
                    </div>

                    {/* Middle: Title */}
                    <h3 className="font-bold text-[#06135B] dark:text-white text-xs sm:text-sm truncate mb-1.5">
                      {game.title}
                    </h3>

                    {/* Metadata Row: Date, Time & Venue */}
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#B9C9E0]/80 mb-2.5 truncate">
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatTime12Hour(game.startTime, language)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{game.courtName || getKuwaitAreaLabel(game.area, language)}</span>
                      </span>
                    </div>

                    {/* Bottom Row: Available Spots & Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                        <Users className="w-3 h-3 text-[#3A60AA] dark:text-[#B9C9E0]" />
                        <span>
                          {spotsLeft > 0 
                            ? `${spotsLeft} ${t('spots left', 'أماكن شاغرة')}`
                            : t('Game Full', 'المباراة مكتملة')}
                        </span>
                      </span>

                      <span className="text-slate-400 dark:text-slate-500 flex items-center gap-0.5 text-[10px] font-medium">
                        <span>{t('Details', 'التفاصيل')}</span>
                        <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
