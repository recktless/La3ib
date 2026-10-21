import React from 'react';
import { useApp } from '../context/AppContext';
import { GameCard } from './GameCard';
import { SportType } from '../types';
import { 
  CalendarPlus, 
  Compass, 
  PlusCircle, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Zap, 
  ShieldCheck, 
  Flame,
  Users,
  MapPin
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
    t 
  } = useApp();

  const sportsList: { name: SportType; icon: string; labelAr: string }[] = [
    { name: 'Football', icon: '⚽', labelAr: 'كرة قدم' },
    { name: 'Padel', icon: '🎾', labelAr: 'بادل' },
    { name: 'Basketball', icon: '🏀', labelAr: 'كرة سلة' },
    { name: 'Volleyball', icon: '🏐', labelAr: 'كرة طائرة' },
    { name: 'Tennis', icon: '🎾', labelAr: 'تنس' },
    { name: 'Badminton', icon: '🏸', labelAr: 'ريشة' },
    { name: 'Other', icon: '🏆', labelAr: 'أخرى' },
  ];

  // Near you games: filter by area or open games
  const nearYouGames = games.filter(g => {
    if (selectedSport !== 'All' && g.sport !== selectedSport) return false;
    if (selectedArea !== 'All Kuwait' && g.area !== selectedArea) return false;
    return g.status !== 'Completed' && g.status !== 'Cancelled';
  }).slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Hero: "Ready to play?" Fast Action Hub */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-900 to-emerald-950/70 border border-neutral-800 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('Kuwait #1 Sports Social Network', 'المنصة الأولى للرياضة وحجوزات الملاعب في الكويت')}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            {t('Ready to play tonight?', 'جاهز تلعب اليوم؟')}
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
            {t(
              'Join pickup matches near you, book top-tier courts via Li3ib, and coordinate cost sharing with fellow players.',
              'انضم لمباريات قريبة منك، أو احجز ملعبك عبر Li3ib ونسّق تقاسم التكلفة مع اللاعبين بكل سهولة.'
            )}
          </p>

          {/* Frictionless Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('discover')}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-transform transform active:scale-95 cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>{t('Find a Game', 'ابحث عن مباراة')}</span>
            </button>

            <button
              onClick={() => setBookingModalOpen(true)}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-bold text-sm transition-all cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4 text-emerald-400" />
              <span>{t('Book a Court (Li3ib)', 'احجز ملعب (Li3ib)')}</span>
            </button>

            <button
              onClick={() => {
                setCreateGamePrefill(null);
                setCreateGameModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white font-bold text-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t('Create Game', 'أنشئ مباراة')}</span>
            </button>
          </div>
        </div>

        {/* Decorative graphic watermark */}
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none select-none text-[180px] font-black text-emerald-500">
          ⚽
        </div>
      </div>

      {/* Sport Category Quick Selectors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-extrabold text-white">
            {t('Explore by Sport', 'تصفح حسب الرياضة')}
          </h2>
          {selectedSport !== 'All' && (
            <button
              onClick={() => setSelectedSport('All')}
              className="text-xs text-emerald-400 font-semibold hover:underline"
            >
              {t('Clear filter', 'إلغاء التصفية')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
          {sportsList.map((item) => {
            const isSelected = selectedSport === item.name;
            return (
              <button
                key={item.name}
                onClick={() => setSelectedSport(isSelected ? 'All' : item.name)}
                className={`p-3.5 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-lg shadow-emerald-500/20 font-black scale-105'
                    : 'bg-neutral-900/90 hover:bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-xs font-bold tracking-tight">
                  {t(item.name, item.labelAr)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 1: "Games Near You" with rich cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              <span>{t('Games Near You in Kuwait', 'مباريات قريبة منك في الكويت')}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {selectedArea === 'All Kuwait' 
                ? t('Showing upcoming games across all Kuwait governorates', 'عرض المباريات القادمة عبر جميع مناطق الكويت')
                : `${t('Filtering games in', 'مباريات في منطقة')} ${selectedArea}`}
            </p>
          </div>

          <button
            onClick={() => setActiveTab('discover')}
            className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>{t('View all games', 'عرض الكل')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Game Cards Grid */}
        {nearYouGames.length === 0 ? (
          <div className="text-center py-12 bg-neutral-950 rounded-3xl border border-neutral-800 space-y-2">
            <p className="text-neutral-400 text-sm">
              {t('No games currently scheduled in this area.', 'لا توجد مباريات معلنة حالياً في هذه المنطقة.')}
            </p>
            <button
              onClick={() => {
                setCreateGamePrefill(null);
                setCreateGameModalOpen(true);
              }}
              className="text-xs font-bold text-emerald-400 underline"
            >
              {t('Be the first to post a game here!', 'كن أول من ينشئ مباراة هنا!')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {nearYouGames.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* The 4-Step La3ib Flow Showcase (Prompt Section 25 & Core Principle) */}
      <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800">
            {t('The Frictionless Flow', 'آلية العمل البسيطة')}
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-white mt-2">
            {t('From "I want to play" to "Confirmed match"', 'من رغبة اللعب إلى تأكيد المباراة')}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
              1
            </div>
            <h4 className="font-bold text-sm text-white">{t('Book on Li3ib', 'حجز الملعب عبر Li3ib')}</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {t('Access live court inventory across Kuwait with official hourly rates.', 'استعرض أفضل ملاعب الكويت واحجز الوقت المناسب فوراً.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
              2
            </div>
            <h4 className="font-bold text-sm text-white">{t('Post to La3ib', 'نشر الحجز في لعيب')}</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {t('1-tap post. We calculate each player\'s share automatically.', 'بضغطة زر تنشر المباراة مع حساب حصة كل لاعب تلقائياً.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
              3
            </div>
            <h4 className="font-bold text-sm text-white">{t('Optional Cost Sharing', 'تقاسم التكلفة الاختياري')}</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {t('Host chooses Cash, WAMD, or Request Link to easily split pitch costs outside the app.', 'يحدد المنظم الدفع نقداً، عبر ومض، أو طلب رابط لتقاسم تكلفة الملعب خارج التطبيق.')}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800/80 space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-extrabold text-sm">
              4
            </div>
            <h4 className="font-bold text-sm text-white">{t('Show Up & Play', 'الالتقاء واللعب')}</h4>
            <p className="text-xs text-neutral-400 leading-relaxed">
              {t('Coordinate via game group chat, enjoy the match, and build attendance rating.', 'تنسيق عبر شات المباراة واللعب مع تقييم الحضور الموثوق.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
