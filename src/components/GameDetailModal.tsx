import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Send, 
  Share2, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Megaphone,
  UserCheck,
  UserX,
  Settings,
  Sparkles,
  AlertCircle,
  Loader2,
  Lock,
  UserPlus,
  Search,
  Check,
  RotateCcw
} from 'lucide-react';
import { subscribeToGameChat, subscribeToGameInvitesForGame, calculateGameFinancialSummary } from '../lib/firebase';
import { ChatMessage, GameInvite, ReportReason, resolvePlayerAvatar } from '../types';

const GAME_REPORT_REASONS: { key: ReportReason; en: string; ar: string }[] = [
  { key: 'inappropriate_behavior', en: 'Inappropriate or offensive behavior', ar: 'سلوك مسيء أو غير لائق' },
  { key: 'scam_or_fraud', en: 'Fake game or financial scam', ar: 'مباراة وهمية أو احتيال مالي' },
  { key: 'unsafe_behavior', en: 'Unsafe venue or game conditions', ar: 'مكان أو ظروف غير آمنة للعب' },
  { key: 'spam', en: 'Spam or irrelevant listing', ar: 'إعلانات مزعجة أو غير ملائمة' },
  { key: 'fake_profile', en: 'Impersonation or false organizer', ar: 'انتحال شخصية أو منظم وهمي' },
  { key: 'harassment', en: 'Harassment in game or chat', ar: 'مضايقة أو إساءة في المباراة أو الشات' },
  { key: 'other', en: 'Other reason', ar: 'سبب آخر' },
];

export const GameDetailModal: React.FC = () => {
  const { 
    selectedGameForDetail, 
    setSelectedGameForDetail, 
    setSelectedGameForJoin,
    games,
    myGames,
    currentUser, 
    chats, 
    sendChatMessage, 
    leaveGame, 
    cancelGame,
    submitReport,
    reportItem,
    authStatus,
    isDemoActive,
    setAuthModalOpen,
    setAuthModalMode,
    players,
    friendIds,
    followingUserIds,
    sendGameInvite,
    cancelGameInvite,
    isGameInviteLoading,
    getGameInvitesForGame,
    t 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'organizer'>('details');
  const [chatInput, setChatInput] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [showAnnouncementBox, setShowAnnouncementBox] = useState(false);
  
  // Step 6: Standardized Game Report State
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReason>('inappropriate_behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Invite Players Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteSearchQuery, setInviteSearchQuery] = useState('');
  const [inviteFilter, setInviteFilter] = useState<'all' | 'friends' | 'following'>('all');
  const [firestoreInvitesMap, setFirestoreInvitesMap] = useState<Record<string, GameInvite>>({});
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Real-time Firestore chat state for Authenticated Mode
  const [firestoreMessages, setFirestoreMessages] = useState<ChatMessage[] | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derive active game properties safely even when selectedGameForDetail is null
  const selectedGameId = selectedGameForDetail?.id;
  const game = selectedGameId 
    ? ((myGames && myGames.find(g => g.id === selectedGameId)) ||
       games.find(g => g.id === selectedGameId) || 
       selectedGameForDetail)
    : null;

  const userUid = currentUser?.uid || currentUser?.id || '';

  const handleCloseReportForm = () => {
    setShowReportForm(false);
    setReportDetails('');
    setSelectedReportReason('inappropriate_behavior');
    setReportFeedback(null);
  };

  // Reset stale report form state on account switch or game change without clearing while composing
  const lastGameAndUserRef = useRef({ gameId: game?.id, userUid });
  useEffect(() => {
    if (lastGameAndUserRef.current.gameId !== game?.id || lastGameAndUserRef.current.userUid !== userUid) {
      lastGameAndUserRef.current = { gameId: game?.id, userUid };
      setReportDetails('');
      setSelectedReportReason('inappropriate_behavior');
      setReportFeedback(null);
      setShowReportForm(false);
    }
  }, [game?.id, userUid]);
  const organizerId = game?.organizer?.id || (game as any)?.organizerId || '';
  const isOrganizer = Boolean(game && organizerId && organizerId === userUid);
  const isJoined = Boolean(
    game && (
      (Array.isArray(game.participantIds) && game.participantIds.includes(userUid)) ||
      (Array.isArray(game.participants) && game.participants.some(p => p.userId === userUid || (p as any).id === userUid))
    )
  );
  const isParticipant = isOrganizer || isJoined;

  // Real-time onSnapshot subscription for authenticated participants
  useEffect(() => {
    // If modal is closed or game is null, reset chat state
    if (!game?.id) {
      setFirestoreMessages(null);
      setIsChatLoading(false);
      setChatError(null);
      return;
    }

    // Demo Mode or unauthenticated: do NOT attach Firestore listener
    if (authStatus !== 'authenticated' || isDemoActive || !userUid) {
      setFirestoreMessages(null);
      setIsChatLoading(false);
      setChatError(null);
      return;
    }

    // Only participants can read messages from Firestore
    if (!isParticipant) {
      setFirestoreMessages(null);
      setIsChatLoading(false);
      setChatError(null);
      return;
    }

    console.log(`[GameDetailModal] Subscribing to real-time chat for game ${game.id}`);
    setIsChatLoading(true);
    setChatError(null);
    let isSubscribed = true;

    const unsubscribe = subscribeToGameChat(
      game.id,
      (messages) => {
        if (!isSubscribed) return;
        setFirestoreMessages(messages);
        setIsChatLoading(false);
        setChatError(null);
      },
      (err) => {
        if (!isSubscribed) return;
        console.error('[GameDetailModal] Game chat error:', err);
        setIsChatLoading(false);
        setChatError(err?.message || 'Failed to load chat messages.');
      }
    );

    return () => {
      console.log(`[GameDetailModal] Unsubscribing from chat for game ${game.id}`);
      isSubscribed = false;
      unsubscribe();
    };
  }, [game?.id, isParticipant, authStatus, isDemoActive, userUid]);

  // Real-time onSnapshot subscription for game invites (organizer view)
  useEffect(() => {
    if (!game?.id || !isOrganizer || authStatus !== 'authenticated' || isDemoActive) {
      setFirestoreInvitesMap({});
      return;
    }

    console.log(`[GameDetailModal] Subscribing to game invites for game ${game.id}`);
    let isSubscribed = true;
    const unsubscribe = subscribeToGameInvitesForGame(
      game.id,
      (invites) => {
        if (!isSubscribed) return;
        setFirestoreInvitesMap(invites);
      },
      (err) => {
        console.warn('[GameDetailModal] Game invites subscription notice:', err);
      }
    );

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [game?.id, isOrganizer, authStatus, isDemoActive]);

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeTab === 'chat' && game?.id) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, firestoreMessages, game?.id ? chats[game.id] : undefined]);

  // Early return: Only AFTER all hooks have executed unconditionally
  if (!selectedGameForDetail || !game) {
    return null;
  }

  const spotsLeft = game.maxPlayers - (game.participants?.length || 0);

  // Resolve chat messages: Firestore when authenticated participant, local demo otherwise
  const isRealChatMode = authStatus === 'authenticated' && !isDemoActive && isParticipant;
  const gameChat = isRealChatMode 
    ? (firestoreMessages !== null ? firestoreMessages : [])
    : (chats[game.id] || []);

  // Organizer Financials using production helper
  const { totalCollectedKWD, organizerShareKWD } = calculateGameFinancialSummary(game.totalCourtCostKWD, game.participants);

  const handleCancelGame = async () => {
    if (!game?.id || isCancelling) return;
    if (!isOrganizer) {
      setActionError(t('Only the organizer can cancel this game.', 'فقط منظم المباراة يمكنه إلغاء هذه المباراة.'));
      return;
    }
    if (game.status === 'Cancelled') {
      setActionError(t('This game is already cancelled.', 'هذه المباراة ملغاة بالفعل.'));
      return;
    }

    try {
      setIsCancelling(true);
      setActionError(null);
      setLeaveError(null);
      setActionSuccess(null);
      await cancelGame(game.id, 'Organizer initiated match cancellation');
      setActionSuccess(t('Match cancelled successfully. All participant records and history have been preserved.', 'تم إلغاء المباراة بنجاح. تم حفظ سجلات اللاعبين والتاريخ.'));
    } catch (err: any) {
      console.error('[GameDetailModal] Cancel game failed:', err);
      setActionError(err?.message || t('Failed to cancel game. Please try again.', 'فشل في إلغاء المباراة. يرجى المحاولة مرة أخرى.'));
    } finally {
      setIsCancelling(false);
    }
  };

  const handleLeaveGame = async () => {
    if (isOrganizer) {
      setLeaveError(t('The game organizer cannot leave the game. You can cancel the game instead.', 'لا يمكن لمنظم المباراة المغادرة كلاعب. يمكنك إلغاء المباراة بدلاً من ذلك.'));
      return;
    }
    if (game.status === 'Cancelled') {
      setLeaveError(t('This game has been cancelled.', 'هذه المباراة ملغاة بالفعل.'));
      return;
    }
    setIsLeaving(true);
    setLeaveError(null);
    setActionError(null);
    setActionSuccess(null);
    try {
      await leaveGame(game.id);
    } catch (err: any) {
      console.error('[GameDetailModal] Leave game failed:', err);
      setLeaveError(err?.message || 'Failed to leave match. Please try again.');
    } finally {
      setIsLeaving(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;
    const textToSend = chatInput.trim();
    setChatInput('');
    setChatError(null);
    try {
      setIsSendingMessage(true);
      await sendChatMessage(game.id, textToSend, false);
    } catch (err: any) {
      console.error('[GameDetailModal] Failed to send chat message:', err);
      setChatError(err?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim() || isSendingMessage) return;
    const textToSend = announcementInput.trim();
    setAnnouncementInput('');
    setShowAnnouncementBox(false);
    setChatError(null);
    try {
      setIsSendingMessage(true);
      await sendChatMessage(game.id, textToSend, true);
    } catch (err: any) {
      console.error('[GameDetailModal] Failed to send announcement:', err);
      setChatError(err?.message || 'Failed to send announcement.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authStatus !== 'authenticated' && !isDemoActive) {
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    try {
      setIsSubmittingReport(true);
      setReportFeedback(null);
      await submitReport({
        reportedGameId: game.id,
        reason: selectedReportReason,
        details: reportDetails.trim() || undefined
      });
      setReportFeedback(t('Report submitted. Our moderation team is reviewing this match.', 'تم إرسال البلاغ بنجاح. فريق الإشراف يقوم بمراجعة المباراة.'));
      setTimeout(() => {
        handleCloseReportForm();
      }, 1500);
    } catch (err: any) {
      console.error('[GameDetailModal] Report submission error:', err);
      setReportFeedback(err?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <span className="text-xl">
              {game.sport === 'Football' ? '⚽' : game.sport === 'Padel' ? '🎾' : game.sport === 'Basketball' ? '🏀' : '🏆'}
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white truncate max-w-md">
                {game.title}
              </h2>
              <p className="text-xs text-neutral-400">
                {game.courtName} • <span className="text-emerald-400 font-semibold">{game.area}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setReportDetails('');
                setSelectedReportReason('inappropriate_behavior');
                setReportFeedback(null);
                setShowReportForm(true);
              }}
              className="p-2 rounded-full hover:bg-neutral-800 text-neutral-500 hover:text-red-400 transition-colors"
              title="Report Game"
            >
              <ShieldAlert className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSelectedGameForDetail(null)}
              className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher: Details & Roster vs Game Chat vs Organizer Panel */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'details'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {t('Details & Roster', 'التفاصيل وقائمة اللاعبين')} ({game.participants.length}/{game.maxPlayers})
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t('Game Chat', 'شات المباراة')}</span>
            {gameChat.length > 0 && (
              <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.2 rounded-full">
                {gameChat.length}
              </span>
            )}
          </button>

          {isOrganizer && (
            <button
              onClick={() => setActiveTab('organizer')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'organizer'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-neutral-400 hover:text-amber-300'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{t('Organizer Dashboard', 'لوحة المنظم المالية')}</span>
            </button>
          )}
        </div>

        {/* Success notification banner if match cancellation succeeds */}
        {actionSuccess && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/80 border border-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1 font-semibold">{actionSuccess}</span>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-400 hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error notification banner if leave or cancel action fails */}
        {(actionError || leaveError) && (
          <div className="mx-6 mt-4 p-3 bg-red-950/80 border border-red-800 rounded-2xl flex items-center gap-2.5 text-xs text-red-300 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1 font-semibold">{actionError || leaveError}</span>
            <button
              onClick={() => {
                setActionError(null);
                setLeaveError(null);
              }}
              className="text-red-400 hover:text-white text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Tabs */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DETAILS & ROSTER */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Date', 'التاريخ')}</span>
                  <span className="text-xs font-bold text-white mt-0.5 block">{game.date}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Time', 'الوقت')}</span>
                  <span className="text-xs font-bold text-white mt-0.5 block">{game.startTime} - {game.endTime}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Share / Player', 'حصة اللاعب')}</span>
                  <span className="text-xs font-black text-emerald-400 mt-0.5 block">{game.pricePerPlayerKWD.toFixed(3)} KWD</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Skill & Gender', 'المستوى')}</span>
                  <span className="text-xs font-bold text-white mt-0.5 block">{game.skillLevel} • {game.gender}</span>
                </div>
              </div>

              {/* Description */}
              {game.description && (
                <div className="bg-neutral-950/60 p-4 rounded-2xl border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                    {t('Organizer Message', 'ملاحظات المنظم')}
                  </span>
                  <p className="text-xs text-neutral-200 leading-relaxed">
                    {game.description}
                  </p>
                </div>
              )}

              {/* Organizer Card */}
              <div className="flex items-center justify-between p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800">
                <div className="flex items-center gap-3">
                  <img 
                    src={resolvePlayerAvatar(game.organizer)} 
                    alt={game.organizer.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/40"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{game.organizer.name}</span>
                      <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                        {t('Host', 'المنظم')}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      @{game.organizer.username} • {game.organizer.attendanceRate}% {t('Attendance', 'حضور')}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-neutral-400">
                  {game.organizer.gamesHosted} {t('hosted', 'مباريات مستضافة')}
                </span>
              </div>

              {/* Player Roster Section with Payment Status (Section 5 & 6) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                    {t('Player Roster & Payment Status', 'قائمة اللاعبين وحالة الدفع')}
                  </h4>
                  <div className="flex items-center gap-2">
                    {isOrganizer && game.status !== 'Cancelled' && game.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() => {
                          setInviteError(null);
                          setShowInviteModal(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{t('Invite Players', 'دعوة لاعبين')}</span>
                      </button>
                    )}
                    <span className="text-xs font-bold text-emerald-400">
                      {game.participants.length} / {game.maxPlayers} {t('Confirmed', 'مؤكد')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Confirmed Players */}
                  {game.participants.map((player, idx) => (
                    <div 
                      key={player.userId + idx}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={resolvePlayerAvatar(player as any)} 
                          alt={player.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-700"
                        />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{player.name}</span>
                            {player.userId === game.organizer.id && (
                              <span className="text-[9px] text-amber-400 bg-amber-950/60 px-1 rounded">Host</span>
                            )}
                          </p>
                          <p className="text-[10px] text-neutral-500">{player.skill}</p>
                        </div>
                      </div>

                      {/* Payment Status Pill */}
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{t('Paid ✓', 'تم الدفع ✓')}</span>
                        </span>
                        <span className="text-[9px] text-neutral-500 block mt-0.5">
                          {player.paidAmountKWD.toFixed(3)} KWD ({player.paymentMethod || 'KNET'})
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Empty Spots */}
                  {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
                    <div 
                      key={'empty-' + i}
                      className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/40 border border-dashed border-neutral-800/80 text-neutral-500"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-neutral-900 border border-dashed border-neutral-700 flex items-center justify-center text-xs font-bold">
                          {game.participants.length + i + 1}
                        </div>
                        <span className="text-xs font-semibold">{t('Open Spot', 'مكان شاغر')}</span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-400/70">
                        {game.pricePerPlayerKWD.toFixed(3)} KWD
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GAME CHAT */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[400px]">
              {/* Authenticated Mode: Access protection for non-participants */}
              {authStatus === 'authenticated' && !isDemoActive && !isParticipant ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-neutral-700 text-neutral-400 flex items-center justify-center">
                    <Lock className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-base font-bold text-white">
                      {t('Game Chat is for Confirmed Players', 'شات المباراة مخصص للمشاركين فقط')}
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {t(
                        'Join this match to coordinate team jerseys, arrival time, parking, and chat with fellow players in real time.',
                        'انضم إلى هذه المباراة للتنسيق مع باقي اللاعبين ومناقشة تفاصيل الحضور وألوان الملابس في الشات المباشر.'
                      )}
                    </p>
                  </div>
                  {game.status !== 'Full' && game.status !== 'Completed' && game.status !== 'Cancelled' && (
                    <button
                      onClick={() => setSelectedGameForJoin(game)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                    >
                      {t('Join Match to Access Chat', 'انضم للمباراة لتفعيل الشات')}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Pinned announcement banner for organizer */}
                  {isOrganizer && (
                    <div className="mb-3">
                      {!showAnnouncementBox ? (
                        <button
                          onClick={() => setShowAnnouncementBox(true)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-950/40 hover:bg-amber-950/60 border border-amber-800/50 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Megaphone className="w-4 h-4 text-amber-400" />
                          <span>{t('Broadcast Organizer Announcement', 'إرسال إعلان هام لجميع اللاعبين')}</span>
                        </button>
                      ) : (
                        <form onSubmit={handleSendAnnouncement} className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold text-amber-300">
                            <span>{t('Pinned Announcement', 'إعلان مثبت')}</span>
                            <button type="button" onClick={() => setShowAnnouncementBox(false)} className="text-neutral-400 cursor-pointer">✕</button>
                          </div>
                          <input 
                            type="text"
                            value={announcementInput}
                            onChange={(e) => setAnnouncementInput(e.target.value)}
                            placeholder="e.g. Guys, please arrive 15 minutes early at Gate 3..."
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white"
                            disabled={isSendingMessage}
                          />
                          <button 
                            type="submit" 
                            disabled={isSendingMessage || !announcementInput.trim()}
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                          >
                            {isSendingMessage ? t('Posting...', 'جاري النشر...') : t('Post Announcement', 'نشر الإعلان')}
                          </button>
                        </form>
                      )}
                    </div>
                  )}

                  {/* Chat Error Banner */}
                  {chatError && (
                    <div className="mb-2 p-2.5 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span className="flex-1">{chatError}</span>
                      <button onClick={() => setChatError(null)} className="text-red-400 hover:text-white text-xs">✕</button>
                    </div>
                  )}

                  {/* Chat Message Stream */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {isChatLoading ? (
                      <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                        <span className="text-xs">{t('Loading real-time chat messages...', 'جاري تحميل رسائل الشات المباشرة...')}</span>
                      </div>
                    ) : gameChat.length === 0 ? (
                      <div className="text-center py-14 text-neutral-500 text-xs space-y-1">
                        <MessageSquare className="w-8 h-8 text-neutral-700 mx-auto mb-1" />
                        <p>{t('No messages yet. Say salam to the team!', 'لا توجد رسائل بعد. سلم على الشباب!')}</p>
                      </div>
                    ) : (
                      gameChat.map((msg) => {
                        const isMe = msg.senderId === userUid;
                        const avatar = msg.senderPhotoURL || msg.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';
                        return (
                          <div 
                            key={msg.id}
                            className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                          >
                            {!isMe && (
                              <img 
                                src={avatar} 
                                alt={msg.senderName}
                                className="w-7 h-7 rounded-full object-cover shrink-0 mt-1 ring-1 ring-neutral-700"
                              />
                            )}
                            <div 
                              className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                                msg.isAnnouncement
                                  ? 'bg-amber-950/80 border border-amber-800 text-amber-200'
                                  : isMe
                                  ? 'bg-emerald-600 text-white rounded-tr-none'
                                  : 'bg-neutral-800 text-neutral-200 rounded-tl-none'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className={`font-bold text-[10px] ${msg.isAnnouncement ? 'text-amber-400' : isMe ? 'text-emerald-200' : 'text-neutral-400'}`}>
                                  {msg.senderName}
                                </span>
                                <span className="text-[9px] opacity-70">{msg.timestamp}</span>
                              </div>
                              <p className="break-words">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input Bar */}
                  <form onSubmit={handleSendMessage} className="pt-3 mt-2 border-t border-neutral-800 flex gap-2">
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={t('Message the match group (parking, jerseys, arrival)...', 'اكتب رسالة للمجموعة (المواقف، الملابس، الوصول)...')}
                      className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none"
                      disabled={isSendingMessage}
                    />
                    <button
                      type="submit"
                      disabled={isSendingMessage || !chatInput.trim()}
                      className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-neutral-950 font-bold transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {isSendingMessage ? (
                        <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          )}

          {/* TAB 3: ORGANIZER DASHBOARD */}
          {activeTab === 'organizer' && isOrganizer && (
            <div className="space-y-6">
              {/* Financial Balance Overview (Prompt Section 6 & 13) */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {t('Booking Financial Reconciliation', 'التسوية المالية وتغطية تكلفة الملعب')}
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-neutral-900 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-400 block">{t('Court Cost', 'تكلفة الملعب')}</span>
                    <span className="text-sm font-black text-white">{game.totalCourtCostKWD.toFixed(3)} KWD</span>
                  </div>
                  <div className="bg-neutral-900 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-400 block">{t('Players Joined', 'اللاعبين المسجلين')}</span>
                    <span className="text-sm font-black text-white">{game.participants.length}/{game.maxPlayers}</span>
                  </div>
                  <div className="bg-neutral-900 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-400 block">{t('Total Collected', 'المبلغ المحصل')}</span>
                    <span className="text-sm font-black text-emerald-400">{totalCollectedKWD.toFixed(3)} KWD</span>
                  </div>
                  <div className="bg-neutral-900 p-3 rounded-xl">
                    <span className="text-[10px] text-neutral-400 block">{t('Your Remaining Share', 'حصتك المتبقية')}</span>
                    <span className="text-sm font-black text-amber-400">{organizerShareKWD.toFixed(3)} KWD</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-neutral-300">
                  ✓ {t(
                    'All collections via KNET & Apple Pay are credited directly to your registered Kuwait bank account.',
                    'جميع المبالغ المحصلة عبر كي نت وApple Pay تودع مباشرة في حسابك البنكي المسجل في الكويت.'
                  )}
                </div>
              </div>

              {/* Organizer Controls */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-neutral-300 uppercase">
                  {t('Match Administration', 'إدارة وتعديل المباراة')}
                </h5>
                <div className="flex flex-wrap gap-2">
                  {game.status !== 'Cancelled' && game.status !== 'Completed' && (
                    <button
                      type="button"
                      onClick={() => {
                        setInviteError(null);
                        setShowInviteModal(true);
                      }}
                      className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{t('Invite Players', 'دعوة لاعبين')}</span>
                    </button>
                  )}
                  <button
                    onClick={handleCancelGame}
                    disabled={isCancelling || game.status === 'Cancelled'}
                    className="py-2.5 px-4 rounded-xl bg-red-950/50 hover:bg-red-900/60 border border-red-800/60 text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{game.status === 'Cancelled' ? t('Match Cancelled', 'المباراة ملغاة') : t('Cancel Match', 'إلغاء المباراة')}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-neutral-400 block uppercase">{t('Price Per Player', 'حصة كل لاعب')}</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white">{game.pricePerPlayerKWD.toFixed(3)}</span>
              <span className="text-xs font-bold text-emerald-400">KWD</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {game.status === 'Cancelled' ? (
              <div className="px-5 py-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span>{t('Match Cancelled', 'المباراة ملغاة')}</span>
              </div>
            ) : isOrganizer ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelGame}
                  disabled={isCancelling}
                  className="px-4 py-2.5 rounded-xl bg-red-950/70 hover:bg-red-900/80 border border-red-800 hover:border-red-700 text-red-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isCancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isCancelling ? t('Cancelling...', 'جارِ الإلغاء...') : t('Cancel Match', 'إلغاء المباراة')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black transition-colors cursor-pointer"
                >
                  {t('Open Chat', 'فتح الشات')}
                </button>
              </div>
            ) : isJoined ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLeaveGame}
                  disabled={isLeaving}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-red-950/70 border border-neutral-700 hover:border-red-800 text-neutral-300 hover:text-red-300 text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isLeaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isLeaving ? t('Leaving...', 'جارِ المغادرة...') : t('Leave Match', 'مغادرة المباراة')}</span>
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-black transition-colors cursor-pointer"
                >
                  {t('Open Chat', 'فتح الشات')}
                </button>
              </div>
            ) : spotsLeft <= 0 ? (
              <button
                disabled
                className="px-6 py-2.5 rounded-xl bg-neutral-800 text-neutral-500 text-xs font-bold cursor-not-allowed"
              >
                {t('Game Full', 'المباراة ممتلئة')}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (authStatus !== 'authenticated' && !isDemoActive) {
                    setAuthModalMode('login');
                    setAuthModalOpen(true);
                    return;
                  }
                  setSelectedGameForJoin(game);
                }}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 text-xs font-black shadow-lg shadow-emerald-500/20 cursor-pointer transition-transform transform active:scale-95"
              >
                {t('Join Game & Pay Share', 'انضم وسدد حصتك')} ({game.pricePerPlayerKWD.toFixed(3)} KWD)
              </button>
            )}
          </div>
        </div>

        {/* Reporting Modal overlay (Step 6) */}
        {showReportForm && (
          <div 
            className="absolute inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={handleCloseReportForm}
          >
            <div 
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      {t('Report Game / Organizer', 'الإبلاغ عن المباراة أو المنظم')}
                    </h4>
                    <p className="text-[11px] text-neutral-400 truncate max-w-[200px]">
                      {game.title}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleCloseReportForm} 
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reportFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  reportFeedback.includes('submitted') || reportFeedback.includes('بنجاح')
                    ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-300'
                    : 'bg-red-950/80 border border-red-800/80 text-red-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reportFeedback}</span>
                </div>
              )}

              <form onSubmit={handleReport} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-300 block mb-2">
                    {t('Why are you reporting this game?', 'ما هو سبب الإبلاغ عن هذه المباراة؟')}
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {GAME_REPORT_REASONS.map((r) => (
                      <label 
                        key={r.key} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          selectedReportReason === r.key 
                            ? 'bg-emerald-950/40 border-emerald-700/80 text-emerald-300 font-semibold' 
                            : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-300 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="game_report_reason" 
                            checked={selectedReportReason === r.key}
                            onChange={() => setSelectedReportReason(r.key)}
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
                    onClick={handleCloseReportForm} 
                    disabled={isSubmittingReport}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {t('Cancel', 'إلغاء')}
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSubmittingReport}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
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

        {/* Invite Players Modal overlay (Step 4) */}
        {showInviteModal && (
          <div className="absolute inset-0 z-30 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
              className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full max-h-[85vh] flex flex-col space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      {t('Invite Players to Match', 'دعوة لاعبين للمباراة')}
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {game.title} • {spotsLeft > 0 ? `${spotsLeft} ${t('spots left', 'أماكن شاغرة')}` : t('Game Full', 'المباراة ممتلئة')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Error notice */}
              {inviteError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-xs text-red-300 flex items-center justify-between">
                  <span>{inviteError}</span>
                  <button onClick={() => setInviteError(null)} className="text-red-400 hover:text-red-200">✕</button>
                </div>
              )}

              {/* Search & Filter Controls */}
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={inviteSearchQuery}
                    onChange={(e) => setInviteSearchQuery(e.target.value)}
                    placeholder={t('Search by player name, username, or area...', 'ابحث باسم اللاعب، اسم المستخدم، أو المنطقة...')}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
                  />
                  {inviteSearchQuery && (
                    <button
                      onClick={() => setInviteSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter tabs: All Discoverable | Friends | Followed */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setInviteFilter('all')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      inviteFilter === 'all'
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    {t('All Players', 'جميع اللاعبين')}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteFilter('friends')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      inviteFilter === 'friends'
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>{t('My Friends', 'أصدقائي')}</span>
                    {friendIds.size > 0 && <span className="opacity-80">({friendIds.size})</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteFilter('following')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                      inviteFilter === 'following'
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    <Users className="w-3 h-3" />
                    <span>{t('Following', 'المتابعون')}</span>
                    {followingUserIds.size > 0 && <span className="opacity-80">({followingUserIds.size})</span>}
                  </button>
                </div>
              </div>

              {/* Player List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-neutral-800/40">
                {(() => {
                  const activeInvites = authStatus === 'authenticated'
                    ? firestoreInvitesMap
                    : getGameInvitesForGame(game.id);

                  // Filter eligible players
                  const eligiblePlayers = players.filter(player => {
                    const pid = player.id || player.uid || '';
                    // 1. Cannot invite yourself (organizer)
                    if (pid === userUid) return false;

                    // 2. Tab filter
                    if (inviteFilter === 'friends' && !friendIds.has(pid)) return false;
                    if (inviteFilter === 'following' && !followingUserIds.has(pid)) return false;

                    // 3. Search query
                    if (inviteSearchQuery.trim()) {
                      const q = inviteSearchQuery.toLowerCase().trim();
                      const matchName = player.name?.toLowerCase().includes(q) ?? false;
                      const matchUsername = player.username?.toLowerCase().includes(q) ?? false;
                      const matchArea = player.area?.toLowerCase().includes(q) ?? false;
                      if (!matchName && !matchUsername && !matchArea) return false;
                    }

                    return true;
                  });

                  if (eligiblePlayers.length === 0) {
                    return (
                      <div className="text-center py-10 space-y-2 text-neutral-500 text-xs">
                        <Users className="w-8 h-8 mx-auto text-neutral-700" />
                        <p>{t('No players found matching your criteria.', 'لم يتم العثور على لاعبين مطابقين للبحث.')}</p>
                      </div>
                    );
                  }

                  const isGameFull = (game.participants?.length || 0) >= game.maxPlayers || game.status === 'Full';

                  return eligiblePlayers.map((player) => {
                    const pid = player.id || player.uid || '';
                    const invite = activeInvites[pid];
                    const isLoading = isGameInviteLoading(game.id, pid);

                    // Check if already in game
                    const isAlreadyInGame = (Array.isArray(game.participantIds) && game.participantIds.includes(pid)) ||
                      (Array.isArray(game.participants) && game.participants.some(p => p.userId === pid || (p as any).id === pid));

                    const skillInSport = player.skills?.[game.sport] || 'Casual';

                    return (
                      <div
                        key={pid}
                        className="pt-2 flex items-center justify-between gap-3 p-2 rounded-2xl hover:bg-neutral-950/60 transition-colors"
                      >
                        {/* Player Info */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <img
                            src={resolvePlayerAvatar(player)}
                            alt={player.name}
                            className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-white truncate">{player.name}</span>
                              {friendIds.has(pid) && (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                                  {t('Friend', 'صديق')}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-neutral-400 font-mono truncate">
                              @{player.username} • {player.area}
                            </p>
                            <span className="text-[10px] text-neutral-400 font-medium block">
                              {game.sport}: <span className="text-emerald-400 font-bold">{skillInSport}</span>
                            </span>
                          </div>
                        </div>

                        {/* Invite Actions: Joined / Invited (Cancel) / Invite Again / Invite */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isAlreadyInGame || invite?.status === 'accepted' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400 bg-neutral-950 border border-neutral-800 px-3 py-1.5 rounded-xl">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{t('Joined', 'منضم')}</span>
                            </span>
                          ) : invite?.status === 'pending' ? (
                            <div className="flex items-center gap-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1.5 rounded-xl">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{t('Invited', 'تمت الدعوة')}</span>
                              </span>
                              <button
                                type="button"
                                disabled={isLoading}
                                onClick={async () => {
                                  try {
                                    setInviteError(null);
                                    await cancelGameInvite(game.id, pid);
                                  } catch (err: any) {
                                    setInviteError(err?.message || 'Failed to cancel invite.');
                                  }
                                }}
                                className="px-2 py-1.5 rounded-xl bg-neutral-800 hover:bg-red-950/60 hover:text-red-400 text-neutral-400 text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50"
                                title={t('Cancel invite', 'إلغاء الدعوة')}
                              >
                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>{t('Cancel', 'إلغاء')}</span>}
                              </button>
                            </div>
                          ) : invite?.status === 'declined' ? (
                            <button
                              type="button"
                              disabled={isLoading || isGameFull}
                              onClick={async () => {
                                try {
                                  setInviteError(null);
                                  await sendGameInvite(game.id, pid);
                                } catch (err: any) {
                                  setInviteError(err?.message || 'Failed to invite player.');
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-200 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 px-3 py-1.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <RotateCcw className="w-3 h-3 text-amber-400" />
                                  <span>{t('Invite Again', 'إعادة الدعوة')}</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isLoading || isGameFull}
                              onClick={async () => {
                                try {
                                  setInviteError(null);
                                  await sendGameInvite(game.id, pid);
                                } catch (err: any) {
                                  setInviteError(err?.message || 'Failed to invite player.');
                                }
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-950 bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>{t('Invite', 'دعوة')}</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
