import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  Activity,
  User,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Check,
  Clock,
  Loader2,
  Calendar,
  Trophy,
  History,
  AlertCircle,
  ShieldAlert,
  Ban,
  MoreHorizontal,
  AlertTriangle
} from 'lucide-react';
import { SportType, PlayerActivityStats, ReportReason, resolvePlayerAvatar } from '../types';

const REPORT_REASONS: { key: ReportReason; en: string; ar: string }[] = [
  { key: 'spam', en: 'Spam or advertising', ar: 'إعلانات مزعجة أو سبام' },
  { key: 'harassment', en: 'Harassment or hate speech', ar: 'مضايقة أو إساءة' },
  { key: 'inappropriate_behavior', en: 'Inappropriate behavior', ar: 'سلوك غير لائق' },
  { key: 'fake_profile', en: 'Fake profile or impersonation', ar: 'حساب وهمي أو انتحال' },
  { key: 'scam_or_fraud', en: 'Scam or fraud', ar: 'احتيال أو نصب' },
  { key: 'unsafe_behavior', en: 'Unsafe behavior on court', ar: 'سلوك خطير أو غير آمن' },
  { key: 'other', en: 'Other reason', ar: 'سبب آخر' },
];

export const PlayerProfileModal: React.FC = () => {
  const { 
    selectedPlayerProfile, 
    setSelectedPlayerProfile,
    currentUser,
    isFollowingUser,
    isFollowActionLoading,
    toggleFollowPlayer,
    getFriendshipStatus,
    isFriendActionLoading,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    loadPlayerActivity,
    blockedUserIds,
    blockPlayer,
    isBlockActionLoading,
    submitReport,
    authStatus,
    isDemoActive,
    setAuthModalOpen,
    setAuthModalMode,
    t 
  } = useApp();

  const [activityStats, setActivityStats] = useState<PlayerActivityStats | null>(null);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Step 6: More Menu & Reporting / Blocking State
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [selectedReason, setSelectedReason] = useState<ReportReason>('inappropriate_behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);
  const [blockFeedback, setBlockFeedback] = useState<string | null>(null);

  const targetId = selectedPlayerProfile?.id || selectedPlayerProfile?.uid || '';
  const currentUid = currentUser?.uid || currentUser?.id || '';

  const handleCloseReportModal = () => {
    setShowReportModal(false);
    setReportDetails('');
    setSelectedReason('inappropriate_behavior');
    setReportFeedback(null);
  };

  // Reset stale report form state on account switch or target change without clearing while composing
  const lastTargetAndUserRef = useRef({ targetId, currentUid });
  useEffect(() => {
    if (lastTargetAndUserRef.current.targetId !== targetId || lastTargetAndUserRef.current.currentUid !== currentUid) {
      lastTargetAndUserRef.current = { targetId, currentUid };
      setReportDetails('');
      setSelectedReason('inappropriate_behavior');
      setReportFeedback(null);
      setShowReportModal(false);
      setShowMoreMenu(false);
    }
  }, [targetId, currentUid]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showReportModal) {
          handleCloseReportModal();
        } else if (showBlockConfirm) {
          setShowBlockConfirm(false);
        } else {
          setSelectedPlayerProfile(null);
        }
      }
    };

    if (selectedPlayerProfile) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPlayerProfile, setSelectedPlayerProfile, showReportModal, showBlockConfirm]);

  // Load factual player activity stats whenever selected player changes

  useEffect(() => {
    if (!targetId) {
      setActivityStats(null);
      setIsActivityLoading(false);
      setActivityError(null);
      return;
    }

    let isSubscribed = true;
    setIsActivityLoading(true);
    setActivityError(null);

    loadPlayerActivity(targetId)
      .then((stats) => {
        if (isSubscribed) {
          setActivityStats(stats);
          setIsActivityLoading(false);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          console.warn('[PlayerProfileModal] Could not load activity stats:', err);
          setIsActivityLoading(false);
          setActivityError('Could not load activity history.');
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [targetId, loadPlayerActivity]);

  // Early return: ONLY after all hooks have been unconditionally called
  if (!selectedPlayerProfile) return null;

  const isBlocked = blockedUserIds.has(targetId);

  // If player is blocked, show a simple blocked state without leaking internal details
  if (isBlocked) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
        onClick={() => setSelectedPlayerProfile(null)}
        role="dialog"
        aria-modal="true"
      >
        <div 
          className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-center space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 text-neutral-400 mx-auto flex items-center justify-center border border-neutral-700">
            <UserX className="w-7 h-7 text-neutral-400" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {t('Player Unavailable', 'اللاعب غير متاح')}
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {t('This player profile is unavailable.', 'ملف هذا اللاعب غير متاح حالياً.')}
            </p>
          </div>
          <button
            onClick={() => setSelectedPlayerProfile(null)}
            className="w-full py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {t('Close', 'إغلاق')}
          </button>
        </div>
      </div>
    );
  }

  const player = selectedPlayerProfile;
  const showAge = player.privacy?.showAge !== false && typeof player.age === 'number' && player.age > 0;
  
  // Prevent self-follow, self-friend, self-block, self-report
  const myUid = currentUser.uid || currentUser.id;
  const isSelf = myUid === player.id || (Boolean(player.uid) && myUid === player.uid);
  const isFollowing = isFollowingUser(targetId);
  const isFollowLoading = isFollowActionLoading(targetId);
  const friendshipStatus = getFriendshipStatus(targetId);
  const isFriendLoading = isFriendActionLoading(targetId);
  const isBlockLoading = isBlockActionLoading(targetId);

  const handleBlockConfirm = async () => {
    try {
      setBlockFeedback(null);
      await blockPlayer(targetId);
      setShowBlockConfirm(false);
      setShowMoreMenu(false);
    } catch (err: any) {
      setBlockFeedback(err?.message || 'Failed to block player.');
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus !== 'authenticated' && !isDemoActive) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    if (!targetId || targetId === 'user-current' || targetId === currentUid) {
      setReportFeedback(t('Cannot submit a report for this profile.', 'لا يمكن تقديم بلاغ ضد هذا الملف الشخصي.'));
      return;
    }

    try {
      setIsSubmittingReport(true);
      setReportFeedback(null);
      await submitReport({
        reportedUserId: targetId,
        reason: selectedReason,
        details: reportDetails.trim() || undefined
      });
      setReportFeedback(t('Report submitted. Thank you for helping keep La3ib safe.', 'تم استلام البلاغ. شكراً لمساعدتنا في الحفاظ على مجتمع آمن.'));
      setTimeout(() => {
        handleCloseReportModal();
      }, 1500);
    } catch (err: any) {
      setReportFeedback(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getSportIcon = (sport: SportType) => {
    switch (sport) {
      case 'Football': return '⚽';
      case 'Padel': return '🎾';
      case 'Basketball': return '🏀';
      case 'Volleyball': return '🏐';
      case 'Tennis': return '🎾';
      case 'Badminton': return '🏸';
      default: return '🏆';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={() => setSelectedPlayerProfile(null)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-profile-title"
    >
      <div 
        className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h2 id="player-profile-title" className="text-base sm:text-lg font-extrabold text-white">
              {t('Player Profile', 'الملف الرياضي')}
            </h2>
          </div>

          <button 
            onClick={() => setSelectedPlayerProfile(null)}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Avatar, Basic Info, and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <img 
                  src={resolvePlayerAvatar(player)} 
                  alt={player.name}
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-lg shrink-0"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-neutral-900" title="Active Player" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-white truncate">
                    {player.name}
                  </h3>
                  {player.nameAr && (
                    <span className="text-xs text-neutral-400 font-['Cairo']">
                      ({player.nameAr})
                    </span>
                  )}
                </div>

                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  @{player.username}
                </p>

                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1 text-emerald-400 font-medium">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{player.area}</span>
                  </div>

                  {showAge && (
                    <span className="bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded-full text-[11px] font-medium">
                      {player.age} {t('years old', 'سنة')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions for other players: Follow + Friend Actions */}
            {!isSelf && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                {/* Follow Button */}
                <button
                  type="button"
                  disabled={isFollowLoading}
                  onClick={() => toggleFollowPlayer(targetId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 ${
                    isFollowing
                      ? 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-sm'
                  }`}
                >
                  {isFollowLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{t('Following', 'تتابعه')}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('Follow', 'متابعة')}</span>
                    </>
                  )}
                </button>

                {/* Friend Status / Action Button */}
                {friendshipStatus === 'friends' && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5 shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t('Friends', 'أصدقاء')}</span>
                  </div>
                )}

                {friendshipStatus === 'outgoing_request' && (
                  <button
                    type="button"
                    disabled={isFriendLoading}
                    onClick={() => cancelFriendRequest(targetId)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-red-950/50 border border-neutral-700 hover:border-red-800 text-amber-400 hover:text-red-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    title={t('Click to cancel request', 'انقر لإلغاء طلب الصداقة')}
                  >
                    {isFriendLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t('Request Sent (Cancel)', 'تم إرسال الطلب (إلغاء)')}</span>
                      </>
                    )}
                  </button>
                )}

                {friendshipStatus === 'incoming_request' && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isFriendLoading}
                      onClick={() => acceptFriendRequest(targetId)}
                      className="flex-1 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isFriendLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{t('Accept', 'قبول')}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isFriendLoading}
                      onClick={() => declineFriendRequest(targetId)}
                      className="px-2.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-red-400 text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
                      title={t('Decline request', 'رفض الطلب')}
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {friendshipStatus === 'none' && (
                  <button
                    type="button"
                    disabled={isFriendLoading}
                    onClick={() => sendFriendRequest(targetId)}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-emerald-500/40 text-neutral-200 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isFriendLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{t('Add Friend', 'إضافة صديق')}</span>
                      </>
                    )}
                  </button>
                )}

                {/* More Options Dropdown (Report & Block) */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu(prev => !prev)}
                    className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer border border-neutral-700/80"
                    title={t('More options', 'المزيد من الخيارات')}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showMoreMenu && (
                    <div 
                      className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-1.5 z-30 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setReportDetails('');
                          setSelectedReason('inappropriate_behavior');
                          setReportFeedback(null);
                          setShowReportModal(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors text-left cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        <span>{t('Report Player', 'الإبلاغ عن لاعب')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowBlockConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 text-red-400" />
                        <span>{t('Block Player', 'حظر اللاعب')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Scalable Statistics Card: Friends | Followers | Following */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80">
            {/* Friends Count */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2 py-1">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-extrabold text-white truncate">
                  {player.friendCount ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">
                  {t('Friends', 'الأصدقاء')}
                </p>
              </div>
            </div>

            {/* Followers Count */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2 py-1 border-l border-neutral-800/80">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-extrabold text-white truncate">
                  {player.followerCount ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">
                  {t('Followers', 'المتابعون')}
                </p>
              </div>
            </div>

            {/* Following Count */}
            <div className="flex items-center gap-2 sm:gap-2.5 px-2 py-1 border-l border-neutral-800/80">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-emerald-400 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm sm:text-base font-extrabold text-white truncate">
                  {player.followingCount ?? 0}
                </p>
                <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium truncate">
                  {t('Following', 'يتابع')}
                </p>
              </div>
            </div>
          </div>

          {/* Step 5: Social Activity & Player Stats (Games Played, Hosted, Upcoming, Sports Played, Recent Activity) */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('La3ib Activity & Stats', 'نشاط وإحصائيات لعيب')}</span>
              </h4>
              {isActivityLoading && (
                <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                  <span>{t('Calculating...', 'جارٍ الحساب...')}</span>
                </div>
              )}
            </div>

            {/* 3-Box Stats Card: Played | Hosted | Upcoming */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800/90 text-center">
              <div className="p-2 rounded-xl bg-neutral-900/60">
                <span className="text-lg sm:text-xl font-black text-white block">
                  {activityStats !== null ? activityStats.gamesPlayed : (player.gamesPlayed ?? 0)}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 block mt-0.5">
                  {t('Played', 'لعبها')}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-neutral-900/60">
                <span className="text-lg sm:text-xl font-black text-emerald-400 block">
                  {activityStats !== null ? activityStats.gamesHosted : (player.gamesHosted ?? 0)}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 block mt-0.5">
                  {t('Hosted', 'نظمها')}
                </span>
              </div>

              <div className="p-2 rounded-xl bg-neutral-900/60">
                <span className="text-lg sm:text-xl font-black text-amber-400 block">
                  {activityStats !== null ? activityStats.upcomingGames : 0}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-400 block mt-0.5">
                  {t('Upcoming', 'قادمة')}
                </span>
              </div>
            </div>

            {/* Sports Played (Factual derived from actual match participation) */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('Sports Played (Match History)', 'الرياضات الملعوبة (سجل المباريات)')}</span>
                </span>
              </div>

              {activityStats && activityStats.sportsPlayed.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {activityStats.sportsPlayed.map((sport) => (
                    <span
                      key={sport}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200"
                    >
                      <span>{getSportIcon(sport)}</span>
                      <span>{sport}</span>
                    </span>
                  ))}
                </div>
              ) : isActivityLoading ? (
                <p className="text-[11px] text-neutral-500 italic">
                  {t('Loading sports activity...', 'جارٍ تحميل سجل الرياضات...')}
                </p>
              ) : (
                <p className="text-[11px] text-neutral-500">
                  {t('No past matches completed on La3ib yet.', 'لا توجد مباريات مكتملة في لعيب حتى الآن.')}
                </p>
              )}
            </div>

            {/* Recent Activity (Up to 5 recent matches) */}
            <div className="p-3.5 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 space-y-2">
              <h5 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('Recent Activity', 'النشاط الأخير')}</span>
              </h5>

              {isActivityLoading && !activityStats ? (
                <div className="py-4 text-center text-xs text-neutral-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                  <span>{t('Loading recent games...', 'جارٍ تحميل النشاط الأخير...')}</span>
                </div>
              ) : activityStats && activityStats.recentActivities.length > 0 ? (
                <div className="space-y-1.5 divide-y divide-neutral-900">
                  {activityStats.recentActivities.map((act) => (
                    <div 
                      key={act.gameId}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-base shrink-0">{getSportIcon(act.sport)}</span>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate leading-tight">
                            {act.title}
                          </p>
                          <p className="text-[10px] text-neutral-400 truncate">
                            {act.courtName ? `${act.courtName} • ` : ''}{act.area || 'Kuwait'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                          act.role === 'hosted'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                            : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        }`}>
                          {act.role === 'hosted' ? t('Hosted', 'نظمها') : t('Played', 'لعبها')}
                        </span>
                        <span className="text-[10px] text-neutral-500 block mt-0.5 font-mono">
                          {act.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 italic py-1">
                  {t('No recent game activity found.', 'لا يوجد نشاط مباريات أخير.')}
                </p>
              )}

              {activityError && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400/90 pt-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{activityError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bio Section */}
          {player.bio ? (
            <div className="bg-neutral-950/80 p-4 rounded-2xl border border-neutral-800/80">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('About', 'نبذة')}</span>
              </h4>
              <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line">
                {player.bio}
              </p>
            </div>
          ) : (
            <div className="bg-neutral-950/40 p-3 rounded-2xl border border-neutral-800/40 text-xs text-neutral-500 italic">
              {t('No player bio provided yet.', 'لم يقم اللاعب بإضافة نبذة بعد.')}
            </div>
          )}

          {/* Favorite Sports & Skill Levels */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('Sports & Skill Levels', 'الرياضات والمستوى')}</span>
            </h4>

            {player.favoriteSports && player.favoriteSports.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {player.favoriteSports.map((sport) => {
                  const skill = player.skills?.[sport] || 'Casual';
                  return (
                    <div 
                      key={sport}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800/80"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getSportIcon(sport)}</span>
                        <span className="text-xs font-bold text-white">{sport}</span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
                        {skill}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                {t('No sports listed.', 'لم يتم تحديد رياضات مفضلة.')}
              </p>
            )}
          </div>

          {/* Community Info Notice */}
          <div className="p-3 bg-neutral-950/60 rounded-2xl border border-neutral-800/60 flex items-center gap-2.5 text-xs text-neutral-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {t(
                'Public athlete profile on La3ib Kuwait. Private account details and contact information are protected.',
                'ملف رياضي عام في مجتمع لعيب الكويت. البيانات الشخصية ومعلومات الاتصال محمية بالكامل.'
              )}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-end">
          <button
            onClick={() => setSelectedPlayerProfile(null)}
            className="px-5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            {t('Close', 'إغلاق')}
          </button>
        </div>

        {/* Step 6: Report Player Modal Overlay */}
        {showReportModal && (
          <div 
            className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={handleCloseReportModal}
          >
            <div 
              className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">
                      {t('Report Player', 'الإبلاغ عن لاعب')}
                    </h3>
                    <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                      {player.name} (@{player.username})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  reportFeedback.includes('Thank you') || reportFeedback.includes('شكراً')
                    ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-300'
                    : 'bg-red-950/80 border border-red-800/80 text-red-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reportFeedback}</span>
                </div>
              )}

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-2">
                    {t('Why are you reporting this player?', 'ما هو سبب الإبلاغ عن هذا اللاعب؟')}
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {REPORT_REASONS.map((r) => (
                      <label 
                        key={r.key} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          selectedReason === r.key 
                            ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300 font-semibold' 
                            : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="report_reason" 
                            checked={selectedReason === r.key}
                            onChange={() => setSelectedReason(r.key)}
                            className="text-emerald-500 focus:ring-0 bg-neutral-900 border-neutral-700"
                          />
                          <span>{t(r.en, r.ar)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-1.5">
                    {t('Details (Optional):', 'تفاصيل إضافية (اختياري):')}
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={t('Tell us more about the issue...', 'اشرح المشكلة بالتفصيل...')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-[10px] text-neutral-500 block text-right">
                    {reportDetails.length}/1000
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={handleCloseReportModal}
                    disabled={isSubmittingReport}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {t('Cancel', 'إلغاء')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isSubmittingReport ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>{t('Submit Report', 'إرسال البلاغ')}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Step 6: Block Player Confirmation Dialog Overlay */}
        {showBlockConfirm && (
          <div 
            className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowBlockConfirm(false)}
          >
            <div 
              className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-800/80 text-red-400 mx-auto flex items-center justify-center">
                <Ban className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-white">
                  {t('Block', 'حظر')} {player.name}?
                </h3>
                <p className="text-xs text-neutral-400 mt-2 leading-relaxed">
                  {t(
                    'This player will no longer be able to discover your profile, follow you, send friend requests, or invite you to matches. Any existing friendships or follows will be permanently removed.',
                    'لن يتمكن هذا اللاعب من العثور على ملفك، متابعتك، إرسال طلبات صداقة، أو دعوتك للمباريات. ستتم إزالة الصداقة والمتابعة نهائياً.'
                  )}
                </p>
              </div>

              {blockFeedback && (
                <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-300">
                  {blockFeedback}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isBlockLoading}
                  onClick={() => setShowBlockConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  disabled={isBlockLoading}
                  onClick={handleBlockConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                >
                  {isBlockLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Ban className="w-3.5 h-3.5" />
                  )}
                  <span>{t('Block Player', 'تأكيد الحظر')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
