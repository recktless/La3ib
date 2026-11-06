/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { getGameFromFirestore } from './lib/firebase';

// Modals
import { CreateGameModal } from './components/CreateGameModal';
import { JoinPaymentModal } from './components/JoinPaymentModal';
import { GameDetailModal } from './components/GameDetailModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthModal } from './components/AuthModal';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { NotificationsModal } from './components/NotificationsModal';
import { PlayerProfileModal } from './components/PlayerProfileModal';
import { OnboardingTutorial } from './components/OnboardingTutorial';
import { LogIn, Ban, AlertCircle, X } from 'lucide-react';
import { 
  COMING_SOON_MODE, 
  ADMIN_BYPASS_STORAGE_KEY, 
  ADMIN_BYPASS_EMAIL_KEY,
  AdminAuthState,
  getStoredAdminToken,
  setStoredAdminToken, 
  clearStoredAdminToken,
  isTokenLocallyExpired,
  validateAdminSessionWithServer,
  logoutAdminSession
} from './config/launchMode';
import { ComingSoonPage } from './components/coming-soon/ComingSoonPage';
import { AdminBypassBanner } from './components/coming-soon/AdminBypassBanner';

export const AppContent: React.FC = () => {
  const { 
    activeTab, 
    language, 
    authStatus, 
    setAuthModalOpen, 
    setAuthModalMode, 
    isAccountBanned,
    currentUser,
    logout,
    games,
    setSelectedGameForDetail,
    t 
  } = useApp();

  const [deepLinkToast, setDeepLinkToast] = useState<{ message: string; messageAr: string } | null>(null);

  // Enforce browser tab title strictly as "La3ib" across all routes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'La3ib';
    }
  }, [activeTab]);

  // Auto-dismiss deep-link toast after 4.5 seconds
  useEffect(() => {
    if (!deepLinkToast) return;
    const timer = setTimeout(() => {
      setDeepLinkToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [deepLinkToast]);

  // Deep-linking support for https://la3ibkw.com/game/{gameId} or ?game={gameId}
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let targetGameId: string | null = null;
    const pathMatch = window.location.pathname.match(/^\/game\/([a-zA-Z0-9_-]+)/i);
    if (pathMatch && pathMatch[1]) {
      targetGameId = pathMatch[1];
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      targetGameId = searchParams.get('game') || searchParams.get('gameId');
    }

    if (!targetGameId) return;

    let isCancelled = false;

    const handleDeepLink = async () => {
      // 1. Try finding in loaded games
      let foundGame = games.find(g => g.id === targetGameId);

      // 2. Fallback to Firestore fetch if not in initial local list
      if (!foundGame) {
        try {
          const remoteGame = await getGameFromFirestore(targetGameId);
          if (remoteGame) {
            foundGame = remoteGame;
          }
        } catch (err) {
          console.warn('[DeepLink] Error fetching game:', err);
        }
      }

      if (isCancelled) return;

      if (!foundGame) {
        // Game does not exist or has been deleted
        setDeepLinkToast({
          message: 'Game not found or has been removed.',
          messageAr: 'المباراة غير موجودة أو تم حذفها.'
        });
        window.history.replaceState({}, document.title, '/');
        return;
      }

      if (foundGame.status === 'Cancelled') {
        // Cancelled game
        setDeepLinkToast({
          message: 'This game has been cancelled by the organizer.',
          messageAr: 'تم إلغاء هذه المباراة من قِبل المنظم.'
        });
        window.history.replaceState({}, document.title, '/');
        return;
      }

      // Valid game: open details modal
      setSelectedGameForDetail(foundGame);

      // If user is guest, preserve target game ID for when they sign in
      if (authStatus === 'unauthenticated') {
        try {
          sessionStorage.setItem('la3ib_pending_game_id', foundGame.id);
        } catch {}
      }
    };

    handleDeepLink();

    return () => {
      isCancelled = true;
    };
  }, [games, authStatus, setSelectedGameForDetail]);

  // If user signs in after following an invitation deep link as guest, resume their destination
  useEffect(() => {
    if (authStatus === 'authenticated') {
      try {
        const pendingGameId = sessionStorage.getItem('la3ib_pending_game_id') || sessionStorage.getItem('la3ib_pending_invite_game');
        if (pendingGameId) {
          sessionStorage.removeItem('la3ib_pending_game_id');
          sessionStorage.removeItem('la3ib_pending_invite_game');
          const matched = games.find(g => g.id === pendingGameId);
          if (matched) {
            setSelectedGameForDetail(matched);
          } else {
            getGameFromFirestore(pendingGameId).then(g => {
              if (g) setSelectedGameForDetail(g);
            }).catch(console.warn);
          }
        }
      } catch {}
    }
  }, [authStatus, games, setSelectedGameForDetail]);

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
      <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
        {/* Deep Link & System Toast Feedback */}
        {deepLinkToast && (
          <aside 
            aria-label={language === 'ar' ? deepLinkToast.messageAr : deepLinkToast.message}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-2rem)] px-4 py-3 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white shadow-xl border border-slate-700/50 flex items-center justify-between gap-3 animate-fade-in text-xs sm:text-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="truncate">{language === 'ar' ? deepLinkToast.messageAr : deepLinkToast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setDeepLinkToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </aside>
        )}

        {/* Top Universal App Header */}
        <Header />

        {/* Account Suspended Notice */}
        {isAccountBanned && (
          <div className="bg-rose-50 dark:bg-rose-950/90 border-b border-rose-200 dark:border-rose-800 px-4 py-3 animate-fade-in text-rose-800 dark:text-rose-200">
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-rose-700 dark:text-rose-300">
                    {t('Account Suspended', 'تم تعليق الحساب')}
                  </p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">
                    {currentUser.banReason || t('Your account has been suspended for community guidelines violations.', 'تم تعليق حسابك لمخالفة معايير المجتمع.')}
                    {currentUser.banExpiresAt ? (
                      <span className="block sm:inline sm:ms-1 font-semibold">
                        ({t('Suspension expires on:', 'ينتهي التعليق في:')} {new Date(currentUser.banExpiresAt).toLocaleDateString()})
                      </span>
                    ) : (
                      <span className="block sm:inline sm:ms-1 font-semibold text-rose-600 dark:text-rose-400">
                        ({t('Permanent suspension', 'تعليق دائم')})
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors cursor-pointer shrink-0"
              >
                {t('Sign Out', 'تسجيل الخروج')}
              </button>
            </div>
          </div>
        )}

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
      <OnboardingTutorial />
    </div>
  );
};

export default function App() {
  const [adminAuthState, setAdminAuthState] = useState<AdminAuthState>(() => {
    if (!COMING_SOON_MODE) return 'authenticated';
    try {
      const stored = getStoredAdminToken();
      if (!stored) return 'unauthenticated';
      if (isTokenLocallyExpired(stored)) {
        clearStoredAdminToken();
        return 'unauthenticated';
      }
      return 'checking';
    } catch {
      return 'unauthenticated';
    }
  });

  const [adminEmail, setAdminEmail] = useState<string | undefined>(() => {
    try {
      return sessionStorage.getItem(ADMIN_BYPASS_EMAIL_KEY) || localStorage.getItem(ADMIN_BYPASS_EMAIL_KEY) || undefined;
    } catch {
      return undefined;
    }
  });

  const validationEpochRef = useRef(0);

  // Validate stored admin session on initial load if in 'checking' state
  useEffect(() => {
    if (!COMING_SOON_MODE || adminAuthState !== 'checking') return;

    const currentEpoch = ++validationEpochRef.current;
    const token = getStoredAdminToken();

    if (!token) {
      setAdminAuthState('unauthenticated');
      return;
    }

    validateAdminSessionWithServer(token)
      .then((res) => {
        // Prevent older asynchronous check from overwriting newer login
        if (validationEpochRef.current !== currentEpoch) return;

        if (res.status === 'valid') {
          if (res.email) setAdminEmail(res.email);
          setAdminAuthState('authenticated');
        } else if (res.status === 'invalid') {
          clearStoredAdminToken();
          setAdminAuthState('unauthenticated');
        } else {
          // Indeterminate (network offline / proxy restart / HTML fallback):
          // Maintain existing session without logging out
          setAdminAuthState('authenticated');
        }
      })
      .catch(() => {
        if (validationEpochRef.current !== currentEpoch) return;
        setAdminAuthState('authenticated');
      });
  }, [adminAuthState]);

  const handleBypassSuccess = (token: string) => {
    // Invalidate any older in-flight validation requests
    validationEpochRef.current += 1;
    try {
      setStoredAdminToken(token);
    } catch {}
    setAdminAuthState('authenticated');
  };

  const handleReturnToComingSoon = async () => {
    validationEpochRef.current += 1;
    try {
      await logoutAdminSession();
    } catch {}
    setAdminAuthState('unauthenticated');
  };

  // 1. Loading / verifying existing session on initial visit
  if (COMING_SOON_MODE && adminAuthState === 'checking') {
    return <BrandedLoader mode="fullscreen" />;
  }

  // 2. Unauthenticated pre-launch visitors see the Coming Soon landing page
  if (COMING_SOON_MODE && adminAuthState === 'unauthenticated') {
    return <ComingSoonPage onBypassSuccess={handleBypassSuccess} />;
  }

  // 3. Full application rendered for authorized visitors or post-launch
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
