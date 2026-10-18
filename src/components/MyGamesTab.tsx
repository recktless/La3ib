import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { Game } from '../types';
import { isGamePast } from '../lib/firebase';

export const MyGamesTab: React.FC = () => {
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
    t 
  } = useApp();

  const isRestricted = currentUser?.canOrganize === false;
  const isPrivilegeLoading = authStatus === 'loading';

  const [activeSubTab, setActiveSubTab] = useState<'upcoming' | 'past' | 'bookings'>('upcoming');

  const userUid = currentUser.uid || currentUser.id;

  // Membership determination according to strict data model:
  // Organizer: game.organizerId === userUid || game.organizer.id === userUid
  // Participant: game.participants.some(p => p.userId === userUid)
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

  // Unauthenticated view: do not query private data, prompt user to sign in
  if (authStatus === 'unauthenticated') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {t('My Games & Activity', 'مبارياتي ونشاطاتي الرياضية')}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t(
              'Track your upcoming pickup games, Li3ib court bookings, and attendance history.',
              'متابعة المباريات القادمة، حجوزات الملاعب وسجل الحضور.'
            )}
          </p>
        </div>

        <div className="text-center py-20 bg-neutral-950 rounded-3xl border border-neutral-800 space-y-4 max-w-md mx-auto my-8 p-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">
              {t('Sign in to view your games', 'سجل الدخول لعرض مبارياتك')}
            </h3>
            <p className="text-xs text-neutral-400">
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
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {t('My Games & Activity', 'مبارياتي ونشاطاتي الرياضية')}
            </h1>
            {isMyGamesLoading && (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {t(
              'Track your upcoming pickup games, Li3ib court bookings, and attendance history.',
              'متابعة المباريات القادمة، حجوزات الملاعب وسجل الحضور.'
            )}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('upcoming')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'upcoming'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('Upcoming', 'القادمة')} ({upcomingGames.length})
          </button>

          <button
            onClick={() => setActiveSubTab('past')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'past'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('Past & History', 'السابقة والأرشيف')} ({pastGames.length})
          </button>

          <button
            onClick={() => setActiveSubTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'bookings'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            {t('Li3ib Bookings', 'حجوزات Li3ib')} ({myBookings.length})
          </button>
        </div>
      </div>

      {myGamesError && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300">
          {myGamesError}
        </div>
      )}

      {/* UPCOMING GAMES TAB */}
      {activeSubTab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingGames.length === 0 ? (
            <div className="text-center py-16 bg-neutral-950 rounded-3xl border border-neutral-800 space-y-4">
              <Trophy className="w-12 h-12 text-neutral-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {t("You don't have any upcoming games yet.", 'لا توجد مباريات قادمة مسجلة لديك')}
                </h3>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  {t(
                    'Explore open matches in Kuwait or create a match and invite players to join.',
                    'استكشف المباريات المفتوحة في الكويت أو أنشئ مباراة وادعُ اللاعبين للانضمام.'
                  )}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab('discover')}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-500/20"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{t('Explore Games', 'استكشاف المباريات')}</span>
                </button>
                <button
                  onClick={() => setCreateGameModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('Create a Game', 'إنشاء مباراة')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {upcomingGames.map(game => {
                const organizer = isUserOrganizer(game);
                return (
                  <div key={game.id} className="relative flex flex-col">
                    <GameCard game={game} />
                    {/* Status badge & Quick chat badge */}
                    <div className="mt-2.5 flex items-center justify-between px-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        {organizer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                            <Crown className="w-3 h-3 text-amber-400" />
                            <span>{t('Organizer', 'أنت المنظم')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{t('Joined Player', 'مشترك كلاعب')}</span>
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedGameForDetail(game)}
                        className="text-emerald-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
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
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                ★
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  {t('Player Reliability Rating:', 'نسبة موثوقية الحضور:')}{' '}
                  <span className="text-emerald-400 font-extrabold">{currentUser.attendanceRate}%</span>
                </h4>
                <p className="text-[11px] text-neutral-400">
                  {t('Confirming attendance after matches helps build trust across Kuwait sports groups.', 'تأكيد الحضور بعد انتهاء المباريات يعزز مكانتك في مجتمع الرياضيين.')}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pastGames.length === 0 ? (
              <div className="col-span-2 text-center py-16 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
                <Clock className="w-12 h-12 text-neutral-600 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    {t('Your past games will appear here.', 'ستظهر مبارياتك السابقة هنا.')}
                  </h3>
                  <p className="text-xs text-neutral-400 max-w-sm mx-auto">
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
                    className="p-5 rounded-2xl bg-neutral-950 hover:bg-neutral-900/60 border border-neutral-800 hover:border-neutral-700 transition-all space-y-3 cursor-pointer group"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase text-neutral-400">{game.sport}</span>
                          {organizer ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                              <Crown className="w-2.5 h-2.5 text-amber-400" />
                              <span>{t('Organizer', 'المنظم')}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                              <span>{t('Joined Player', 'مشترك')}</span>
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                          {game.title}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-neutral-500" />
                            {game.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            {game.startTime} - {game.endTime}
                          </span>
                          <span>•</span>
                          <span>{game.courtName}</span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-lg shrink-0">
                        {game.pricePerPlayerKWD.toFixed(3)} KWD
                      </span>
                    </div>

                    {/* Attendance Confirmation Poll */}
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="pt-3 border-t border-neutral-800/80 flex items-center justify-between"
                    >
                      <span className="text-xs text-neutral-300 font-medium">
                        {t('Did you play this match?', 'هل حضرت ولعبت المباراة؟')}
                      </span>
                      {myParticipant?.attendanceConfirmed !== undefined ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('Attendance Confirmed ✓', 'تم تأكيد الحضور ✓')}</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => confirmAttendance(game.id, true)}
                            className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            {t('I Attended ✓', 'حضرت ✓')}
                          </button>
                          <button
                            onClick={() => confirmAttendance(game.id, false)}
                            className="px-3 py-1 bg-red-950 hover:bg-red-900 text-red-400 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            {t('Missed ✕', 'لم أحضر ✕')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* LI3IB BOOKINGS TAB */}
      {activeSubTab === 'bookings' && (
        <div className="space-y-4">
          {/* Prominent Restriction Warning Banner */}
          {isRestricted && (
            <div 
              data-testid="booking-restricted-banner"
              role="alert"
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-neutral-900 to-amber-950/80 border-2 border-amber-500/60 shadow-lg shadow-amber-950/40 text-amber-100 flex items-start gap-3.5 mb-4"
            >
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 space-y-1 text-left rtl:text-right">
                <h3 className="font-black text-sm sm:text-base text-amber-300">
                  {t('Booking Restricted', 'الحجز مقيد')}
                </h3>
                <p className="text-xs sm:text-sm text-amber-200/90 leading-relaxed font-medium">
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
                className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                        {b.bookingRef}
                      </span>
                      <span className="text-xs text-neutral-400">{b.sport}</span>
                    </div>
                    <h4 className="font-bold text-white text-base">{b.courtName}</h4>
                    <p className="text-xs text-neutral-400">{b.address} ({b.area})</p>
                  </div>
                  <span className="text-sm font-black text-white">
                    {b.totalCostKWD.toFixed(3)} <span className="text-xs text-emerald-400">KWD</span>
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-neutral-300 py-1">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{b.date}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{b.startTime} - {b.endTime}</span>
                  </div>
                </div>

                {/* "Post this booking for players to join" */}
                <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
                  {b.hasBeenPostedAsGame ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
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
                        className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all ${
                          isRestricted || isPrivilegeLoading
                            ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60 shadow-none'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-md shadow-emerald-500/20 cursor-pointer'
                        }`}
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{t('Post Booking to Fill Remaining Spots', 'انشر الحجز لتقاسم التكلفة مع لاعبين')}</span>
                      </button>
                      {isRestricted && (
                        <span className="text-[10px] text-amber-400 font-semibold block text-center">
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
