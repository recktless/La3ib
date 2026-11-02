import React from 'react';
import { useApp } from '../context/AppContext';
import { GameCard } from './GameCard';
import { SportType, getKuwaitAreaLabel } from '../types';
import { 
  CalendarPlus, 
  Compass, 
  PlusCircle, 
  ArrowRight
} from 'lucide-react';

export const HomeTab: React.FC = () => {
  const { 
    games, 
    selectedSport, 
    setSelectedSport, 
    selectedArea, 
    setActiveTab, 
    setBookingModalOpen, 
    setCreateGameModalOpen,
    setCreateGamePrefill,
    currentUser,
    authStatus,
    firebaseUser,
    language,
    isDesktopSidebarCollapsed,
    t 
  } = useApp();

  const sportsList: { name: SportType; labelAr: string }[] = [
    { name: 'Football', labelAr: 'كرة قدم' },
    { name: 'Padel', labelAr: 'بادل' },
    { name: 'Basketball', labelAr: 'كرة سلة' },
    { name: 'Volleyball', labelAr: 'كرة طائرة' },
    { name: 'Tennis', labelAr: 'تنس' },
    { name: 'Badminton', labelAr: 'ريشة' },
    { name: 'Other', labelAr: 'أخرى' },
  ];

  // Open upcoming pickup games
  const openGames = games.filter(g => {
    if (selectedSport !== 'All' && g.sport !== selectedSport) return false;
    return g.status !== 'Completed' && g.status !== 'Cancelled';
  });

  const isGuest = authStatus === 'unauthenticated' || !firebaseUser || currentUser.id === 'guest';
  const guestGreeting = language === 'ar' ? 'زائر' : 'Guest';
  const firstName = currentUser?.name && !isGuest ? currentUser.name.split(' ')[0] : '';

  return (
    <div className="space-y-4">
      {/* 1. Compact Social Greeting & Action Header */}
      <div data-tutorial="welcome" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#06135B] dark:text-white tracking-tight">
            {isGuest
              ? `${t('Welcome,', 'مرحباً بك،')} ${guestGreeting}`
              : (firstName 
                  ? `${t('Welcome back,', 'مرحباً بك،')} ${firstName}` 
                  : t('Kuwait Sports Community', 'مجتمع الرياضة في الكويت'))}
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#B9C9E0] mt-0.5">
            {selectedArea === 'All Kuwait' 
              ? t('Upcoming pickup games & open matches', 'المباريات والأنشطة القادمة في الكويت')
              : `${t('Matches in', 'المباريات في')} ${getKuwaitAreaLabel(selectedArea as any, language)}`}
          </p>
        </div>

        {/* Quick Action Links: Shown on Mobile/Tablet always, and on Desktop ONLY when sidebar is collapsed */}
        <div className={`${isDesktopSidebarCollapsed ? 'flex' : 'flex lg:hidden'} items-center gap-2 shrink-0`}>
          <button
            type="button"
            onClick={() => setActiveTab('book-directly')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#0D1629] dark:hover:bg-[#142578] border border-slate-200/80 dark:border-slate-800 text-xs font-semibold text-[#06135B] dark:text-[#B9C9E0] transition-colors cursor-pointer shadow-xs"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
            <span>{t('Book Directly', 'احجز مباشرة')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateGamePrefill(null);
              setCreateGameModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t('Create Game', 'أنشئ مباراة')}</span>
          </button>
        </div>
      </div>

      {/* 2. Simple Horizontal Sports Filter Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none min-w-0">
        <button
          type="button"
          onClick={() => setSelectedSport('All')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
            selectedSport === 'All'
              ? 'bg-[#3A60AA] text-white border-[#3A60AA] shadow-xs'
              : 'bg-white dark:bg-[#0D1629] text-[#06135B] dark:text-[#B9C9E0] border-slate-200/80 dark:border-slate-800 hover:bg-[#EEF3F9] dark:hover:bg-[#142578]'
          }`}
        >
          {t('All Sports', 'جميع الرياضات')}
        </button>
        {sportsList.map((item) => {
          const isSelected = selectedSport === item.name;
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => setSelectedSport(isSelected ? 'All' : item.name)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 transition-colors cursor-pointer border ${
                isSelected
                  ? 'bg-[#3A60AA] text-white border-[#3A60AA] shadow-xs'
                  : 'bg-white dark:bg-[#0D1629] text-[#06135B] dark:text-[#B9C9E0] border-slate-200/80 dark:border-slate-800 hover:bg-[#EEF3F9] dark:hover:bg-[#142578]'
              }`}
            >
              {t(item.name, item.labelAr)}
            </button>
          );
        })}
      </div>

      {/* 3. Feed Header */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs font-semibold text-slate-500 dark:text-[#B9C9E0]/70">
          {openGames.length} {t('matches in Kuwait', 'مباريات متاحة')}
        </span>

        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className="flex items-center gap-1 text-xs font-semibold text-[#3A60AA] dark:text-[#B9C9E0] hover:underline cursor-pointer"
        >
          <span>{t('View all in Community', 'عرض الكل في المجتمع')}</span>
          <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        </button>
      </div>

      {/* 4. Social Games Feed */}
      {openGames.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-[#0D1629] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6 space-y-3">
          <Compass className="w-8 h-8 text-[#3A60AA] dark:text-[#B9C9E0] mx-auto opacity-70" />
          <p className="text-slate-600 dark:text-[#B9C9E0] text-xs font-medium">
            {t('No games currently scheduled for this sport/area.', 'لا توجد مباريات معلنة حالياً لهذه الرياضة أو المنطقة.')}
          </p>
          <button
            type="button"
            onClick={() => {
              setCreateGamePrefill(null);
              setCreateGameModalOpen(true);
            }}
            className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0] underline cursor-pointer"
          >
            {t('Post a game to invite players!', 'أنشئ مباراة وادعُ اللاعبين الآن!')}
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {openGames.map(game => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </div>
  );
};
