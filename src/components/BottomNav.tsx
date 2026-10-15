import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Compass, Plus, Trophy, User, Users } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setCreateGameModalOpen,
    setCreateGamePrefill,
    t,
    games,
    currentUser 
  } = useApp();

  const myUpcomingGamesCount = games.filter(g => 
    g.status !== 'Completed' && 
    g.status !== 'Cancelled' && 
    g.participants.some(p => p.userId === currentUser.id)
  ).length;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-lg border-t border-neutral-800/80 px-2 py-2 select-none safe-bottom">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'home' ? 'text-emerald-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">{t('Home', 'الرئيسية')}</span>
        </button>

        {/* Discover */}
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'discover' ? 'text-emerald-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px]">{t('Discover', 'استكشاف')}</span>
        </button>

        {/* Center Prominent Create Button */}
        <div className="relative -top-5">
          <button
            onClick={() => {
              setCreateGamePrefill(null);
              setCreateGameModalOpen(true);
            }}
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-neutral-950 flex items-center justify-center shadow-lg shadow-emerald-500/40 transform active:scale-95 transition-transform"
            aria-label="Create Game"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Players */}
        <button
          onClick={() => setActiveTab('players')}
          className={`flex flex-col items-center gap-1 py-1 px-2 rounded-lg transition-colors ${
            activeTab === 'players' ? 'text-emerald-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">{t('Players', 'اللاعبين')}</span>
        </button>

        {/* My Games */}
        <button
          onClick={() => setActiveTab('games')}
          className={`relative flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'games' ? 'text-emerald-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px]">{t('Games', 'مبارياتي')}</span>
          {myUpcomingGamesCount > 0 && (
            <span className="absolute top-0 right-3 w-4 h-4 rounded-full bg-emerald-500 text-neutral-950 text-[9px] font-bold flex items-center justify-center">
              {myUpcomingGamesCount}
            </span>
          )}
        </button>

        {/* Profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'profile' ? 'text-emerald-400 font-bold' : 'text-neutral-400 hover:text-white'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">{t('Profile', 'حسابي')}</span>
        </button>
      </div>
    </nav>
  );
};
