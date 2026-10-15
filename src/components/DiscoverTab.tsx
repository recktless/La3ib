import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GameCard } from './GameCard';
import { 
  SportType, 
  SkillLevel, 
  GenderPreference, 
  KuwaitArea,
  Game
} from '../types';
import { 
  Filter, 
  MapPin, 
  SlidersHorizontal, 
  Map as MapIcon, 
  List, 
  Search, 
  Calendar, 
  X,
  Navigation,
  Sparkles,
  RotateCw,
  PlusCircle,
  AlertCircle
} from 'lucide-react';

export const DiscoverTab: React.FC = () => {
  const { 
    games, 
    courts, 
    selectedArea, 
    setSelectedArea, 
    selectedSport, 
    setSelectedSport, 
    setSelectedGameForDetail,
    setCreateGameModalOpen,
    searchQuery,
    setSearchQuery,
    isGamesLoading,
    gamesError,
    refetchGames,
    authStatus,
    t 
  } = useApp();

  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel | 'All'>('All');
  const [selectedGender, setSelectedGender] = useState<GenderPreference | 'All'>('All');
  const [indoorOnly, setIndoorOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(10);
  const [activeMapPin, setActiveMapPin] = useState<Game | null>(null);

  const sports: (SportType | 'All')[] = [
    'All',
    'Football',
    'Padel',
    'Basketball',
    'Volleyball',
    'Tennis',
    'Badminton'
  ];

  // Client-side sorting: date, then startTime safely
  const sortedGames = [...games].sort((a, b) => {
    const dateCmp = (a.date || '').localeCompare(b.date || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  const filteredGames = sortedGames.filter(g => {
    // Sport filter
    if (selectedSport !== 'All' && g.sport !== selectedSport) return false;
    // Area filter (checks both area and governorate)
    if (selectedArea !== 'All Kuwait' && g.area !== selectedArea && (g as any).governorate !== selectedArea) return false;
    // Skill filter
    if (selectedSkill !== 'All' && g.skillLevel !== selectedSkill) return false;
    // Gender filter
    if (selectedGender !== 'All' && g.gender !== selectedGender) return false;
    // Indoor filter
    if (indoorOnly && !g.isIndoor) return false;
    // Price filter
    if (g.pricePerPlayerKWD > maxPrice) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = g.title.toLowerCase().includes(q);
      const matchSport = g.sport.toLowerCase().includes(q);
      const matchCourt = g.courtName.toLowerCase().includes(q);
      const matchArea = g.area.toLowerCase().includes(q);
      const matchGov = ((g as any).governorate || '').toLowerCase().includes(q);
      const matchOrg = (g.organizer?.name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSport && !matchCourt && !matchArea && !matchGov && !matchOrg) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t('Discover Pickup Games', 'استكشاف مباريات الكويت')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t(
              'Browse open casual matches, reserve spots with KNET, and meet fellow athletes.',
              'تصفح المباريات المفتوحة، احجز مكانك بالدفع السهل والعب مع رياضيين حولك.'
            )}
          </p>
        </div>

        {/* List / Map View Switcher */}
        <div className="flex items-center bg-neutral-900 border border-neutral-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'list'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>{t('List View', 'قائمة')}</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>{t('Kuwait Map View', 'خريطة الكويت')}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800/80 space-y-3">
        {/* Sports Horizontal Scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {sports.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSport(s)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
                selectedSport === s
                  ? 'bg-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20'
                  : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {s === 'All' ? t('All Sports', 'جميع الرياضات') : s}
            </button>
          ))}
        </div>

        {/* Secondary Filter Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-900 text-xs">
          {/* Skill Filter */}
          <select
            value={selectedSkill}
            onChange={(e) => setSelectedSkill(e.target.value as SkillLevel | 'All')}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">{t('Skill: Any', 'المستوى: الكل')}</option>
            <option value="Beginner">Beginner</option>
            <option value="Casual">Casual</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Competitive">Competitive</option>
          </select>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value as GenderPreference | 'All')}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="All">{t('Gender: Any', 'الجنس: الكل')}</option>
            <option value="Everyone">Everyone</option>
            <option value="Men">Men Only</option>
            <option value="Women">Women Only</option>
          </select>

          {/* Indoor Toggle */}
          <button
            onClick={() => setIndoorOnly(!indoorOnly)}
            className={`px-2.5 py-1.5 rounded-lg border transition-colors ${
              indoorOnly 
                ? 'bg-blue-950/80 border-blue-600 text-blue-300 font-bold' 
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
          >
            {indoorOnly ? '✓ ' + t('Indoor AC', 'مكيف فقط') : t('Indoor AC Only', 'مكيف فقط')}
          </button>

          {/* Price Range */}
          <div className="flex items-center gap-1.5 ml-auto text-neutral-400">
            <span>{t('Max Share:', 'أقصى سعر:')}</span>
            <span className="font-bold text-emerald-400">{maxPrice.toFixed(1)} KWD</span>
            <input 
              type="range"
              min="1"
              max="15"
              step="0.5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
              className="w-20 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Error state */}
      {gamesError && !isGamesLoading && (
        <div className="text-center py-12 bg-red-950/20 rounded-3xl border border-red-900/40 p-6 space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mx-auto text-xl">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">
            {t('Unable to load games from Firestore', 'تعذر تحميل المباريات من قاعدة البيانات')}
          </h3>
          <p className="text-xs text-neutral-300 max-w-md mx-auto">
            {t('There was an issue connecting to Cloud Firestore. Please check your network or try again.', 'حدث خطأ أثناء الاتصال بقاعدة البيانات. يرجى التحقق من الاتصال والمحاولة مجدداً.')}
          </p>
          <p className="text-[11px] font-mono text-red-400/80 max-w-md mx-auto break-words bg-neutral-950/60 p-2 rounded-lg border border-red-900/30">
            {gamesError}
          </p>
          <button
            onClick={refetchGames}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{t('Retry Connection', 'إعادة المحاولة')}</span>
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {isGamesLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>{t('Fetching open games from Cloud Firestore...', 'جاري جلب المباريات المفتوحة من قاعدة البيانات...')}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-neutral-900/60 border border-neutral-800/80 rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-24 bg-neutral-800 rounded-full" />
                  <div className="h-5 w-16 bg-neutral-800 rounded-full" />
                </div>
                <div className="h-6 w-3/4 bg-neutral-800 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 w-1/2 bg-neutral-800/80 rounded" />
                  <div className="h-4 w-2/3 bg-neutral-800/80 rounded" />
                </div>
                <div className="h-14 bg-neutral-950/80 rounded-xl" />
                <div className="h-9 bg-neutral-800/50 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'map' ? (
        <div className="relative w-full h-[550px] bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
          {/* Stylized Kuwait Map Canvas */}
          <div className="relative flex-1 bg-gradient-to-b from-neutral-950 via-[#0d1715] to-neutral-950 overflow-hidden">
            {/* Map Grid & Kuwait Geographical Silhouette Mockup */}
            <div className="absolute inset-0 opacity-20 pointer-events-none">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Kuwait Coastline Stylized Contour */}
            <svg className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" viewBox="0 0 500 500">
              <path 
                d="M 120,80 Q 240,60 360,110 Q 420,180 430,280 Q 380,390 320,440 Q 200,430 150,350 Q 100,280 120,80 Z" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="2" 
                strokeDasharray="4 4"
              />
              {/* Kuwait Bay watermark */}
              <text x="320" y="240" fill="#10b981" fontSize="16" fontFamily="sans-serif" opacity="0.4">
                Arabian Gulf / الخليج العربي
              </text>
              <text x="180" y="260" fill="#a3a3a3" fontSize="18" fontWeight="bold" opacity="0.3">
                KUWAIT (الكويت)
              </text>
            </svg>

            {/* Interactive Venue & Game Pins on Map */}
            {filteredGames.map((game) => {
              const isSelected = activeMapPin?.id === game.id;
              return (
                <div
                  key={game.id}
                  onClick={() => setActiveMapPin(game)}
                  style={{ left: `${game.coordinates.x}%`, top: `${game.coordinates.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10 transition-transform hover:scale-125"
                >
                  <div className={`relative flex items-center justify-center p-2 rounded-full shadow-lg transition-all ${
                    isSelected 
                      ? 'bg-emerald-400 text-neutral-950 ring-4 ring-emerald-500/50 scale-110' 
                      : 'bg-neutral-900 border border-emerald-500/60 text-white hover:border-emerald-400'
                  }`}>
                    <span className="text-xs">
                      {game.sport === 'Football' ? '⚽' : game.sport === 'Padel' ? '🎾' : game.sport === 'Basketball' ? '🏀' : '🏐'}
                    </span>
                    <span className="absolute -bottom-5 whitespace-nowrap text-[10px] font-bold bg-neutral-900/90 text-neutral-200 px-1.5 py-0.5 rounded shadow border border-neutral-800">
                      {game.courtName.split(' ')[0]} ({game.pricePerPlayerKWD.toFixed(3)} KWD)
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Map Controls */}
            <div className="absolute top-4 left-4 bg-neutral-900/80 backdrop-blur-md p-2.5 rounded-xl border border-neutral-800 text-xs text-neutral-300">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('Kuwait Interactive Sports Radar', 'رادار ملاعب ومباريات الكويت')}</span>
              </div>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                {t('Tap any pin to view court details & join', 'اضغط على أي نقطة لعرض التفاصيل')}
              </p>
            </div>
          </div>

          {/* Active Pin Sidebar Drawer (Mobile bottom / Desktop right) */}
          {activeMapPin && (
            <div className="w-full md:w-80 bg-neutral-900 border-t md:border-t-0 md:border-l border-neutral-800 p-4 overflow-y-auto flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded">
                    {activeMapPin.sport}
                  </span>
                  <button onClick={() => setActiveMapPin(null)} className="text-neutral-400 hover:text-white">✕</button>
                </div>
                <h4 className="font-bold text-white text-base">{activeMapPin.title}</h4>
                <p className="text-xs text-neutral-300 mt-1">{activeMapPin.courtName}</p>
                <p className="text-xs text-neutral-400">{activeMapPin.area} • {activeMapPin.date} ({activeMapPin.startTime})</p>

                <div className="my-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1 text-xs">
                  <div className="flex justify-between text-neutral-300">
                    <span>{t('Spots:', 'الأماكن:')}</span>
                    <span className="font-bold text-white">{activeMapPin.participants.length}/{activeMapPin.maxPlayers}</span>
                  </div>
                  <div className="flex justify-between text-neutral-300">
                    <span>{t('Share:', 'الحصة:')}</span>
                    <span className="font-black text-emerald-400">{activeMapPin.pricePerPlayerKWD.toFixed(3)} KWD</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedGameForDetail(activeMapPin)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-black text-xs transition-colors"
              >
                {t('View Match Details', 'عرض تفاصيل المباراة')}
              </button>
            </div>
          )}
        </div>
      ) : (
        /* LIST VIEW */
        <div>
          {filteredGames.length === 0 ? (
            <div className="text-center py-16 bg-neutral-950 rounded-3xl border border-neutral-800 space-y-3">
              <div className="w-12 h-12 rounded-full bg-neutral-900 text-neutral-500 flex items-center justify-center mx-auto text-xl">
                🔍
              </div>
              <h3 className="text-base font-bold text-white">
                {games.length === 0
                  ? t('No open games available right now', 'لا توجد مباريات مفتوحة حالياً')
                  : t('No games found matching your filters', 'لم يتم العثور على مباريات مطابقة للبحث')}
              </h3>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                {games.length === 0
                  ? t('Be the first to host a pickup game and invite players in Kuwait!', 'كن أول من ينشئ مباراة ويدعو اللاعبين في الكويت!')
                  : t('Try adjusting your sport, location, or price filters, or create your own game now!', 'جرب تغيير الرياضة أو المنطقة، أو قم بإنشاء مباراتك الخاصة الآن!')}
              </p>
              <button
                onClick={() => setCreateGameModalOpen(true)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{t('Host a Pickup Game', 'إنشاء مباراة الآن')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {filteredGames.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
