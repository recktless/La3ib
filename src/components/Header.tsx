import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, 
  MapPin, 
  Globe, 
  ShieldCheck, 
  Search, 
  LayoutDashboard,
  LogIn,
  Sun,
  Moon,
  Monitor,
  Menu,
  X,
  PanelLeftOpen,
  PlusCircle,
  MoreHorizontal,
  CalendarPlus,
  User,
  Settings,
  LogOut,
  Users,
  Trophy
} from 'lucide-react';
import { resolvePlayerAvatar } from '../types';
import { La3ibLogo } from './La3ibLogo';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    language, 
    setLanguage, 
    t, 
    notifications,
    setNotificationsModalOpen,
    setSafetyModalOpen,
    setAdminModalOpen,
    activeTab,
    setActiveTab,
    setProfileSubView,
    selectedPlayerProfile,
    setSelectedPlayerProfile,
    logout,
    searchQuery,
    setSearchQuery,
    authStatus,
    setAuthModalOpen,
    setAuthModalMode,
    themePreference,
    effectiveTheme,
    setThemePreference,
    isSidebarOpen,
    toggleSidebar,
    isDesktopSidebarCollapsed,
    toggleDesktopSidebar,
    setBookingModalOpen,
    setCreateGameModalOpen,
    setCreateGamePrefill
  } = useApp();

  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const accountDropdownRef = useRef<HTMLDivElement>(null);

  // Check if user is currently viewing their own profile page
  const isViewingOwnProfile = activeTab === 'profile' && selectedPlayerProfile === null;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setOverflowOpen(false);
      }
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target as Node)) {
        setAccountDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOverflowOpen(false);
        setAccountDropdownOpen(false);
      }
    };

    if (overflowOpen || accountDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [overflowOpen, accountDropdownOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleQuickTheme = () => {
    if (themePreference === 'light') {
      setThemePreference('dark');
    } else if (themePreference === 'dark') {
      setThemePreference('system');
    } else {
      setThemePreference('light');
    }
  };

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-[#06135B]/95 backdrop-blur-xs border-b border-[#E2E8F0] dark:border-[#1F3590]/60 px-4 sm:px-6 h-14 sm:h-16 transition-colors duration-150 flex items-center shrink-0">
      <div className="w-full flex items-center justify-between gap-3">
        {/* Left Section: Mobile/Tablet Hamburger + Desktop Expand Button + Official Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Menu button for Mobile and Tablet */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-[6px] bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label={isSidebarOpen ? t('Close navigation menu', 'إغلاق القائمة') : t('Open navigation menu', 'فتح القائمة')}
          >
            {isSidebarOpen ? (
              <X className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
            ) : (
              <Menu className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
            )}
          </button>

          {/* Desktop Expand Sidebar button (Visible ONLY when desktop sidebar is collapsed) */}
          {isDesktopSidebarCollapsed && (
            <button
              type="button"
              onClick={toggleDesktopSidebar}
              className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border border-[#B9C9E0]/60 dark:border-[#1F3590] text-slate-800 dark:text-slate-100 transition-colors cursor-pointer shrink-0"
              title={t('Expand sidebar', 'توسيع الشريط الجانبي')}
              aria-label={t('Expand sidebar', 'توسيع الشريط الجانبي')}
            >
              <PanelLeftOpen className="w-4 h-4 rtl:rotate-180 text-[#3A60AA] dark:text-[#B9C9E0]" />
            </button>
          )}

          {/* Official Logo:
              - Visible on Mobile/Tablet (< lg) always
              - Visible on Desktop (>= lg) ONLY when sidebar is collapsed (Never show two desktop logos simultaneously!)
          */}
          <div 
            onClick={() => setActiveTab('home')}
            className={`items-center cursor-pointer select-none shrink-0 ${
              isDesktopSidebarCollapsed ? 'flex' : 'flex lg:hidden'
            }`}
            role="button"
            tabIndex={0}
            title={t('Go to Home', 'الرئيسية')}
          >
            <La3ibLogo size="header" showText={false} />
          </div>
        </div>

        {/* Global Search Bar (Middle - Desktop) - Soft, modern athletic input */}
        <div className="flex-1 max-w-sm hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveTab('community');
                }
              }}
              placeholder={t('Search games, sports, courts...', 'ابحث عن مباريات، رياضات، ملاعب...')}
              className="w-full bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0]/60 dark:border-[#1F3590] hover:border-[#3A60AA] dark:hover:border-[#3A60AA] focus:border-[#3A60AA] dark:focus:border-[#B9C9E0] rounded-xl pl-9.5 rtl:pl-4 rtl:pr-9.5 pr-7 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-colors"
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

        {/* Right Actions: Clean, social-first controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Primary Action on Desktop when Sidebar is Collapsed */}
          {isDesktopSidebarCollapsed && (
            <button
              type="button"
              onClick={() => {
                setCreateGamePrefill(null);
                setCreateGameModalOpen(true);
              }}
              className="hidden lg:flex items-center gap-1.5 bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t('Create Game', 'أنشئ مباراة')}</span>
            </button>
          )}

          {/* Kuwait Location Indicator (desktop) */}
          <div className="hidden xl:flex items-center gap-1.5 bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0]/60 dark:border-[#1F3590] rounded-full px-3 py-1 text-xs text-slate-700 dark:text-slate-200">
            <MapPin className="w-3 h-3 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
            <span className="font-semibold">{t('Kuwait', 'الكويت')}</span>
          </div>

          {/* Mobile/Tablet Theme Toggle */}
          <button
            type="button"
            onClick={toggleQuickTheme}
            className="hidden sm:flex lg:hidden items-center justify-center w-8.5 h-8.5 rounded-xl bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border border-[#B9C9E0]/60 dark:border-[#1F3590] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title={
              themePreference === 'light'
                ? t('Theme: Light (click for Dark)', 'المظهر: فاتح')
                : themePreference === 'dark'
                ? t('Theme: Dark (click for System)', 'المظهر: داكن')
                : t('Theme: System (click for Light)', 'المظهر: تلقائي')
            }
            aria-label="Toggle Theme"
          >
            {effectiveTheme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-[#B9C9E0]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#3A60AA]" />
            )}
          </button>

          {/* Mobile/Tablet Language Switcher */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="hidden sm:flex lg:hidden items-center gap-1 bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border border-[#B9C9E0]/60 dark:border-[#1F3590] rounded-full px-3 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
            title={t('Switch Language', 'تغيير اللغة')}
          >
            <Globe className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span>{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Mobile/Tablet Safety */}
          <button
            type="button"
            onClick={() => setActiveTab('guidelines')}
            className="hidden sm:flex lg:hidden items-center gap-1 bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border border-[#B9C9E0]/60 dark:border-[#1F3590] text-slate-800 dark:text-slate-200 rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
            title={t('Community & Safety Guidelines', 'إرشادات المجتمع والسلامة')}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
          </button>

          {/* Desktop Collapsed Overflow Menu */}
          {isDesktopSidebarCollapsed && (
            <div className="relative hidden lg:block" ref={overflowRef}>
              <button
                type="button"
                onClick={() => setOverflowOpen(prev => !prev)}
                className="flex items-center justify-center w-8 h-8 rounded-[6px] bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title={t('More actions & settings', 'المزيد من الإجراءات والإعدادات')}
                aria-expanded={overflowOpen}
                aria-haspopup="true"
              >
                <MoreHorizontal className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
              </button>

              {overflowOpen && (
                <div 
                  className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-56 bg-white dark:bg-[#06135B] border border-slate-200/80 dark:border-[#1F3590] rounded-2xl shadow-xl p-1.5 z-50 text-xs animate-popover-in"
                  role="menu"
                >
                  {/* Community */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('community');
                      setOverflowOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <Users className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                    <span>{t('Community', 'المجتمع')}</span>
                  </button>

                  {/* Kuwait Game Map */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('map');
                      setOverflowOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <MapPin className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                    <span>{t('Kuwait Game Map', 'خريطة مباريات الكويت')}</span>
                  </button>

                  {/* My Games */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('games');
                      setOverflowOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <Trophy className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                    <span>{t('My Games', 'مبارياتي')}</span>
                  </button>

                  {/* Book Directly */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('book-directly');
                      setOverflowOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      <CalendarPlus className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                      <span>{t('Book Directly', 'احجز مباشرة')}</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EEF3F9] dark:bg-[#142578] text-[#3A60AA] dark:text-[#B9C9E0] border border-[#B9C9E0]/40 dark:border-[#1F3590]/60">
                      {t('Coming Soon', 'قريبًا')}
                    </span>
                  </button>

                  {/* Language Switcher */}
                  <button
                    type="button"
                    onClick={() => {
                      setLanguage(language === 'en' ? 'ar' : 'en');
                      setOverflowOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{t('Language', 'اللغة')}</span>
                    </div>
                    <span className="text-[11px] font-bold text-[#3A60AA] dark:text-[#B9C9E0]">
                      {language === 'en' ? 'العربية' : 'English'}
                    </span>
                  </button>

                  {/* Appearance Switcher */}
                  <div className="px-3 py-2 border-t border-[#B9C9E0]/40 dark:border-[#1F3590]/50">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-[#B9C9E0]/80 mb-1.5">
                      {t('Appearance', 'المظهر')}
                    </div>
                    <div className="flex items-center bg-[#EEF3F9] dark:bg-[#0D1C68] p-0.5 rounded-xl border border-[#B9C9E0]/60 dark:border-[#1F3590]/70">
                      <button
                        type="button"
                        onClick={() => setThemePreference('light')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          themePreference === 'light' ? 'bg-white text-[#06135B] shadow-xs' : 'text-slate-600 dark:text-[#B9C9E0]'
                        }`}
                      >
                        <Sun className="w-3 h-3 text-[#3A60AA]" />
                        <span>{t('Light', 'فاتح')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemePreference('dark')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          themePreference === 'dark' ? 'bg-[#142578] text-white shadow-xs' : 'text-slate-600 dark:text-[#B9C9E0]'
                        }`}
                      >
                        <Moon className="w-3 h-3 text-[#B9C9E0]" />
                        <span>{t('Dark', 'داكن')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemePreference('system')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                          themePreference === 'system' ? 'bg-white dark:bg-[#142578] text-[#06135B] dark:text-white shadow-xs' : 'text-slate-600 dark:text-[#B9C9E0]'
                        }`}
                      >
                        <Monitor className="w-3 h-3 text-slate-500" />
                        <span>{t('Auto', 'تلقائي')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Safety & Admin */}
                  <div className="border-t border-[#B9C9E0]/40 dark:border-[#1F3590]/50 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('guidelines');
                        setOverflowOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                      role="menuitem"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                      <span>{t('Community & Safety Guidelines', 'إرشادات المجتمع والسلامة')}</span>
                    </button>
                    {currentUser.isAdmin && authStatus === 'authenticated' && !currentUser.isDemoUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setAdminModalOpen(true);
                          setOverflowOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-[#3A60AA] dark:text-[#B9C9E0] hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                        role="menuitem"
                      >
                        <LayoutDashboard className="w-4 h-4 shrink-0" />
                        <span>{t('Admin Dashboard', 'لوحة التحكم للمشرف')}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin Panel Direct Link (Desktop when sidebar is expanded) */}
          {!isDesktopSidebarCollapsed && currentUser.isAdmin && authStatus === 'authenticated' && !currentUser.isDemoUser && (
            <button
              type="button"
              onClick={() => setAdminModalOpen(true)}
              className="hidden lg:flex items-center gap-1 bg-[#3A60AA] hover:bg-[#2E4D8A] text-white rounded-xl px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title={t('Admin Dashboard', 'لوحة التحكم للمشرف')}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>{t('Admin', 'الإشراف')}</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            type="button"
            onClick={() => setNotificationsModalOpen(true)}
            className="relative flex items-center justify-center w-8.5 h-8.5 rounded-xl bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#0D1C68] dark:hover:bg-[#142578] border border-[#B9C9E0]/60 dark:border-[#1F3590] text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            aria-label={t('Notifications', 'الإشعارات')}
          >
            <Bell className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar or Sign In with Account Dropdown */}
          {authStatus === 'authenticated' ? (
            <div className="relative" ref={accountDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  if (isViewingOwnProfile) {
                    // Standard profile page view: do not open dropdown
                    return;
                  }
                  setAccountDropdownOpen(prev => !prev);
                }}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-[#3A60AA] focus:ring-2 focus:ring-[#3A60AA] focus:outline-none transition-all cursor-pointer"
                title={currentUser.name}
                aria-expanded={accountDropdownOpen}
                aria-haspopup="menu"
                aria-label={t('User account menu', 'قائمة الحساب')}
              >
                <img
                  src={resolvePlayerAvatar(currentUser)}
                  alt={currentUser.name}
                  className="w-8.5 h-8.5 rounded-full object-cover ring-1 ring-[#B9C9E0]/80 dark:ring-[#1F3590]"
                />
              </button>

              {accountDropdownOpen && !isViewingOwnProfile && (
                <div 
                  className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-64 bg-white dark:bg-[#06135B] border border-slate-200/80 dark:border-[#1F3590] rounded-2xl shadow-xl p-1.5 z-50 text-xs animate-popover-in"
                  role="menu"
                >
                  {/* Account Badge / Identity Header */}
                  <div className="px-3 py-2.5 border-b border-[#B9C9E0]/40 dark:border-[#1F3590]/50 mb-1">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={resolvePlayerAvatar(currentUser)}
                        alt={currentUser.name}
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-[#3A60AA]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {language === 'ar' ? (currentUser.nameAr || currentUser.name) : currentUser.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80 font-mono truncate">
                          @{currentUser.username}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 1. Profile Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setProfileSubView('profile');
                      setSelectedPlayerProfile(null);
                      setAccountDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <User className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                    <span>{t('Profile', 'الملف الشخصي')}</span>
                  </button>

                  {/* 2. Settings Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('profile');
                      setProfileSubView('settings');
                      setSelectedPlayerProfile(null);
                      setAccountDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <Settings className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                    <span>{t('Settings', 'الإعدادات')}</span>
                  </button>

                  {/* 3. Community Guidelines Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('guidelines');
                      setSelectedPlayerProfile(null);
                      setAccountDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#EEF3F9] dark:hover:bg-[#0D1C68] transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
                    <span>{t('Community Guidelines', 'إرشادات المجتمع')}</span>
                  </button>

                  {/* Divider */}
                  <div className="border-t border-[#B9C9E0]/40 dark:border-[#1F3590]/50 my-1" />

                  {/* 3. Sign Out Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left rtl:text-right font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer rounded-xl"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{t('Sign Out', 'تسجيل الخروج')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('Sign In', 'دخول')}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
