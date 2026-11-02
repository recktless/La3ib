import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Users, 
  MapPin, 
  CalendarPlus, 
  Trophy, 
  User, 
  PlusCircle, 
  X, 
  Search, 
  Globe, 
  Sun, 
  Moon, 
  Monitor, 
  PanelLeftClose,
  ShieldCheck,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import { La3ibLogo } from './La3ibLogo';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setBookingModalOpen, 
    setCreateGameModalOpen, 
    setCreateGamePrefill, 
    setSafetyModalOpen,
    setAdminModalOpen,
    openSettings,
    t, 
    games, 
    currentUser, 
    authStatus,
    isSidebarOpen, 
    setIsSidebarOpen, 
    searchQuery, 
    setSearchQuery, 
    language, 
    setLanguage, 
    themePreference, 
    setThemePreference, 
    isDesktopSidebarCollapsed, 
    toggleDesktopSidebar 
  } = useApp();

  // Mobile drawer animation state: allows smooth slide-out exit animation before unmounting
  const [shouldRenderDrawer, setShouldRenderDrawer] = React.useState(Boolean(isSidebarOpen));
  const [isDrawerExiting, setIsDrawerExiting] = React.useState(false);

  // Desktop sidebar collapse animation state
  const [isDesktopCollapsing, setIsDesktopCollapsing] = React.useState(false);

  useEffect(() => {
    if (isSidebarOpen) {
      setShouldRenderDrawer(true);
      setIsDrawerExiting(false);
    } else if (shouldRenderDrawer) {
      setIsDrawerExiting(true);
      const timer = setTimeout(() => {
        setShouldRenderDrawer(false);
        setIsDrawerExiting(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen, shouldRenderDrawer]);

  const handleCollapseDesktop = () => {
    setIsDesktopCollapsing(true);
    setTimeout(() => {
      toggleDesktopSidebar();
      setIsDesktopCollapsing(false);
    }, 200);
  };

  // Prevent background scrolling while off-canvas drawer is open on mobile/tablet
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const myUpcomingGamesCount = (games || []).filter(g => 
    g.status !== 'Completed' && 
    g.status !== 'Cancelled' && 
    Array.isArray(g.participants) &&
    g.participants.some(p => p.userId === (currentUser.uid || currentUser.id))
  ).length;

  const handleNavClick = (tab: any) => {
    setActiveTab(tab);
    if (setIsSidebarOpen) {
      setIsSidebarOpen(false);
    }
  };

  const navLinks = [
    { id: 'home', label: t('Home', 'الرئيسية'), icon: Home },
    { id: 'community', label: t('Community', 'المجتمع'), icon: Users },
    { id: 'map', label: t('Map', 'الخريطة'), icon: MapPin },
    { id: 'games', label: t('My Games', 'مبارياتي'), icon: Trophy, count: myUpcomingGamesCount },
    { id: 'profile', label: t('Profile', 'الملف الشخصي'), icon: User }
  ];

  const renderNavContent = (isMobileDrawer: boolean = false) => (
    <div className="flex flex-col h-full justify-between">
      <div>
        {/* Quick Action: Create Game & Book Directly */}
        <div className="space-y-2 mb-5">
          <button
            type="button"
            data-tutorial="nav-create"
            onClick={() => {
              setCreateGamePrefill(null);
              setCreateGameModalOpen(true);
              if (setIsSidebarOpen) setIsSidebarOpen(false);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold text-xs transition-all duration-200 cursor-pointer shadow-xs interactive-tap"
          >
            <PlusCircle className="w-4 h-4 transition-transform duration-200 group-hover:rotate-90" />
            <span>{t('Create Game', 'أنشئ مباراة')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              handleNavClick('book-directly');
            }}
            className={`w-full flex items-center justify-between py-2 px-3 rounded-xl border transition-all duration-200 cursor-pointer interactive-tap ${
              activeTab === 'book-directly'
                ? 'bg-[#3A60AA] text-white border-[#3A60AA] shadow-xs'
                : 'bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border-[#B9C9E0]/60 dark:border-[#1F3590] text-[#06135B] dark:text-[#B9C9E0]'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CalendarPlus className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
              <span className="font-semibold text-xs truncate">{t('Book Directly', 'احجز مباشرة')}</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 transition-all duration-200 ${
              activeTab === 'book-directly'
                ? 'bg-white/20 text-white'
                : 'bg-white dark:bg-[#131C31] text-[#3A60AA] dark:text-[#B9C9E0] border border-[#B9C9E0]/40 dark:border-[#1F3590]/50'
            }`}>
              {t('Coming Soon', 'قريبًا')}
            </span>
          </button>
        </div>

        {/* Main Navigation Links */}
        <nav className="space-y-1.5 text-sm font-medium" aria-label="Sidebar Navigation">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id || 
              (link.id === 'community' && (activeTab === 'discover' || activeTab === 'players'));

            const tutorialAttr = 
              link.id === 'home' ? 'nav-home' :
              link.id === 'community' ? 'nav-community' :
              link.id === 'map' ? 'nav-map' :
              link.id === 'games' ? 'nav-my-games' :
              link.id === 'profile' ? 'nav-profile' : undefined;

            return (
              <button
                key={link.id}
                type="button"
                data-tutorial={tutorialAttr}
                onClick={() => handleNavClick(link.id)}
                className={`group w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer interactive-tap ${
                  isActive
                    ? 'bg-[#3A60AA] text-white font-bold shadow-xs'
                    : 'text-slate-700 hover:text-[#06135B] hover:bg-[#EEF3F9] dark:text-[#B9C9E0] dark:hover:text-white dark:hover:bg-[#0D1C68]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105 text-[#3A60AA] dark:text-[#B9C9E0]'}`} />
                  <span className="transition-colors duration-200">{link.label}</span>
                </div>
                {typeof link.count === 'number' && link.count > 0 && (
                  <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'bg-white text-[#3A60AA]'
                      : 'bg-[#3A60AA] text-white'
                  }`}>
                    {link.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Secondary Links (Guidelines, Settings on mobile drawer, Admin) */}
        <div className="mt-4 pt-3 border-t border-[#B9C9E0]/40 dark:border-[#1F3590]/50 space-y-1">
          {isMobileDrawer && (
            <button
              type="button"
              onClick={() => {
                openSettings();
                if (setIsSidebarOpen) setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-[#B9C9E0] hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-all duration-200 cursor-pointer interactive-tap"
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>{t('Settings', 'الإعدادات')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('guidelines');
              if (setIsSidebarOpen) setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer interactive-tap ${
              activeTab === 'guidelines'
                ? 'bg-[#3A60AA] text-white shadow-xs'
                : 'text-slate-700 dark:text-[#B9C9E0] hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68]'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 shrink-0 transition-transform duration-200 ${activeTab === 'guidelines' ? 'text-white' : 'text-[#3A60AA] dark:text-[#B9C9E0]'}`} />
            <span>{t('Community Guidelines', 'إرشادات المجتمع')}</span>
          </button>

          {currentUser.isAdmin && authStatus === 'authenticated' && !currentUser.isDemoUser && (
            <button
              type="button"
              onClick={() => {
                setAdminModalOpen(true);
                if (setIsSidebarOpen) setIsSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-[#3A60AA] dark:text-[#B9C9E0] hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-all duration-200 cursor-pointer interactive-tap"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>{t('Admin Dashboard', 'لوحة التحكم للمشرف')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Preferences Section: Language and Theme */}
      <div className="pt-4 mt-auto border-t border-[#B9C9E0]/50 dark:border-[#1F3590]/50 space-y-3">
        <div className="text-xs font-semibold text-slate-500 dark:text-[#B9C9E0]/80">
          {t('Preferences', 'التفضيلات')}
        </div>

        {/* Language Selection */}
        <div className="flex items-center justify-between bg-[#EEF3F9] dark:bg-[#0D1C68] p-1 rounded-xl border border-[#B9C9E0]/60 dark:border-[#1F3590]/80">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer interactive-tap ${
              language === 'en'
                ? 'bg-white dark:bg-[#142578] text-[#06135B] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-[#B9C9E0]'
            }`}
          >
            <Globe className="w-3 h-3 text-slate-400" />
            <span>English</span>
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ar')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer interactive-tap ${
              language === 'ar'
                ? 'bg-white dark:bg-[#142578] text-[#06135B] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-[#B9C9E0]'
            }`}
          >
            <span>العربية</span>
          </button>
        </div>

        {/* Appearance Selection (Light / Dark / System) */}
        <div className="flex items-center justify-between bg-[#EEF3F9] dark:bg-[#0D1C68] p-1 rounded-xl border border-[#B9C9E0]/60 dark:border-[#1F3590]/80">
          <button
            type="button"
            onClick={() => setThemePreference('light')}
            title={t('Light Mode', 'الوضع الفاتح')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer interactive-tap ${
              themePreference === 'light'
                ? 'bg-white text-[#06135B] shadow-xs font-bold'
                : 'text-slate-600 dark:text-[#B9C9E0]'
            }`}
          >
            <Sun className="w-3 h-3 text-[#3A60AA]" />
            <span>{t('Light', 'فاتح')}</span>
          </button>

          <button
            type="button"
            onClick={() => setThemePreference('dark')}
            title={t('Dark Mode', 'الوضع الداكن')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer interactive-tap ${
              themePreference === 'dark'
                ? 'bg-[#142578] text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-[#B9C9E0]'
            }`}
          >
            <Moon className="w-3 h-3 text-[#B9C9E0]" />
            <span>{t('Dark', 'داكن')}</span>
          </button>

          <button
            type="button"
            onClick={() => setThemePreference('system')}
            title={t('System Mode', 'وضع النظام')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[11px] font-semibold transition-all duration-200 cursor-pointer interactive-tap ${
              themePreference === 'system'
                ? 'bg-white dark:bg-[#142578] text-[#06135B] dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-[#B9C9E0]'
            }`}
          >
            <Monitor className="w-3 h-3 text-slate-500" />
            <span>{t('Auto', 'تلقائي')}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Slim Sidebar (Instagram/Strava style, collapsible) */}
      <aside className={`${isDesktopSidebarCollapsed ? 'hidden flex-col' : 'hidden lg:flex flex-col'} w-60 xl:w-64 shrink-0 sticky top-0 h-screen overflow-y-auto bg-white dark:bg-[#06135B] border-r border-[#E2E8F0] dark:border-[#1F3590]/60 p-5 select-none z-30 transition-colors ${isDesktopCollapsing ? 'animate-sidebar-slide-out' : 'animate-sidebar-slide-in'}`}>
        {/* Official Logo + Collapse Button at the top of desktop sidebar */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center cursor-pointer select-none shrink-0 transition-opacity hover:opacity-90 interactive-tap"
            role="button"
            tabIndex={0}
            title={t('Go to Home', 'الرئيسية')}
          >
            <La3ibLogo size="md" />
          </div>
          <button
            type="button"
            onClick={handleCollapseDesktop}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-[#B9C9E0]/70 dark:hover:text-white hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-all duration-200 cursor-pointer interactive-tap"
            title={t('Collapse sidebar', 'تصغير الشريط الجانبي')}
            aria-label={t('Collapse sidebar', 'تصغير الشريط الجانبي')}
          >
            <PanelLeftClose className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile & Tablet Off-Canvas Drawer Navigation with Smooth Entrance & Exit Animations */}
      {shouldRenderDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation drawer">
          {/* Backdrop with smooth fade in / out */}
          <div 
            className={`fixed inset-0 bg-black/60 transition-opacity duration-200 ease-out ${
              isDrawerExiting ? 'animate-fade-out pointer-events-none' : 'animate-fade-in'
            }`}
            onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel with smooth slide in / out */}
          <div 
            className={`fixed top-0 bottom-0 left-0 rtl:left-auto rtl:right-0 w-72 max-w-[85vw] bg-white dark:bg-[#06135B] border-r border-[#B9C9E0]/60 dark:border-[#1F3590] rtl:border-r-0 rtl:border-l rounded-r-3xl rtl:rounded-r-none rtl:rounded-l-3xl p-5 flex flex-col z-50 overflow-y-auto shadow-2xl transition-all duration-200 ease-out ${
              isDrawerExiting ? 'animate-drawer-out pointer-events-none' : 'animate-drawer-in'
            }`}
          >
            {/* Drawer Header with Close Button */}
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-[#B9C9E0]/40 dark:border-[#1F3590]/50">
              <La3ibLogo size="md" />
              <button
                type="button"
                onClick={() => setIsSidebarOpen && setIsSidebarOpen(false)}
                className="p-2 rounded-xl text-slate-600 hover:text-slate-900 dark:text-[#B9C9E0] dark:hover:text-white hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-all duration-200 cursor-pointer interactive-tap"
                aria-label={t('Close navigation', 'إغلاق القائمة')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Search Bar at Top of Drawer */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setActiveTab('community');
                      if (setIsSidebarOpen) setIsSidebarOpen(false);
                    }
                  }}
                  placeholder={t('Search games, sports, courts...', 'ابحث عن مباريات، رياضات، ملاعب...')}
                  className="w-full bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0]/60 dark:border-[#1F3590] rounded-xl pl-10 rtl:pl-7 rtl:pr-10 pr-7 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#3A60AA] transition-all duration-200"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
