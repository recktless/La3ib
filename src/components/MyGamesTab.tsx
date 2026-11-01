import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GameCard } from './GameCard';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Trophy, 
  Share2, 
  MessageSquare,
  Compass,
  Plus,
  Lock,
  LogIn,
  Loader2,
  Crown,
  ShieldAlert,
  Activity,
  Star,
  Check
} from 'lucide-react';
import { Game, SportType, getSportLabel, getKuwaitAreaLabel, formatPlayerRating, resolvePlayerAvatar, formatTimeRange12Hour } from '../types';
import { isGamePast } from '../lib/firebase';

export const MyGamesTab: React.FC<{ defaultSubTab?: 'upcoming' | 'past' | 'bookings' }> = ({
  defaultSubTab = 'upcoming'
}) => {
  const { 
    currentUser, 
    myGames,
    isMyGamesLoading,
    myGamesError,
    authStatus,
    setAuthModalOpen,
    setAuthModalMode,
    setActiveTab,
    setCreateGameModalOpen,
    myBookings, 
    setSelectedGameForDetail, 
    postBookingAsGame, 
    confirmAttendance,
    submitPlayerRating,
    getUserGameRatings,
    language,
    t 
  } = useApp();

  const isRestricted = currentUser?.canOrganize === false;
  const isPrivilegeLoading = authStatus === 'loading';

  const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past' | 'bookings'>(defaultSubTab);
  const [gameRatings, setGameRatings] = useState<Record<string, Record<string, number>>>({});
  const [ratingLoadingMap, setRatingLoadingMap] = useState<Record<string, boolean>>({});

  const userUid = currentUser.uid || currentUser.id;

  // Membership determination according to strict data model:
  const isUserOrganizer = (g: Game) => 
    g.organizer.id === userUid || (g as any).organizerId === userUid;

  const isUserParticipant = (g: Game) => 
    (Array.isArray(g.participantIds) && g.participantIds.includes(userUid)) ||
    (Array.isArray(g.participants) && g.participants.some(p => p.userId === userUid));

  // Relevant games: organized or joined
  const userGames = (myGames || []).filter(g => isUserOrganizer(g) || isUserParticipant(g));

  // Upcoming games: scheduled date/time has not passed. Earliest first.
  const upcomingGames = userGames
    .filter(g => !isGamePast(g))
    .sort((a, b) => {
      const dtA = `${a.date || ''}T${a.startTime || '00:00'}`;
      const dtB = `${b.date || ''}T${b.startTime || '00:00'}`;
      return dtA.localeCompare(dtB);
    });

  // Past games: scheduled date/time has already passed. Most recent first.
  const pastGames = userGames
    .filter(g => isGamePast(g))
    .sort((a, b) => {
      const dtA = `${a.date || ''}T${a.startTime || '00:00'}`;
      const dtB = `${b.date || ''}T${b.startTime || '00:00'}`;
      return dtB.localeCompare(dtA);
    });

  // Fetch submitted ratings for past games on view
  useEffect(() => {
    if (activeSubTab !== 'past' || pastGames.length === 0) return;
    pastGames.forEach(async (g) => {
      try {
        const ratings = await getUserGameRatings(g.id);
        if (ratings && Object.keys(ratings).length > 0) {
          setGameRatings(prev => ({
            ...prev,
            [g.id]: {
              ...(prev[g.id] || {}),
              ...ratings
            }
          }));
        }
      } catch {}
    });
  }, [activeSubTab, pastGames.length]);

  // Unauthenticated view: do not query private data, prompt user to sign in
  if (authStatus === 'unauthenticated') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#06135B] dark:text-white tracking-tight">
            {t('My Games & Activity', 'مبارياتي ونشاطاتي الرياضية')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#B9C9E0]/80 mt-1">
            {t(
              'Track your upcoming pickup games, court bookings, and attendance history.',
              'متابعة المباريات القادمة، حجوزات الملاعب وسجل الحضور.'
            )}
          </p>
        </div>

        <div className="text-center py-16 bg-white dark:bg-[#0D1629] rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-4 max-w-md mx-auto my-8 p-6 shadow-xs transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-[#EEF3F9] dark:bg-[#142578] border border-[#B9C9E0]/60 dark:border-[#1F3590] text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-[#06135B] dark:text-white">
              {t('Sign in to view your games', 'سجل الدخول لعرض مبارياتك')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#B9C9E0]/80">
              {t(
                'Sign in with your account to see the matches you are organizing and playing in.',
                'سجل دخولك بحسابك لتتمكن من متابعة المباريات التي تنظمها أو تشارك فيها.'
              )}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>{t('Sign In / Register', 'تسجيل الدخول / حساب جديد')}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Strip */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-[#06135B] dark:text-white tracking-tight">
                {t('My Games & Activity', 'مبارياتي ونشاطاتي الرياضية')}
              </h1>
              {isMyGamesLoading && (
                <Loader2 className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] animate-spin" />
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#B9C9E0]/80 mt-1">
              {t(
                'Track your upcoming pickup games, court bookings, and attendance history.',
                'متابعة المباريات القادمة، حجوزات الملاعب وسجل الحضور.'
              )}
            </p>
          </div>

          {/* Subtab switchers - Soft Rounded Bar */}
          <div className="flex bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0]/60 dark:border-[#1F3590]/70 p-1 rounded-2xl self-start sm:self-auto shrink-0 shadow-xs">
            <button
              onClick={() => setActiveSubTab('upcoming')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'upcoming'
                  ? 'bg-[#3A60AA] text-white shadow-xs'
                  : 'text-[#06135B] dark:text-[#B9C9E0] hover:text-black dark:hover:text-white'
              }`}
            >
              {t('Upcoming', 'القادمة')} ({upcomingGames.length})
            </button>

            <button
              onClick={() => setActiveSubTab('past')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'past'
                  ? 'bg-[#3A60AA] text-white shadow-xs'
                  : 'text-[#06135B] dark:text-[#B9C9E0] hover:text-black dark:hover:text-white'
              }`}
            >
              {t('Past & History', 'السابقة والأرشيف')} ({pastGames.length})
            </button>

            <button
              onClick={() => setActiveSubTab('bookings')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'bookings'
                  ? 'bg-[#3A60AA] text-white shadow-xs'
                  : 'text-[#06135B] dark:text-[#B9C9E0] hover:text-black dark:hover:text-white'
              }`}
            >
              {t('Court Bookings', 'حجوزات الملاعب')} ({myBookings.length})
            </button>
          </div>
        </div>

        {/* Activity Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#B9C9E0]/80 block">
              {t('Upcoming Matches', 'مباريات قادمة')}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#3A60AA] dark:text-[#B9C9E0]">
              {upcomingGames.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#B9C9E0]/80 block">
              {t('Total Matches Played', 'إجمالي المباريات')}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#06135B] dark:text-white">
              {pastGames.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#B9C9E0]/80 block">
              {t('Court Bookings', 'حجوزات الملاعب')}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#06135B] dark:text-white">
              {myBookings.length}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 dark:text-[#B9C9E0]/80 block">
              {t('Player Rating', 'تقييم اللاعب')}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 shrink-0" />
              <span className="text-xl sm:text-2xl font-bold text-[#06135B] dark:text-white">
                {(() => {
                  const ratingInfo = formatPlayerRating(currentUser, language);
                  return ratingInfo.isRated ? `${ratingInfo.scoreText}/5` : (language === 'ar' ? 'لم يتم التقييم' : 'Not rated');
                })()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {myGamesError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          {myGamesError}
        </div>
      )}

      {/* UPCOMING GAMES TAB */}
      {activeSubTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingGames.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#0D1629] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4 p-6">
              <Trophy className="w-12 h-12 text-slate-400 dark:text-[#B9C9E0]/60 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#06135B] dark:text-white">
                  {t("You don't have any upcoming games yet.", 'لا توجد مباريات قادمة مسجلة لديك')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#B9C9E0]/80 max-w-sm mx-auto">
                  {t(
                    'Explore open matches in Kuwait or create a match and invite players to join.',
                    'استكشف المباريات المفتوحة في الكويت أو أنشئ مباراة وادعُ اللاعبين للانضمام.'
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-4 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{t('Explore Games', 'استكشاف المباريات')}</span>
                </button>
                <button
                  onClick={() => setCreateGameModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#EEF3F9] hover:bg-[#B9C9E0] text-[#06135B] dark:bg-[#142578] dark:hover:bg-[#1A2E8A] dark:text-white border border-[#B9C9E0] dark:border-[#1F3590] font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Create a Game', 'إنشاء مباراة')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {upcomingGames.map(game => {
                const organizer = isUserOrganizer(game);
                return (
                  <div key={game.id} className="relative flex flex-col min-w-0">
                    <GameCard game={game} />
                    {/* Quick chat & details shortcut */}
                    <div className="mt-2 flex items-center justify-end px-2 text-xs">
                      <button
                        onClick={() => setSelectedGameForDetail(game)}
                        className="text-[#3A60AA] dark:text-[#B9C9E0] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{t('Match Chat & Details', 'الشات والتفاصيل')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PAST GAMES & RELIABILITY CONFIRMATION TAB */}
      {activeSubTab === 'past' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#EEF3F9] dark:bg-[#0D1629] border border-[#B9C9E0]/80 dark:border-slate-800 flex items-center justify-between transition-colors shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] text-amber-400 flex items-center justify-center shrink-0">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#06135B] dark:text-white">
                  {t('Match Ratings & Sportsmanship', 'تقييم المباريات والروح الرياضية')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">
                  {t('Rate players after completed matches to build sportsmanship in Kuwait.', 'قيّم زملاءك واللاعبين بعد انتهاء المباريات لتعزيز الروح الرياضية.')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastGames.length === 0 ? (
              <div className="col-span-2 text-center py-16 bg-white dark:bg-[#0D1629] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 p-6">
                <Clock className="w-12 h-12 text-slate-400 dark:text-[#B9C9E0]/60 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#06135B] dark:text-white">
                    {t('Your past games will appear here.', 'ستظهر مبارياتك السابقة هنا.')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#B9C9E0]/80 max-w-sm mx-auto">
                    {t(
                      'Matches you organize or join will be automatically recorded here after their scheduled time passes.',
                      'المباريات التي تنظمها أو تنضم إليها ستُسجل تلقائياً هنا بعد انتهاء موعدها المجدول.'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              pastGames.map(game => {
                const organizer = isUserOrganizer(game);
                const myParticipant = game.participants.find(p => p.userId === userUid);
                return (
                  <div 
                    key={game.id} 
                    onClick={() => setSelectedGameForDetail(game)}
                    className="p-5 rounded-2xl bg-white dark:bg-[#0D1629] hover:border-[#3A60AA] border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors space-y-3 cursor-pointer group min-w-0"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase text-[#3A60AA] dark:text-[#B9C9E0] bg-[#EEF3F9] dark:bg-[#142578] px-2.5 py-0.5 rounded-full border border-[#B9C9E0] dark:border-[#1F3590]">
                            {getSportLabel(game.sport, language)}
                          </span>
                          {organizer ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-bold text-[10px]">
                              <Crown className="w-2.5 h-2.5 text-amber-500" />
                              <span>{t('Organizer', 'المنظم')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EEF3F9] dark:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] text-[#3A60AA] dark:text-[#B9C9E0] font-bold text-[10px]">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>{t('Joined Player', 'مشترك')}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-[#06135B] dark:text-white text-base group-hover:text-[#3A60AA] transition-colors truncate">
                          {game.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-[#B9C9E0]/80 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {game.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatTimeRange12Hour(game.startTime, game.endTime, language)}
                          </span>
                          <span>•</span>
                          <span className="truncate">{game.courtName}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0] bg-[#EEF3F9] dark:bg-[#142578] border border-[#B9C9E0] dark:border-[#1F3590] px-2.5 py-1 rounded-full shrink-0">
                        {(game.pricePerPlayerKWD ?? 0).toFixed(3)} KWD
                      </span>
                    </div>

                    {/* Attendance Confirmation Poll */}
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="pt-3 border-t border-slate-100 dark:border-[#1F3590]/60 flex items-center justify-between"
                    >
                      <span className="text-xs text-[#06135B] dark:text-[#B9C9E0] font-medium">
                        {t('Did you play this match?', 'هل حضرت ولعبت المباراة؟')}
                      </span>
                      {myParticipant?.attendanceConfirmed !== undefined ? (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('Attendance Confirmed ✓', 'تم تأكيد الحضور ✓')}</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => confirmAttendance(game.id, true)}
                            className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            {t('I Attended ✓', 'حضرت ✓')}
                          </button>
                          <button
                            onClick={() => confirmAttendance(game.id, false)}
                            className="px-3 py-1 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                          >
                            {t('Missed ✕', 'لم أحضر ✕')}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* 5-Star Match Player Rating Section */}
                    {(() => {
                      const otherParticipants: { userId: string; name: string; username: string; avatar: string }[] = [];
                      const orgId = game.organizer?.id || (game.organizer as any)?.uid;
                      if (orgId && orgId !== userUid) {
                        otherParticipants.push({
                          userId: orgId,
                          name: game.organizer.name,
                          username: game.organizer.username,
                          avatar: resolvePlayerAvatar(game.organizer)
                        });
                      }
                      if (Array.isArray(game.participants)) {
                        game.participants.forEach(p => {
                          if (p.userId && p.userId !== userUid && !otherParticipants.some(op => op.userId === p.userId)) {
                            otherParticipants.push({
                              userId: p.userId,
                              name: p.name,
                              username: p.username,
                              avatar: resolvePlayerAvatar(p as any)
                            });
                          }
                        });
                      }

                      if (otherParticipants.length === 0) return null;

                      return (
                        <div 
                          onClick={(e) => e.stopPropagation()}
                          className="pt-3 border-t border-slate-100 dark:border-[#1F3590]/60 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#06135B] dark:text-[#B9C9E0] flex items-center gap-1.5">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{t('Rate Match Players', 'تقييم لاعبي المباراة')}</span>
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-[#B9C9E0]/80">
                              {t('1–5 Stars', '١–٥ نجوم')}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            {otherParticipants.map(target => {
                              const ratedScore = gameRatings[game.id]?.[target.userId];
                              const ratingKey = `${game.id}_${target.userId}`;
                              const isLoadingThis = ratingLoadingMap[ratingKey];

                              return (
                                <div 
                                  key={target.userId}
                                  className="flex items-center justify-between p-2 rounded-xl bg-[#EEF3F9]/60 dark:bg-[#142578]/50 border border-[#B9C9E0]/60 dark:border-[#1F3590]/60 text-xs"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <img 
                                      src={target.avatar} 
                                      alt={target.name}
                                      className="w-6 h-6 rounded-full object-cover shrink-0 ring-1 ring-[#B9C9E0] dark:ring-[#1F3590]" 
                                    />
                                    <div className="min-w-0 truncate">
                                      <span className="font-semibold text-slate-900 dark:text-white truncate block">
                                        {target.name}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-[#B9C9E0]/80 font-mono block">
                                        @{target.username}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {ratedScore ? (
                                      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                        <Check className="w-3 h-3" />
                                        <span>★ {ratedScore}/5</span>
                                      </div>
                                    ) : isLoadingThis ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-[#3A60AA]" />
                                    ) : (
                                      <div className="flex items-center gap-0.5">
                                        {[1, 2, 3, 4, 5].map(star => (
                                          <button
                                            key={star}
                                            type="button"
                                            disabled={isLoadingThis}
                                            onClick={async () => {
                                              setRatingLoadingMap(prev => ({ ...prev, [ratingKey]: true }));
                                              try {
                                                await submitPlayerRating(game.id, target.userId, star, game.sport);
                                                setGameRatings(prev => ({
                                                  ...prev,
                                                  [game.id]: {
                                                    ...(prev[game.id] || {}),
                                                    [target.userId]: star
                                                  }
                                                }));
                                              } finally {
                                                setRatingLoadingMap(prev => ({ ...prev, [ratingKey]: false }));
                                              }
                                            }}
                                            className="p-1 hover:scale-125 transition-transform text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400 cursor-pointer"
                                            title={`${star} ${star === 1 ? 'Star' : 'Stars'}`}
                                            aria-label={`Rate ${target.name} ${star} star`}
                                          >
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* COURT BOOKINGS TAB */}
      {activeSubTab === 'bookings' && (
        <div className="space-y-4">
          {/* Prominent Restriction Warning Banner */}
          {isRestricted && (
            <div 
              data-testid="booking-restricted-banner"
              role="alert"
              className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-3.5 mb-4 shadow-xs"
            >
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5 border border-amber-300 dark:border-amber-700">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 space-y-1 text-left rtl:text-right">
                <h3 className="font-black text-sm sm:text-base text-amber-900 dark:text-amber-300">
                  {t('Booking Restricted', 'الحجز مقيد')}
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed font-medium">
                  {t(
                    'Your account is currently not allowed to organize games or book pitches. Please contact an administrator for assistance.',
                    'حسابك غير مصرح له حالياً بإنشاء مباريات أو حجز الملاعب. يرجى التواصل مع الإدارة للمساعدة.'
                  )}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myBookings.map((b) => (
              <div 
                key={b.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 space-y-3 transition-colors min-w-0 shadow-xs"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#3A60AA] dark:text-[#B9C9E0] bg-[#EEF3F9] dark:bg-[#142578] px-2.5 py-0.5 rounded-full border border-[#B9C9E0] dark:border-[#1F3590]">
                        {b.bookingRef}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-[#B9C9E0]">{getSportLabel(b.sport, language)}</span>
                    </div>
                    <h4 className="font-bold text-[#06135B] dark:text-white text-base truncate">{b.courtName}</h4>
                    <p className="text-xs text-slate-500 dark:text-[#B9C9E0]/80 truncate">{b.address} ({getKuwaitAreaLabel(b.area, language)})</p>
                  </div>
                  <span className="text-sm font-black text-[#06135B] dark:text-white shrink-0">
                    {b.totalCostKWD.toFixed(3)} <span className="text-xs text-[#3A60AA] dark:text-[#B9C9E0]">KWD</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300 py-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
                    <span>{b.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
                    <span>{formatTimeRange12Hour(b.startTime, b.endTime, language)}</span>
                  </div>
                </div>

                {/* "Post this booking for players to join" */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#1F3590]/60 flex items-center justify-between">
                  {b.hasBeenPostedAsGame ? (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t('Posted to La3ib Matches', 'تم نشرها كمباراة في لعيب')}</span>
                    </span>
                  ) : (
                    <div className="w-full space-y-1">
                      <button
                        onClick={() => {
                          if (isRestricted || isPrivilegeLoading) return;
                          postBookingAsGame(b);
                        }}
                        disabled={isRestricted || isPrivilegeLoading}
                        aria-label="Post Booking"
                        onKeyDown={(e) => {
                          if (isRestricted || isPrivilegeLoading) {
                            e.preventDefault();
                          }
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs ${
                          isRestricted || isPrivilegeLoading
                            ? 'bg-slate-100 dark:bg-[#142578] text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-[#1F3590] cursor-not-allowed opacity-60'
                            : 'bg-[#3A60AA] hover:bg-[#2E4D8A] text-white cursor-pointer'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{t('Post Booking to Fill Remaining Spots', 'انشر الحجز لتقاسم التكلفة مع لاعبين')}</span>
                      </button>
                      {isRestricted && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block text-center">
                          {t('Action disabled: account restricted from organizing games', 'الإجراء معطل: الحساب مقيد من تنظيم المباريات')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
