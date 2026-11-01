import React from 'react';
import { useApp } from '../context/AppContext';
import { Home, Users, Plus, MapPin, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setCreateGameModalOpen,
    setCreateGamePrefill,
    t
  } = useApp();

  const isCommunityActive = activeTab === 'community' || activeTab === 'discover' || activeTab === 'players';

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#06135B] border-t border-[#B9C9E0] dark:border-[#1F3590] px-2 py-1 select-none transition-colors duration-150 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
    >
      <div className="flex items-center justify-between max-w-md mx-auto h-14">
        {/* 1. Home */}
        <button
          type="button"
          aria-label={t('Home', 'الرئيسية')}
          onClick={() => setActiveTab('home')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-1 transition-colors cursor-pointer ${
            activeTab === 'home' 
              ? 'text-[#3A60AA] dark:text-[#B9C9E0] font-bold' 
              : 'text-slate-500 hover:text-[#06135B] dark:text-[#B9C9E0]/70 dark:hover:text-white'
          }`}
        >
          <Home className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight truncate max-w-full">
            {t('Home', 'الرئيسية')}
          </span>
        </button>

        {/* 2. Community */}
        <button
          type="button"
          aria-label={t('Community', 'المجتمع')}
          onClick={() => setActiveTab('community')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-1 transition-colors cursor-pointer ${
            isCommunityActive 
              ? 'text-[#3A60AA] dark:text-[#B9C9E0] font-bold' 
              : 'text-slate-500 hover:text-[#06135B] dark:text-[#B9C9E0]/70 dark:hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight truncate max-w-full">
            {t('Community', 'المجتمع')}
          </span>
        </button>

        {/* 3. Center Primary Action: Create */}
        <div className="flex-1 min-h-[44px] flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              setCreateGamePrefill(null);
              setCreateGameModalOpen(true);
            }}
            className="w-11 h-11 rounded-2xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white flex items-center justify-center transition-all cursor-pointer shadow-md shadow-[#3A60AA]/25 active:scale-95"
            aria-label={t('Create Game', 'أنشئ مباراة')}
            title={t('Create Game', 'أنشئ مباراة')}
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Map */}
        <button
          type="button"
          aria-label={t('Map', 'الخريطة')}
          onClick={() => setActiveTab('map')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-1 transition-colors cursor-pointer ${
            activeTab === 'map' 
              ? 'text-[#3A60AA] dark:text-[#B9C9E0] font-bold' 
              : 'text-slate-500 hover:text-[#06135B] dark:text-[#B9C9E0]/70 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight truncate max-w-full">
            {t('Map', 'الخريطة')}
          </span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          aria-label={t('Profile', 'الملف')}
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 py-1 px-1 transition-colors cursor-pointer ${
            activeTab === 'profile' 
              ? 'text-[#3A60AA] dark:text-[#B9C9E0] font-bold' 
              : 'text-slate-500 hover:text-[#06135B] dark:text-[#B9C9E0]/70 dark:hover:text-white'
          }`}
        >
          <User className="w-5 h-5 shrink-0" />
          <span className="text-[10px] tracking-tight truncate max-w-full">
            {t('Profile', 'الملف')}
          </span>
        </button>
      </div>
    </nav>
  );
};
