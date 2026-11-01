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
  Trophy, 
  History, 
  AlertCircle, 
  ShieldAlert, 
  Ban, 
  MoreHorizontal, 
  Lock,
  Star
} from 'lucide-react';
import { 
  SportType, 
  PlayerActivityStats, 
  ReportReason, 
  resolvePlayerAvatar, 
  getSportLabel, 
  getSkillLabel, 
  getKuwaitAreaLabel,
  formatPlayerRating
} from '../types';

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
    language,
    t 
  } = useApp();

  const [activityStats, setActivityStats] = useState<PlayerActivityStats | null>(null);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

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

  if (!selectedPlayerProfile) return null;

  const isBlocked = blockedUserIds.has(targetId);

  if (isBlocked) {
    return (
      <div 
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 overflow-y-auto"
        onClick={() => setSelectedPlayerProfile(null)}
        role="dialog"
        aria-modal="true"
      >
        <div 
          className="relative w-full max-w-sm bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-3xl p-6 text-center space-y-4 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-[#1B253D] text-slate-500 dark:text-slate-400 mx-auto flex items-center justify-center border border-slate-200 dark:border-[#2A3B5C]">
            <UserX className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Player Unavailable', 'اللاعب غير متاح')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('This player profile is unavailable.', 'ملف هذا اللاعب غير متاح حالياً.')}
            </p>
          </div>
          <button
            onClick={() => setSelectedPlayerProfile(null)}
            className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] text-slate-900 dark:text-white text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-[#2A3B5C]"
          >
            {t('Close', 'إغلاق')}
          </button>
        </div>
      </div>
    );
  }

  const player = selectedPlayerProfile;
  const showAge = player.privacy?.showAge !== false && typeof player.age === 'number' && player.age > 0;
  
  const myUid = currentUser.uid || currentUser.id;
  const isSelf = myUid === player.id || (Boolean(player.uid) && myUid === player.uid);
  const isFollowing = isFollowingUser(targetId);
  const isFollowLoading = isFollowActionLoading(targetId);
  const friendshipStatus = getFriendshipStatus(targetId);
  const isFriendLoading = isFriendActionLoading(targetId);
  const isBlockLoading = isBlockActionLoading(targetId);
  const isProfilePrivateToViewer = Boolean(player.privacy?.isPrivateProfile) && !isSelf && friendshipStatus !== 'friends';

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

  const getSportIcon = (_sport: SportType) => null;

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 overflow-y-auto animate-fade-in"
      onClick={() => setSelectedPlayerProfile(null)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-profile-title"
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-3xl overflow-hidden flex flex-col my-auto max-h-[92dvh] transition-colors animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-[#1B253D] bg-slate-50 dark:bg-[#1B253D]">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#1246DF] dark:text-[#05BCD1]" />
            <h2 id="player-profile-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t('Player Profile', 'الملف الرياضي')}
            </h2>
          </div>

          <button 
            onClick={() => setSelectedPlayerProfile(null)}
            className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-[#253452] dark:hover:bg-[#2F4166] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          {/* Visitor Banner Surface (No edit controls for visitors) */}
          <div className="h-28 sm:h-32 w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-2 relative overflow-hidden bg-[#B9C9E0] border-b border-slate-100 dark:border-[#1F3590]">
            {player.bannerUrl ? (
              <img 
                src={player.bannerUrl} 
                alt={player.name} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-[#B9C9E0]" />
            )}
            {player.bannerUrl && (
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/20 pointer-events-none" />
            )}
          </div>

          {/* Avatar, Basic Info, and Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative">
                <img 
                  src={resolvePlayerAvatar(player)} 
                  alt={player.name} 
                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-[#2A3B5C] shrink-0"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#05BCD1] ring-2 ring-white dark:ring-[#131C31]" title="Active Player" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-bold text-[#06135B] dark:text-[#B9C9E0] truncate">
                    {player.name}
                  </h3>
                  {player.nameAr && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-['Cairo']">
                      ({player.nameAr})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                    @{player.username}
                  </p>

                  {/* 5-Star Player Rating Badge */}
                  {(() => {
                    const ratingInfo = formatPlayerRating(player, language);
                    return (
                      <span 
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0] dark:border-[#1F3590] text-xs font-bold text-[#06135B] dark:text-[#B9C9E0]"
                        title={ratingInfo.fullLabel}
                      >
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{ratingInfo.isRated ? `${ratingInfo.scoreText}/5` : (language === 'ar' ? 'غير مقيم' : 'Not rated')}</span>
                        {ratingInfo.isRated && (
                          <span className="text-[10px] text-slate-500 dark:text-[#B9C9E0]/80">
                            {ratingInfo.countText}
                          </span>
                        )}
                      </span>
                    );
                  })()}
                </div>

                {/* Compact Social Statistics: Following Followers Friends */}
                <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap mt-1 text-xs">
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-[#B9C9E0]">
                    <span className="font-bold text-slate-900 dark:text-white">{player.followingCount ?? 0}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">{t('Following', 'تتابع')}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-[#B9C9E0]">
                    <span className="font-bold text-slate-900 dark:text-white">{player.followerCount ?? 0}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">{t('Followers', 'متابعون')}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-600 dark:text-[#B9C9E0]">
                    <span className="font-bold text-slate-900 dark:text-white">{player.friendCount ?? 0}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">{t('Friends', 'أصدقاء')}</span>
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1 text-[#1246DF] dark:text-[#05BCD1] font-semibold">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span>{getKuwaitAreaLabel(player.area, language)}</span>
                  </div>

                  {showAge && (
                    <span className="bg-slate-100 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-[11px] font-medium border border-slate-200 dark:border-[#2A3B5C]">
                      {player.age} {t('years old', 'سنة')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions for other players */}
            {!isSelf && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                {/* Follow Button */}
                <button
                  type="button"
                  disabled={isFollowLoading}
                  onClick={() => toggleFollowPlayer(targetId)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0 ${
                    isFollowing
                      ? 'bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] border border-slate-200 dark:border-[#2A3B5C] text-slate-800 dark:text-slate-200'
                      : 'bg-[#1246DF] hover:bg-[#0E38B8] text-white'
                  }`}
                >
                  {isFollowLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
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
                  <div className="px-3.5 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[#1246DF] dark:text-[#05BCD1] text-xs font-bold flex items-center justify-center gap-1.5 shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{t('Friends', 'أصدقاء')}</span>
                  </div>
                )}

                {friendshipStatus === 'outgoing_request' && (
                  <button
                    type="button"
                    disabled={isFriendLoading}
                    onClick={() => cancelFriendRequest(targetId)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-[#1B253D] dark:hover:bg-rose-950/40 border border-slate-200 hover:border-rose-300 dark:border-[#2A3B5C] text-amber-600 hover:text-rose-600 dark:text-amber-400 dark:hover:text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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
                      className="flex-1 px-3 py-2 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
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
                      className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-[#1B253D] dark:hover:bg-rose-950/40 text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0 border border-slate-200 dark:border-[#2A3B5C]"
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
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] border border-slate-200 dark:border-[#2A3B5C] text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isFriendLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                        <span>{t('Add Friend', 'إضافة صديق')}</span>
                      </>
                    )}
                  </button>
                )}

                {/* More Options Dropdown */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowMoreMenu(prev => !prev)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-[#2A3B5C]"
                    title={t('More options', 'المزيد من الخيارات')}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showMoreMenu && (
                    <div 
                      className="absolute right-0 top-full mt-1.5 w-44 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] p-1.5 z-30 space-y-1"
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
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1B253D] transition-colors text-left cursor-pointer"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                        <span>{t('Report Player', 'الإبلاغ عن لاعب')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowBlockConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-500" />
                        <span>{t('Block Player', 'حظر اللاعب')}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>



          {/* Social Activity & Player Stats */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                <span>{t('La3ib Activity & Stats', 'نشاط وإحصائيات لعيب')}</span>
              </h4>
              {isActivityLoading && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin text-[#1246DF] dark:text-[#05BCD1]" />
                  <span>{t('Calculating...', 'جارٍ الحساب...')}</span>
                </div>
              )}
            </div>

            {isProfilePrivateToViewer ? (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-center space-y-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] flex items-center justify-center mx-auto text-slate-400">
                  <Lock className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('Private Profile', 'ملف شخصي خاص')}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {t(
                      'This athlete’s match history and activity are private. Only confirmed friends can view activity.',
                      'سجل مباريات هذا اللاعب ونشاطه خاص. يمكن فقط للأصدقاء المؤكدين مشاهدة سجل الأنشطة.'
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 3-Box Stats Card */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-center">
                  <div className="p-2 rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E]">
                    <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white block">
                      {activityStats !== null ? activityStats.gamesPlayed : (player.gamesPlayed ?? 0)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                      {t('Played', 'لعبها')}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E]">
                    <span className="text-lg sm:text-xl font-black text-[#1246DF] dark:text-[#05BCD1] block">
                      {activityStats !== null ? activityStats.gamesHosted : (player.gamesHosted ?? 0)}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                      {t('Hosted', 'نظمها')}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E]">
                    <span className="text-lg sm:text-xl font-black text-amber-500 block">
                      {activityStats !== null ? activityStats.upcomingGames : 0}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mt-0.5">
                      {t('Upcoming', 'قادمة')}
                    </span>
                  </div>
                </div>

                {/* Sports Played */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-semibold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                      <span>{t('Sports Played (Match History)', 'الرياضات الملعوبة (سجل المباريات)')}</span>
                    </span>
                  </div>

                  {activityStats && activityStats.sportsPlayed.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activityStats.sportsPlayed.map((sport) => (
                        <span
                          key={sport}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-slate-800 dark:text-slate-200"
                        >
                          <span>{getSportIcon(sport)}</span>
                          <span>{getSportLabel(sport, language)}</span>
                        </span>
                      ))}
                    </div>
                  ) : isActivityLoading ? (
                    <p className="text-[11px] text-slate-400 italic">
                      {t('Loading sports activity...', 'جارٍ تحميل سجل الرياضات...')}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('No past matches completed on La3ib yet.', 'لا توجد مباريات مكتملة في لعيب حتى الآن.')}
                    </p>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] space-y-2">
                  <h5 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                    <span>{t('Recent Activity', 'النشاط الأخير')}</span>
                  </h5>

                  {isActivityLoading && !activityStats ? (
                    <div className="py-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1246DF] dark:text-[#05BCD1]" />
                      <span>{t('Loading recent games...', 'جارٍ تحميل النشاط الأخير...')}</span>
                    </div>
                  ) : activityStats && activityStats.recentActivities.length > 0 ? (
                    <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-[#2A3B5C]">
                      {activityStats.recentActivities.map((act) => (
                        <div 
                          key={act.gameId}
                          className="pt-1.5 first:pt-0 flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-base shrink-0">{getSportIcon(act.sport)}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white truncate leading-tight">
                                {act.title}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {act.courtName ? `${act.courtName} • ` : ''}{getKuwaitAreaLabel(act.area || '', language) || t('Kuwait', 'الكويت')}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                              act.role === 'hosted'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-[#1246DF] dark:text-[#05BCD1] border border-blue-200 dark:border-blue-800'
                            }`}>
                              {act.role === 'hosted' ? t('Hosted', 'نظمها') : t('Played', 'لعبها')}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                              {act.date}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic py-1">
                      {t('No recent game activity found.', 'لا يوجد نشاط مباريات أخير.')}
                    </p>
                  )}

                  {activityError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{activityError}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bio Section */}
          {player.bio ? (
            <div className="bg-slate-50 dark:bg-[#1B253D] p-4 rounded-2xl border border-slate-200 dark:border-[#2A3B5C]">
              <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                <span>{t('About', 'نبذة')}</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {player.bio}
              </p>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#1B253D] p-3 rounded-2xl border border-slate-200 dark:border-[#2A3B5C] text-xs text-slate-400 italic">
              {t('No player bio provided yet.', 'لم يقم اللاعب بإضافة نبذة بعد.')}
            </div>
          )}

          {/* Favorite Sports & Skill Levels */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
              <span>{t('Sports & Skill Levels', 'الرياضات والمستوى')}</span>
            </h4>

            {player.favoriteSports && player.favoriteSports.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {player.favoriteSports.map((sport) => {
                  const skill = player.skills?.[sport] || 'Casual';
                  return (
                    <div 
                      key={sport}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C]"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getSportIcon(sport)}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">{getSportLabel(sport, language)}</span>
                      </div>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/60 text-[#1246DF] dark:text-[#05BCD1]">
                        {getSkillLabel(skill, language)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {t('No sports listed.', 'لم يتم تحديد رياضات مفضلة.')}
              </p>
            )}
          </div>

          {/* Community Info Notice */}
          <div className="p-3 bg-slate-50 dark:bg-[#1B253D] rounded-2xl border border-slate-200 dark:border-[#2A3B5C] flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1] shrink-0" />
            <span>
              {t(
                'Public athlete profile on La3ib Kuwait. Private account details and contact information are protected.',
                'ملف رياضي عام في مجتمع لعيب الكويت. البيانات الشخصية ومعلومات الاتصال محمية بالكامل.'
              )}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#1B253D] bg-slate-50 dark:bg-[#1B253D] flex items-center justify-end">
          <button
            onClick={() => setSelectedPlayerProfile(null)}
            className="px-5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#131C31] dark:hover:bg-[#253452] border border-slate-200 dark:border-[#2A3B5C] text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            {t('Close', 'إغلاق')}
          </button>
        </div>

        {/* Report Player Modal Overlay - Strict Flat */}
        {showReportModal && (
          <div 
            className="absolute inset-0 z-40 bg-slate-950/70 flex items-center justify-center p-4 overflow-y-auto"
            onClick={handleCloseReportModal}
          >
            <div 
              className="w-full max-w-md bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-3xl p-5 sm:p-6 space-y-4 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#1B253D]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('Report Player', 'الإبلاغ عن لاعب')}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                      {player.name} (@{player.username})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseReportModal}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1B253D] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  reportFeedback.includes('Thank you') || reportFeedback.includes('شكراً')
                    ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-[#1246DF] dark:text-[#05BCD1]'
                    : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reportFeedback}</span>
                </div>
              )}

              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                    {t('Why are you reporting this player?', 'ما هو سبب الإبلاغ عن هذا اللاعب؟')}
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {REPORT_REASONS.map((r) => (
                      <label 
                        key={r.key} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          selectedReason === r.key 
                            ? 'bg-blue-50 dark:bg-blue-950/40 border-[#1246DF] dark:border-[#05BCD1] text-[#1246DF] dark:text-[#05BCD1] font-semibold' 
                            : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="report_reason" 
                            checked={selectedReason === r.key}
                            onChange={() => setSelectedReason(r.key)}
                            className="text-[#1246DF] dark:text-[#05BCD1] focus:ring-0 bg-white dark:bg-[#131C31] border-slate-300 dark:border-slate-700"
                          />
                          <span>{t(r.en, r.ar)}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-1.5">
                    {t('Details (Optional):', 'تفاصيل إضافية (اختياري):')}
                  </label>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={t('Tell us more about the issue...', 'اشرح المشكلة بالتفصيل...')}
                    className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF] dark:focus:border-[#05BCD1]"
                  />
                  <span className="text-[10px] text-slate-400 block text-right">
                    {reportDetails.length}/1000
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1B253D]">
                  <button
                    type="button"
                    onClick={handleCloseReportModal}
                    disabled={isSubmittingReport}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-[#2A3B5C]"
                  >
                    {t('Cancel', 'إلغاء')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
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

        {/* Block Player Confirmation Dialog Overlay - Strict Flat */}
        {showBlockConfirm && (
          <div 
            className="absolute inset-0 z-40 bg-slate-950/70 flex items-center justify-center p-4"
            onClick={() => setShowBlockConfirm(false)}
          >
            <div 
              className="w-full max-w-sm bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-3xl p-6 text-center space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
                <Ban className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Block', 'حظر')} {player.name}?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {t(
                    'This player will no longer be able to discover your profile, follow you, send friend requests, or invite you to matches. Any existing friendships or follows will be permanently removed.',
                    'لن يتمكن هذا اللاعب من العثور على ملفك، متابعتك، إرسال طلبات صداقة، أو دعوتك للمباريات. ستتم إزالة الصداقة والمتابعة نهائياً.'
                  )}
                </p>
              </div>

              {blockFeedback && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {blockFeedback}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={isBlockLoading}
                  onClick={() => setShowBlockConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer border border-slate-200 dark:border-[#2A3B5C]"
                >
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  disabled={isBlockLoading}
                  onClick={handleBlockConfirm}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
