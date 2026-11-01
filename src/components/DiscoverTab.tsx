import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { GameCard } from './GameCard';
import { PlayerDiscoveryTab } from './PlayerDiscoveryTab';
import { 
  SportType, 
  SkillLevel, 
  GenderPreference, 
  getSportLabel
} from '../types';
import { 
  Map as MapIcon, 
  List, 
  RotateCw, 
  Users, 
  Compass, 
  AlertCircle 
} from 'lucide-react';
import { GoogleMapDiscover } from './GoogleMapDiscover';

export const DiscoverTab: React.FC = () => {
  const { 
    games, 
    selectedSport, 
    setSelectedSport, 
    setSelectedGameForDetail,
    searchQuery,
    isGamesLoading,
    gamesError,
    refetchGames,
    language,
    t 
  } = useApp();

  // Top-level Discover switcher: Pickup Games vs Player Discovery
  const [discoverSection, setDiscoverSection] = useState<'games' | 'players'>('games');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedSkill, setSelectedSkill] = useState<SkillLevel | 'All'>('All');
  const [selectedGender, setSelectedGender] = useState<GenderPreference | 'All'>('All');
  const [indoorOnly, setIndoorOnly] = useState<boolean>(false);
  const [maxPrice, setMaxPrice] = useState<number>(15);

  const sports: (SportType | 'All')[] = [
    'All',
    'Football',
    'Padel',
    'Basketball',
    'Volleyball',
    'Tennis',
    'Badminton',
    'Other'
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
    <div className="space-y-4 min-w-0 w-full">
      {/* 1. Header with Mode Switcher [ Pickup Games | Find Players ] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#06135B] dark:text-white tracking-tight">
            {discoverSection === 'games' 
              ? t('Discover Pickup Games', 'استكشاف المباريات')
              : t('Player Community', 'مجتمع اللاعبين')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#B9C9E0] mt-0.5">
            {discoverSection === 'games'
              ? `${filteredGames.length} ${t('matches found matching your filters', 'مباريات متطابقة مع بحثك')}`
              : t('Connect with verified sports players across Kuwait', 'تواصل مع لاعبين موثوقين في الكويت')}
          </p>
        </div>

        {/* Primary Segmented Switch */}
        <div className="flex items-center bg-[#EEF3F9] dark:bg-[#0D1C68] p-1 rounded-[6px] border border-[#B9C9E0] dark:border-[#1F3590] self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setDiscoverSection('games')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer ${
              discoverSection === 'games'
                ? 'bg-[#3A60AA] text-white shadow-xs'
                : 'text-slate-700 dark:text-[#B9C9E0] hover:text-[#06135B] dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t('Pickup Games', 'المباريات')}</span>
          </button>

          <button
            type="button"
            onClick={() => setDiscoverSection('players')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-bold transition-colors cursor-pointer ${
              discoverSection === 'players'
                ? 'bg-[#3A60AA] text-white shadow-xs'
                : 'text-slate-700 dark:text-[#B9C9E0] hover:text-[#06135B] dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('Find Players', 'البحث عن لاعبين')}</span>
          </button>
        </div>
      </div>

      {/* Render Player Discovery if selected */}
      {discoverSection === 'players' ? (
        <PlayerDiscoveryTab />
      ) : (
        /* Pickup Games Mode */
        <div className="space-y-3.5 min-w-0 w-full">
          {/* Sports Filter Chips - Sleek horizontal strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none min-w-0">
            {sports.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSport(s)}
                className={`px-3 py-1 rounded-[5px] text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                  selectedSport === s
                    ? 'bg-[#3A60AA] text-white border-[#3A60AA]'
                    : 'bg-white dark:bg-[#0D1C68] text-[#06135B] dark:text-[#B9C9E0] border-[#B9C9E0] dark:border-[#1F3590] hover:bg-[#EEF3F9] dark:hover:bg-[#142578]'
                }`}
              >
                {s === 'All' ? t('All Sports', 'جميع الرياضات') : getSportLabel(s as SportType, language)}
              </button>
            ))}
          </div>

          {/* Secondary Filter Bar & View Mode Toggle */}
          <div className="bg-[#EEF3F9] dark:bg-[#0D1C68] p-2.5 sm:p-3 rounded-[6px] border border-[#B9C9E0] dark:border-[#1F3590] flex flex-wrap items-center justify-between gap-2 text-xs min-w-0">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {/* Skill Filter */}
              <select
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value as SkillLevel | 'All')}
                className="bg-white dark:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] rounded-[5px] px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#3A60AA]"
              >
                <option value="All">{t('Skill: Any', 'المستوى: الكل')}</option>
                <option value="Beginner">{t('Beginner', 'مبتدئ')}</option>
                <option value="Casual">{t('Casual', 'ودي / ترويحي')}</option>
                <option value="Intermediate">{t('Intermediate', 'متوسط')}</option>
                <option value="Advanced">{t('Advanced', 'متقدم')}</option>
                <option value="Competitive">{t('Competitive', 'تنافسي عالي')}</option>
              </select>

              {/* Gender Filter */}
              <select
                value={selectedGender}
                onChange={(e) => setSelectedGender(e.target.value as GenderPreference | 'All')}
                className="bg-white dark:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] rounded-[5px] px-2.5 py-1 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#3A60AA]"
              >
                <option value="All">{t('Gender: Any', 'الجنس: الكل')}</option>
                <option value="Everyone">{t('Everyone', 'الجميع')}</option>
                <option value="Men">{t('Men Only', 'رجال فقط')}</option>
                <option value="Women">{t('Women Only', 'نساء فقط')}</option>
              </select>

              {/* Indoor Toggle */}
              <button
                type="button"
                onClick={() => setIndoorOnly(!indoorOnly)}
                className={`px-2.5 py-1 rounded-[5px] border transition-colors cursor-pointer font-medium ${
                  indoorOnly 
                    ? 'bg-[#3A60AA] text-white border-[#3A60AA] font-bold' 
                    : 'bg-white dark:bg-[#142578] border-[#B9C9E0] dark:border-[#1F3590] text-slate-700 dark:text-[#B9C9E0] hover:bg-[#EEF3F9]'
                }`}
              >
                {indoorOnly ? '✓ ' + t('Indoor AC', 'مكيف فقط') : t('Indoor AC Only', 'مكيف فقط')}
              </button>

              {/* Price Range */}
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-[#B9C9E0] shrink-0">
                <span>{t('Max:', 'أقصى:')}</span>
                <span className="font-bold text-[#3A60AA] dark:text-[#B9C9E0]">{maxPrice.toFixed(1)} {t('KWD', 'د.ك')}</span>
                <input 
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                  className="w-16 accent-[#3A60AA] cursor-pointer"
                />
              </div>
            </div>

            {/* List / Map Switcher */}
            <div className="flex items-center bg-white dark:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] p-0.5 rounded-[5px] shrink-0 ml-auto rtl:ml-0 rtl:mr-auto">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 py-1 rounded-[4px] text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-[#3A60AA] text-white shadow-xs'
                    : 'text-slate-700 dark:text-[#B9C9E0] hover:text-[#06135B] dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>{t('List', 'قائمة')}</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1 px-2 py-1 rounded-[4px] text-xs font-bold transition-colors cursor-pointer ${
                  viewMode === 'map'
                    ? 'bg-[#3A60AA] text-white shadow-xs'
                    : 'text-slate-700 dark:text-[#B9C9E0] hover:text-[#06135B] dark:hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>{t('Map', 'خريطة')}</span>
              </button>
            </div>
          </div>

          {/* Loading and Error States */}
          {isGamesLoading && (
            <div className="text-center py-10 bg-white dark:bg-[#0D1C68] rounded-[6px] border border-[#B9C9E0] dark:border-[#1F3590] p-6 text-slate-500">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#3A60AA] mb-2" />
              <p className="text-xs">{t('Loading pickup games...', 'جارٍ تحميل المباريات...')}</p>
            </div>
          )}

          {gamesError && (
            <div className="p-4 rounded-[6px] bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{gamesError}</span>
              </div>
              {refetchGames && (
                <button
                  type="button"
                  onClick={refetchGames}
                  className="font-bold underline cursor-pointer"
                >
                  {t('Retry', 'إعادة المحاولة')}
                </button>
              )}
            </div>
          )}

          {/* View Mode: Map View */}
          {viewMode === 'map' ? (
            <div className="rounded-[6px] overflow-hidden border border-[#B9C9E0] dark:border-[#1F3590] h-[520px]">
              <GoogleMapDiscover 
                games={filteredGames} 
                onSelectGame={(g) => setSelectedGameForDetail(g)} 
                language={language}
                t={t}
              />
            </div>
          ) : (
            /* View Mode: List Feed */
            filteredGames.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-[#0D1C68] rounded-[6px] border border-[#B9C9E0] dark:border-[#1F3590] p-6 space-y-2">
                <p className="text-slate-500 dark:text-[#B9C9E0] text-xs">
                  {t('No matches found matching your filters.', 'لا توجد مباريات تطابق الفلاتر المحددة.')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSport('All');
                    setSelectedSkill('All');
                    setSelectedGender('All');
                    setIndoorOnly(false);
                    setMaxPrice(15);
                  }}
                  className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0] underline cursor-pointer"
                >
                  {t('Reset all filters', 'إعادة تعيين الفلاتر')}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredGames.map(game => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
