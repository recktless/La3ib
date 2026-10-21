import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Compass, 
  CalendarPlus, 
  Trophy, 
  Users, 
  User, 
  PlusCircle, 
  ShieldAlert,
  Flame,
  CreditCard
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setBookingModalOpen, 
    setCreateGameModalOpen,
    setCreateGamePrefill,
    t,
    myBookings,
    games,
    currentUser
  } = useApp();

  const myUpcomingGamesCount = games.filter(g => 
    g.status !== 'Completed' && 
    g.status !== 'Cancelled' && 
    g.participants.some(p => p.userId === currentUser.id)
  ).length;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-neutral-950 border-r border-neutral-800/80 p-5 min-h-[calc(100vh-61px)] select-none">
      {/* Quick Action Buttons */}
      <div className="space-y-2 mb-6">
        <button
          onClick={() => {
            setCreateGamePrefill(null);
            setCreateGameModalOpen(true);
          }}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-neutral-950 font-bold text-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all cursor-pointer transform active:scale-[0.98]"
        >
          <PlusCircle className="w-5 h-5" />
          <span>{t('Create a Game', 'أنشئ مباراة')}</span>
        </button>

        <button
          onClick={() => setBookingModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800/90 border border-neutral-800 hover:border-emerald-500/40 text-emerald-400 font-semibold text-xs transition-all cursor-pointer"
        >
          <CalendarPlus className="w-4 h-4 text-emerald-400" />
          <span>{t('Book Court via Li3ib', 'احجز ملعب عبر Li3ib')}</span>
        </button>
      </div>

      {/* Main Navigation Links */}
      <div className="space-y-1 text-sm">
        <button
          onClick={() => setActiveTab('home')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'home'
              ? 'bg-neutral-900 text-emerald-400 font-bold border border-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>{t('Home', 'الرئيسية')}</span>
        </button>

        <button
          onClick={() => setActiveTab('discover')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'discover'
              ? 'bg-neutral-900 text-emerald-400 font-bold border border-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <Compass className="w-4 h-4" />
            <span>{t('Discover Games', 'استكشاف المباريات')}</span>
          </div>
          <span className="text-[10px] uppercase font-bold bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/60">
            {t('Map', 'خريطة')}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('games')}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'games'
              ? 'bg-neutral-900 text-emerald-400 font-bold border border-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-4 h-4" />
            <span>{t('My Games & Bookings', 'مبارياتي وحجوزاتي')}</span>
          </div>
          {myUpcomingGamesCount > 0 && (
            <span className="text-xs font-bold bg-emerald-500 text-neutral-950 w-5 h-5 rounded-full flex items-center justify-center">
              {myUpcomingGamesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('players')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'players'
              ? 'bg-neutral-900 text-emerald-400 font-bold border border-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('Find Players', 'البحث عن لاعبين')}</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
            activeTab === 'profile'
              ? 'bg-neutral-900 text-emerald-400 font-bold border border-emerald-500/20'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900/60'
          }`}
        >
          <User className="w-4 h-4" />
          <span>{t('Sports Profile', 'الملف الرياضي')}</span>
        </button>
      </div>

      {/* Li3ib Partnership Card */}
      <div className="mt-auto pt-6">
        <div className="p-4 rounded-2xl bg-gradient-to-b from-neutral-900 to-neutral-900/70 border border-neutral-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              Li3ib Integrated
            </span>
            <span className="text-[10px] text-neutral-400">Kuwait Official</span>
          </div>
          <p className="text-xs text-neutral-300 font-medium leading-relaxed">
            {t(
              'Book any court through Li3ib, then post your game here with optional cost sharing with players.',
              'احجز أي ملعب عبر Li3ib ثم انشر المباراة هنا مع خيار تقاسم التكلفة مع اللاعبين.'
            )}
          </p>
          <button
            onClick={() => setBookingModalOpen(true)}
            className="mt-3 w-full text-xs font-semibold py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
          >
            {t('Explore Courts', 'استعرض الملاعب')} →
          </button>
        </div>
      </div>
    </aside>
  );
};
