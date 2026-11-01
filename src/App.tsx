/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { CommunityTab } from './components/CommunityTab';
import { KuwaitMapTab } from './components/KuwaitMapTab';
import { DiscoverTab } from './components/DiscoverTab';
import { MyGamesTab } from './components/MyGamesTab';
import { PlayerDiscoveryTab } from './components/PlayerDiscoveryTab';
import { ProfileTab } from './components/ProfileTab';
import { BookDirectlyTab } from './components/BookDirectlyTab';
import { CommunityGuidelinesTab } from './components/CommunityGuidelinesTab';
import { BrandedLoader } from './components/BrandedLoader';

// Modals
import { CreateGameModal } from './components/CreateGameModal';
import { JoinPaymentModal } from './components/JoinPaymentModal';
import { GameDetailModal } from './components/GameDetailModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthModal } from './components/AuthModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { NotificationsModal } from './components/NotificationsModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { LogIn } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    activeTab, 
    language, 
    authStatus, 
    setAuthModalOpen, 
    setAuthModalMode, 
    t 
  } = useApp();

  // Enforce browser tab title strictly as "La3ib" across all routes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'La3ib';
    }
  }, [activeTab]);

  // Initial branded loading experience with La3ib logo
  if (authStatus === 'loading') {
    return <BrandedLoader mode="fullscreen" />;
  }

  return (
    <div 
      className={`min-h-screen bg-[#F7F7F8] dark:bg-[#06135B] text-slate-900 dark:text-slate-100 flex font-sans selection:bg-[#3A60AA] selection:text-white transition-colors duration-150 ${
        language === 'ar' ? 'font-cairo' : ''
      }`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* 1. Left Vertical Navigation (Slim, social platform framing like Instagram/Strava) */}
      <Sidebar />

      {/* 2. Main Content Stream Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Universal App Header */}
        <Header />

        {/* Guest Mode Banner if Unauthenticated */}
        {authStatus === 'unauthenticated' && (
          <div className="bg-[#EEF3F9] dark:bg-[#0D1C68] border-b border-[#B9C9E0] dark:border-[#1F3590] px-4 py-2.5 animate-fade-in">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                <span className="w-2 h-2 rounded-full bg-[#3A60AA] dark:bg-[#B9C9E0] shrink-0" />
                <span className="font-medium">
                  {t(
                    'You are currently signed out. Sign in to save games, book courts, and track your athlete stats.',
                    'أنت غير مسجل حالياً. سجل دخولك لحفظ المباريات، حجز الملاعب، وتتبع إحصائياتك الرياضية.'
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-[5px] bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer interactive-tap"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{t('Sign In / Register', 'تسجيل الدخول / حساب جديد')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Content Workspace: Full-viewport for Map, comfortably constrained feed for all other views */}
        <main className={
          activeTab === 'map'
            ? 'flex-1 w-full h-[calc(100dvh-3.5rem-3.5rem)] lg:h-[calc(100dvh-4rem)] relative overflow-hidden flex flex-col min-w-0'
            : 'flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-5 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-12 min-w-0'
        }>
          <div key={activeTab} className="w-full h-full flex flex-col min-w-0 animate-fade-in">
            {activeTab === 'home' && <HomeTab />}
            {(activeTab === 'community' || activeTab === 'discover') && <CommunityTab />}
            {activeTab === 'map' && <KuwaitMapTab />}
            {activeTab === 'games' && <MyGamesTab />}
            {activeTab === 'players' && <PlayerDiscoveryTab />}
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'book-directly' && <BookDirectlyTab />}
            {activeTab === 'guidelines' && <CommunityGuidelinesTab />}
          </div>
        </main>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <BottomNav />

      {/* Core Full-Featured Action Modals */}
      <CreateGameModal />
      <JoinPaymentModal />
      <GameDetailModal />
      <AdminPanelModal />
      <AuthModal />
      <ResetPasswordModal />
      <NotificationsModal />
      <PlayerProfileModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
