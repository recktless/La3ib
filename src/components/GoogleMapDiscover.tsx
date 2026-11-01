import React, { useState, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  Marker, 
  useMap 
} from '@vis.gl/react-google-maps';
import { Game, getSportLabel, getKuwaitAreaLabel, formatTimeRange12Hour } from '../types';
import { resolveGameLocation, formatLatLngDisplay } from '../lib/location';
import { MapPin, Navigation, ExternalLink, Users, Calendar, Clock } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, KUWAIT_DEFAULT_CENTER, KUWAIT_DEFAULT_ZOOM } from './MapLocationPicker';

const GoogleMapsAPIProvider = APIProvider as React.ComponentType<any>;

interface GoogleMapDiscoverProps {
  games: Game[];
  onSelectGame: (game: Game) => void;
  language: 'en' | 'ar';
  t: (en: string, ar: string) => string;
}

function MapPanController({ targetCenter }: { targetCenter: { lat: number; lng: number } | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (map && targetCenter) {
      map.panTo(targetCenter);
    }
  }, [map, targetCenter]);
  return null;
}

export const GoogleMapDiscover: React.FC<GoogleMapDiscoverProps> = ({
  games,
  onSelectGame,
  language,
  t
}) => {
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // Filter games: only discoverable, non-private, non-cancelled games with valid coordinates
  const discoverableGames = useMemo(() => {
    return games
      .filter((g) => {
        if (g.visibility === 'Private' || g.status === 'Cancelled' || g.moderated === true) {
          return false;
        }
        const hasLatLng = typeof g.latitude === 'number' && typeof g.longitude === 'number' && !isNaN(g.latitude) && !isNaN(g.longitude);
        const hasCoords = g.coordinates && typeof g.coordinates.x === 'number' && typeof g.coordinates.y === 'number';
        return hasLatLng || hasCoords;
      })
      .map((g) => {
        const resolved = resolveGameLocation(g);
        return {
          game: g,
          lat: resolved.latitude,
          lng: resolved.longitude,
          locationLabel: resolved.locationLabel,
          mapsUrl: resolved.mapsUrl
        };
      });
  }, [games]);

  const targetCenter = useMemo(() => {
    if (!selectedGame) return null;
    const resolved = resolveGameLocation(selectedGame);
    return { lat: resolved.latitude, lng: resolved.longitude };
  }, [selectedGame]);

  return (
    <div className="relative w-full h-[580px] bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-[#22304E] rounded-2xl overflow-hidden flex flex-col md:flex-row">
      <div className="relative flex-1 h-full min-h-[300px]">
        <GoogleMapsAPIProvider 
          apiKey={GOOGLE_MAPS_API_KEY} 
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <Map
            defaultCenter={KUWAIT_DEFAULT_CENTER}
            defaultZoom={KUWAIT_DEFAULT_ZOOM}
            mapId="DEMO_MAP_ID"
            disableDefaultUI={false}
            gestureHandling="greedy"
            style={{ width: '100%', height: '100%' }}
          >
            <MapPanController targetCenter={targetCenter} />

            {discoverableGames.map(({ game, lat, lng }) => {
              const isSelected = selectedGame?.id === game.id;
              return (
                <Marker
                  key={game.id}
                  position={{ lat, lng }}
                  title={`${game.title} - ${game.courtName}`}
                  onClick={() => setSelectedGame(game)}
                  zIndex={isSelected ? 99 : 10}
                />
              );
            })}
          </Map>

          {/* Map Top Badge */}
          <div className="absolute top-4 left-4 bg-white/95 dark:bg-[#131C31]/95 px-3 py-2 rounded-xl border border-slate-200 dark:border-[#22304E] text-xs text-slate-700 dark:text-slate-300 pointer-events-none z-10">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <Navigation className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
              <span>{t('Kuwait Google Maps Radar', 'خريطة جوجل لمباريات الكويت')}</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              {discoverableGames.length === 1
                ? t('1 game with verified coordinates on map', 'مباراة واحدة محددة على الخريطة')
                : t(`${discoverableGames.length} games available on Google Maps`, `${discoverableGames.length} مباريات متاحة على الخريطة`)}
            </p>
          </div>
        </GoogleMapsAPIProvider>
      </div>

      {/* Selected Game Sidebar / Drawer */}
      {selectedGame && (() => {
        const resolved = resolveGameLocation(selectedGame);
        const spotsLeft = selectedGame.maxPlayers - selectedGame.participants.length;

        return (
          <div className="w-full md:w-84 bg-white dark:bg-[#131C31] border-t md:border-t-0 md:border-l border-slate-200 dark:border-[#22304E] p-5 overflow-y-auto flex flex-col justify-between shrink-0 z-20">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#1246DF] dark:text-[#05BCD1] bg-[#1246DF]/10 dark:bg-[#05BCD1]/15 border border-[#1246DF]/20 dark:border-[#05BCD1]/30 px-2 py-0.5 rounded-lg">
                  {getSportLabel(selectedGame.sport, language)}
                </span>
                <button 
                  onClick={() => setSelectedGame(null)} 
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1B253D] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                  {selectedGame.title}
                </h4>
                <p className="text-xs text-[#1246DF] dark:text-[#05BCD1] font-semibold mt-1">
                  {selectedGame.courtName}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {resolved.locationLabel || getKuwaitAreaLabel(selectedGame.area, language)}
                </p>
              </div>

              {/* Date & Time */}
              <div className="p-3 bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-slate-200 dark:border-[#22304E] space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1] shrink-0" />
                  <span>{selectedGame.date}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1] shrink-0" />
                  <span>{formatTimeRange12Hour(selectedGame.startTime, selectedGame.endTime, language)}</span>
                </div>
              </div>

              {/* Coordinates Readout & Google Maps Navigation */}
              <div className="p-2.5 bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-slate-200 dark:border-[#22304E] flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#1246DF] dark:text-[#05BCD1] shrink-0" />
                  {formatLatLngDisplay(resolved.latitude, resolved.longitude)}
                </span>
                <a
                  href={resolved.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1246DF] dark:text-[#05BCD1] hover:underline"
                >
                  <span>{t('Open in Maps', 'فتح في الخرائط')}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Availability & Cost */}
              <div className="p-3 bg-slate-50 dark:bg-[#0B1120] rounded-xl border border-slate-200 dark:border-[#22304E] grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('Availability', 'الأماكن')}</span>
                  <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                    {selectedGame.participants.length}/{selectedGame.maxPlayers}
                    <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                      ({spotsLeft} {t('left', 'متبقي')})
                    </span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('Per Player', 'الحصة')}</span>
                  <span className="font-bold text-[#1246DF] dark:text-[#05BCD1] text-sm mt-0.5 block">
                    {selectedGame.pricePerPlayerKWD.toFixed(3)} KWD
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onSelectGame(selectedGame)}
              className="w-full mt-4 py-3 rounded-xl bg-[#1246DF] hover:bg-[#0e37b3] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              {t('View Match Details', 'عرض تفاصيل المباراة')}
            </button>
          </div>
        );
      })()}
    </div>
  );
};
