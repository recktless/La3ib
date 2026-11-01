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
  Users, 
  Compass, 
  RotateCw, 
  AlertCircle, 
  SlidersHorizontal, 
  Search, 
  X,
  Plus
} from 'lucide-react';

export const CommunityTab: React.FC = () => {
  const { 
    games, 
    selectedSport, 
    setSelectedSport, 
    searchQuery,
    setSearchQuery,
    isGamesLoading,
    gamesError,
    refetchGames,
    setCreateGameModalOpen,
    setCreateGamePrefill,
    language,
    t 
  } = useApp();

  // Top-level Community switcher: Games vs Players
  const [activeCommunityTab, setActiveCommunityTab] = useState<'games' | 'players'>('games');
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
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

  // Active filters count (excluding sport which is always visible in the horizontal strip)
  const activeAdvancedFiltersCount = 
    (selectedSkill !== 'All' ? 1 : 0) + 
    (selectedGender !== 'All' ? 1 : 0) + 
    (indoorOnly ? 1 : 0) + 
    (maxPrice < 15 ? 1 : 0);

  // Client-side sorting: earliest date/time first
  const sortedGames = [...games].sort((a, b) => {
    const dateCmp = (a.date || '').localeCompare(b.date || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  const filteredGames = sortedGames.filter(g => {
    // Exclude completed or cancelled games from discovery
    if (g.status === 'Completed' || g.status === 'Cancelled' || g.moderated === true) {
      return false;
    }
    // Sport filter
    if (selectedSport !== 'All' && g.sport !== selectedSport) return false;
    // Skill filter
    if (selectedSkill !== 'All' && g.skillLevel !== selectedSkill) return false;
    // Gender filter
    if (selectedGender !== 'All' && g.gender !== selectedGender) return false;
    // Indoor filter
    if (indoorOnly && !g.isIndoor) return false;
    // Price filter
    if (typeof g.pricePerPlayerKWD === 'number' && g.pricePerPlayerKWD > maxPrice) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (g.title || '').toLowerCase().includes(q);
      const matchSport = (g.sport || '').toLowerCase().includes(q);
      const matchCourt = (g.courtName || '').toLowerCase().includes(q);
      const matchArea = (g.area || '').toLowerCase().includes(q);
      const matchGov = ((g as any).governorate || '').toLowerCase().includes(q);
      const matchOrg = (g.organizer?.name || '').toLowerCase().includes(q);
      if (!matchTitle && !matchSport && !matchCourt && !matchArea && !matchGov && !matchOrg) return false;
    }
    return true;
  });

  const handleResetFilters = () => {
    setSelectedSport('All');
    setSelectedSkill('All');
    setSelectedGender('All');
    setIndoorOnly(false);
    setMaxPrice(15);
    setSearchQuery('');
  };

  return (
    <div className="space-y-4 min-w-0 w-full">
      {/* 1. Header with Compact Switcher immediately beneath heading [ Games | Players ] */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#06135B] dark:text-white tracking-tight">
            {t('Community', 'المجتمع')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#B9C9E0] mt-0.5">
            {activeCommunityTab === 'games'
              ? `${filteredGames.length} ${t('matches open in Kuwait', 'مباريات مفتوحة في الكويت')}`
              : t('Connect with verified sports players across Kuwait', 'تواصل مع لاعبين موثوقين في الكويت')}
          </p>
        </div>

        {/* Primary Segmented Switch: Games | Players */}
        <div className="flex items-center bg-slate-100 dark:bg-[#0D1629] p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto shrink-0 shadow-xs">
          <button
            type="button"
            onClick={() => setActiveCommunityTab('games')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeCommunityTab === 'games'
                ? 'bg-[#3A60AA] text-white shadow-xs'
                : 'text-slate-700 dark:text-[#B9C9E0] hover:text-[#06135B] dark:hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t('Games', 'المباريات')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCommunityTab('players')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeCommunityTab === 'players'
                ? 'bg-[#3A60AA] text-white shadow-xs'
                : 'text-slate-700 dark:text-[#B9C9E0] hover:text-[#06135B] dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('Players', 'اللاعبون')}</span>
          </button>
        </div>
      </div>

      {/* Render Player Discovery if selected */}
      {activeCommunityTab === 'players' ? (
        <PlayerDiscoveryTab />
      ) : (
        /* Games Discovery Mode */
        <div className="space-y-3.5 min-w-0 w-full">
          {/* Mobile Search Field */}
          <div className="block md:hidden">
            <div className="relative">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('Search games, venues, areas...', 'ابحث عن مباريات، ملاعب، مناطق...')}
                className="w-full bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 rounded-xl pl-9 rtl:pl-7 rtl:pr-9 pr-7 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#3A60AA] shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Horizontally scrollable sport filter strip */}
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none min-w-0 flex-1">
              {sports.map(s => {
                const isSelected = selectedSport === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSport(s)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#3A60AA] text-white border-[#3A60AA] shadow-xs'
                        : 'bg-white dark:bg-[#0D1629] text-[#06135B] dark:text-[#B9C9E0] border-slate-200/80 dark:border-slate-800 hover:bg-[#EEF3F9] dark:hover:bg-[#142578]'
                    }`}
                  >
                    {s === 'All' ? t('All Sports', 'جميع الرياضات') : getSportLabel(s as SportType, language)}
                  </button>
                );
              })}
            </div>

            {/* Toggle Button for Expandable Advanced Filter Panel */}
            <button
              type="button"
              onClick={() => setFiltersOpen(prev => !prev)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                filtersOpen || activeAdvancedFiltersCount > 0
                  ? 'bg-[#3A60AA] text-white border-[#3A60AA] shadow-xs'
                  : 'bg-white dark:bg-[#0D1629] text-[#06135B] dark:text-[#B9C9E0] border-slate-200/80 dark:border-slate-800 hover:bg-[#EEF3F9]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>{t('Filters', 'الفلاتر')}</span>
              {activeAdvancedFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-[#3A60AA] text-[10px] font-black flex items-center justify-center">
                  {activeAdvancedFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Expandable Advanced Filters Panel */}
          {filtersOpen && (
            <div className="bg-white dark:bg-[#0D1629] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs space-y-3 shadow-xs animate-in fade-in duration-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Skill Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-[#B9C9E0] mb-1">
                    {t('Skill Level', 'مستوى المهارة')}
                  </label>
                  <select
                    value={selectedSkill}
                    onChange={(e) => setSelectedSkill(e.target.value as SkillLevel | 'All')}
                    className="w-full bg-slate-50 dark:bg-[#142578] border border-slate-200 dark:border-[#1F3590] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#3A60AA]"
                  >
                    <option value="All">{t('Any Level', 'كل المستويات')}</option>
                    <option value="Beginner">{t('Beginner', 'مبتدئ')}</option>
                    <option value="Casual">{t('Casual', 'ودي / ترويحي')}</option>
                    <option value="Intermediate">{t('Intermediate', 'متوسط')}</option>
                    <option value="Advanced">{t('Advanced', 'متقدم')}</option>
                    <option value="Competitive">{t('Competitive', 'تنافسي عالي')}</option>
                  </select>
                </div>

                {/* Gender Preference */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-[#B9C9E0] mb-1">
                    {t('Gender', 'الجنس')}
                  </label>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value as GenderPreference | 'All')}
                    className="w-full bg-slate-50 dark:bg-[#142578] border border-slate-200 dark:border-[#1F3590] rounded-xl px-3 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#3A60AA]"
                  >
                    <option value="All">{t('Any', 'الكل')}</option>
                    <option value="Everyone">{t('Everyone', 'الجميع')}</option>
                    <option value="Men">{t('Men Only', 'رجال فقط')}</option>
                    <option value="Women">{t('Women Only', 'نساء فقط')}</option>
                  </select>
                </div>

                {/* Indoor AC / Price */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-[#B9C9E0] mb-1">
                    {t('Court & Price', 'الملعب والسعر')}
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIndoorOnly(!indoorOnly)}
                      className={`flex-1 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer text-center truncate ${
                        indoorOnly 
                          ? 'bg-[#3A60AA] text-white border-[#3A60AA]' 
                          : 'bg-slate-50 dark:bg-[#142578] border-slate-200 dark:border-[#1F3590] text-slate-700 dark:text-[#B9C9E0]'
                      }`}
                    >
                      {indoorOnly ? '✓ ' + t('Indoor AC', 'مكيف فقط') : t('Indoor AC', 'مكيف فقط')}
                    </button>

                    <div className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-[#B9C9E0] shrink-0">
                      <span>≤</span>
                      <span className="font-bold text-[#3A60AA] dark:text-[#B9C9E0]">{maxPrice}</span>
                      <input 
                        type="range"
                        min="1"
                        max="15"
                        step="1"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(parseInt(e.target.value, 10))}
                        className="w-14 accent-[#3A60AA] cursor-pointer"
                        title={t('Max Price', 'أقصى سعر')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset button inside drawer */}
              {activeAdvancedFiltersCount > 0 && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0] hover:underline cursor-pointer"
                  >
                    {t('Reset advanced filters', 'إعادة تعيين الفلاتر')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Loading and Error States */}
          {isGamesLoading && (
            <div className="text-center py-10 bg-white dark:bg-[#0D1629] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 text-slate-500 shadow-xs">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-[#3A60AA] mb-2" />
              <p className="text-xs">{t('Loading pickup games...', 'جارٍ تحميل المباريات...')}</p>
            </div>
          )}

          {gamesError && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center justify-between text-xs">
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

          {/* Single-Column Games Feed */}
          {filteredGames.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-[#0D1629] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 space-y-3 shadow-xs">
              <Compass className="w-8 h-8 text-[#3A60AA] dark:text-[#B9C9E0] mx-auto opacity-70" />
              <p className="text-slate-600 dark:text-[#B9C9E0] text-xs font-medium">
                {t('No matches found matching your filters.', 'لا توجد مباريات تطابق الفلاتر المحددة.')}
              </p>
              <div className="flex items-center justify-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0] underline cursor-pointer"
                >
                  {t('Reset all filters', 'إعادة تعيين الفلاتر')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreateGamePrefill(null);
                    setCreateGameModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Create Game', 'أنشئ مباراة')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
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
