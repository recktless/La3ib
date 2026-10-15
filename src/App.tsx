/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { DiscoverTab } from './components/DiscoverTab';
import { MyGamesTab } from './components/MyGamesTab';
import { PlayerDiscoveryTab } from './components/PlayerDiscoveryTab';
import { ProfileTab } from './components/ProfileTab';

// Modals
import { Li3ibBookingModal } from './components/Li3ibBookingModal';
import { CreateGameModal } from './components/CreateGameModal';
import { JoinPaymentModal } from './components/JoinPaymentModal';
import { GameDetailModal } from './components/GameDetailModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthModal } from './components/AuthModal';
import { NotificationsModal } from './components/NotificationsModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { UserCheck, Sparkles, LogIn } from 'lucide-react';

const AppContent: React.FC = () => {
  const { 
    activeTab, 
    language, 
    authStatus, 
    setAuthModalOpen, 
    setAuthModalMode, 
    continueAsDemo,
    t 
  } = useApp();

  return (
    <div 
      className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-neutral-950 ${
        language === 'ar' ? 'font-cairo' : ''
      }`}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      {/* Top Universal App Header */}
      <Header />

      {/* Guest Mode Banner if Unauthenticated */}
      {authStatus === 'unauthenticated' && (
        <div className="bg-gradient-to-r from-emerald-950 via-neutral-900 to-neutral-950 border-b border-emerald-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>
                {t(
                  'You are currently signed out. Sign in to save games, book courts, and track your athlete stats.',
                  'أنت غير مسجل حالياً. سجل دخولك لحفظ المباريات، حجز الملاعب، وتتبع إحصائياتك الرياضية.'
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('Sign In / Register', 'تسجيل الدخول / حساب جديد')}</span>
              </button>
              <button
                onClick={continueAsDemo}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>{t('Explore Demo Mode', 'تصفح كضيف تجريبي')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main App Layout */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 gap-6">
        {/* Desktop Sidebar Navigation */}
        <Sidebar />

        {/* Dynamic Main Workspace Area */}
        <main className="flex-1 min-w-0 pb-24 md:pb-12">
          {activeTab === 'home' && <HomeTab />}
          {activeTab === 'discover' && <DiscoverTab />}
          {activeTab === 'games' && <MyGamesTab />}
          {activeTab === 'players' && <PlayerDiscoveryTab />}
          {activeTab === 'profile' && <ProfileTab />}
        </main>
      </div>

      {/* Mobile Sticky Bottom Bar */}
      <BottomNav />

      {/* Core Full-Featured Action Modals */}
      <Li3ibBookingModal />
      <CreateGameModal />
      <JoinPaymentModal />
      <GameDetailModal />
      <AdminPanelModal />
      <AuthModal />
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
