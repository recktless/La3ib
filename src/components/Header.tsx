import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Bell, 
  MapPin, 
  Globe, 
  ShieldCheck, 
  Search, 
  Sparkles,
  LayoutDashboard,
  LogIn,
  LogOut,
  UserCheck
} from 'lucide-react';
import { KuwaitArea, resolvePlayerAvatar } from '../types';

const KUWAIT_AREAS: (KuwaitArea | 'All Kuwait')[] = [
  'All Kuwait',
  'Kuwait City',
  'Salmiya',
  'Shuwaikh',
  'Hawalli',
  'Mishref',
  'Yarmouk',
  'Jabriya',
  'Sabhan',
  'Mahboula',
  'Abu Hasaniya',
  'Jahra',
  'Ardhiya'
];

export const Header: React.FC = () => {
  const { 
    currentUser, 
    selectedArea, 
    setSelectedArea, 
    language, 
    setLanguage, 
    t, 
    notifications,
    setNotificationsModalOpen,
    setSafetyModalOpen,
    setAdminModalOpen,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    authStatus,
    setAuthModalOpen,
    setAuthModalMode,
    logout
  } = useApp();

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800/80 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div 
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-extrabold text-xl group-hover:scale-105 transition-transform duration-200">
            <span>⚽</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                La3ib
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.5 rounded font-['Cairo']">
                لعيب
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 font-medium hidden sm:block">
              {t('Kuwait Sports & Pickup Community', 'مجتمع الرياضة والحجوزات في الكويت')}
            </p>
          </div>
        </div>

        {/* Global Search Bar (Middle) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('What do you want to play? (Football, Padel, Courts...)', 'ماذا تريد أن تلعب اليوم؟ (قدم، بادل، ملاعب...)')}
              className="w-full bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 focus:border-emerald-500 rounded-full pl-10 pr-4 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Kuwait Location Selector */}
          <div className="relative">
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-full px-3 py-1.5 text-xs text-neutral-200 transition-colors cursor-pointer">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select 
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value as KuwaitArea | 'All Kuwait')}
                className="bg-transparent text-neutral-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {KUWAIT_AREAS.map(area => (
                  <option key={area} value={area} className="bg-neutral-900 text-neutral-100">
                    {area === 'All Kuwait' ? t('🇰🇼 All Kuwait', '🇰🇼 كل الكويت') : `📍 ${area}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Language Switcher */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
            className="flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-full px-2.5 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            <span>{language === 'en' ? 'عربي' : 'EN'}</span>
          </button>

          {/* Safety & Community Guidelines */}
          <button
            onClick={() => setSafetyModalOpen(true)}
            className="hidden sm:flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-emerald-400 rounded-full p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium transition-colors"
            title="Community & Safety Guidelines"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">{t('Safety', 'الأمان')}</span>
          </button>

          {/* Admin Panel Quick Link - Authorized Administrators Only */}
          {currentUser.isAdmin && authStatus === 'authenticated' && !currentUser.isDemoUser && (
            <button
              onClick={() => setAdminModalOpen(true)}
              className="hidden lg:flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-400 rounded-full px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer"
              title="Admin Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('Admin', 'لوحة الإشراف')}</span>
            </button>
          )}

          {/* Notifications Bell */}
          <button
            onClick={() => setNotificationsModalOpen(true)}
            className="relative p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] font-bold text-neutral-950 flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Profile / Auth Action */}
          {authStatus === 'unauthenticated' ? (
            <button
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('Sign In', 'تسجيل الدخول')}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div 
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2 cursor-pointer group pl-1"
                title={authStatus === 'demo' ? t('Demo Profile (Ahmed)', 'حساب تجريبي (أحمد)') : currentUser.name}
              >
                <div className="relative">
                  <img 
                    src={resolvePlayerAvatar(currentUser)} 
                    alt={currentUser.name}
                    className={`w-9 h-9 rounded-full object-cover ring-2 transition-all ${
                      authStatus === 'demo' 
                        ? 'ring-amber-500/60 group-hover:ring-amber-400' 
                        : 'ring-emerald-500/50 group-hover:ring-emerald-400'
                    }`}
                  />
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-neutral-950 ${
                    authStatus === 'demo' ? 'bg-amber-400' : 'bg-emerald-500'
                  }`} />
                </div>
                <div className="hidden xl:block text-left">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-bold text-white leading-tight group-hover:text-emerald-400 transition-colors">
                      {currentUser.name}
                    </p>
                    {authStatus === 'demo' && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Demo
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-400 font-medium">
                    {currentUser.attendanceRate}% {t('Attendance', 'حضور')}
                  </p>
                </div>
              </div>

              {authStatus === 'demo' && (
                <button
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="hidden sm:flex items-center gap-1 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/30 text-emerald-400 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
                  title={t('Switch to Real Firebase Account', 'التحويل لحساب حقيقي')}
                >
                  <LogIn className="w-3 h-3" />
                  <span className="text-[11px]">{t('Sign In', 'دخول')}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile search bar if active */}
      <div className="mt-2.5 md:hidden">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('What do you want to play?', 'ماذا تريد أن تلعب اليوم؟')}
            className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-9 pr-4 py-1.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none"
          />
        </div>
      </div>
    </header>
  );
};
