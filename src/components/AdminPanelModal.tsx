import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ReportItem, 
  ReportDocument, 
  ModerationLogEntry, 
  ModerationAction, 
  ModerationTargetType, 
  SportType, 
  KuwaitArea 
} from '../types';
import { 
  ShieldCheck, 
  X, 
  Users, 
  AlertTriangle, 
  Activity, 
  CheckCircle, 
  Ban, 
  DollarSign, 
  Calendar,
  Building2,
  Trash2,
  Check,
  Database,
  Cloud,
  RefreshCw,
  Info,
  Eye,
  FileText,
  AlertCircle,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  ArrowRight,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Lock,
  ExternalLink,
  MapPin,
  Flame,
  Award,
  Sparkles
} from 'lucide-react';
import { 
  isFirebaseConfigured, 
  testFirebaseConnection,
  FirebaseTestReport,
  fetchTargetModerationHistory
} from '../lib/firebase';
import { 
  migrateLocalStateToFirestore, 
  MigrationStatus 
} from '../lib/migration';
import { formatTime12Hour, formatTimeRange12Hour } from '../types';

export const AdminPanelModal: React.FC = () => {
  const { 
    adminModalOpen, 
    setAdminModalOpen, 
    currentUser,
    games, 
    players, 
    courts, 
    reports, 
    moderationReports,
    isModerationLoading,
    moderationLogs,
    reviewModerationReport,
    resolveModerationReport,
    dismissModerationReport,
    moderateGameCancellation,
    setAthleteOrganizingStatus,
    refreshModerationQueue,
    cancelGame,
    continueAsDemo,
    isDemoActive,
    language,
    t 
  } = useApp();

  const [activeAdminSection, setActiveAdminSection] = useState<'overview' | 'reports' | 'games' | 'users' | 'audit'>('overview');
  const [resolvedReportIds, setResolvedReportIds] = useState<string[]>([]);
  const [dismissedReportIds, setDismissedReportIds] = useState<string[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed'>('all');
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Phase 2: Case Investigation Drawer State
  const [inspectingCase, setInspectingCase] = useState<(ReportDocument | ReportItem) | null>(null);
  const [caseTargetLogs, setCaseTargetLogs] = useState<ModerationLogEntry[]>([]);
  const [isCaseLogsLoading, setIsCaseLogsLoading] = useState(false);

  // In-modal dialog state for Resolve & Take Action or Dismiss
  const [actionDialog, setActionDialog] = useState<{
    type: 'resolve' | 'dismiss';
    reportId: string;
    targetLabel: string;
    targetType: 'user' | 'game' | 'report';
    targetId: string;
    reason: string;
    inputText: string;
  } | null>(null);

  // Phase 4: Game Cancellation Dialog (replaces window.prompt)
  const [gameCancelDialog, setGameCancelDialog] = useState<{
    gameId: string;
    gameTitle: string;
    reason: string;
  } | null>(null);

  // Phase 3: Athlete Organizing Restriction Dialog
  const [athletePrivilegeDialog, setAthletePrivilegeDialog] = useState<{
    userId: string;
    userName: string;
    currentCanOrganize: boolean;
    reason: string;
  } | null>(null);

  // Phase 4: Game Filter States
  const [gameSearchTerm, setGameSearchTerm] = useState('');
  const [gameSportFilter, setGameSportFilter] = useState<string>('all');
  const [gameStatusFilter, setGameStatusFilter] = useState<string>('all');
  const [expandedRosterGameId, setExpandedRosterGameId] = useState<string | null>(null);

  // Phase 3: Player Management States
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'organizers' | 'restricted'>('all');

  // Phase 5: Audit Log States
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditTargetTypeFilter, setAuditTargetTypeFilter] = useState<string>('all');

  // Firebase testing and migration states
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<FirebaseTestReport | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);

  const isRealAdmin = Boolean(currentUser.isAdmin && !currentUser.isDemoUser);

  // Active reports list based on active mode
  const activeReportsList: (ReportDocument | ReportItem)[] = useMemo(() => {
    if (isRealAdmin) {
      return reportFilter === 'all' 
        ? moderationReports 
        : moderationReports.filter(r => r.status === reportFilter);
    }
    return reportFilter === 'all'
      ? reports
      : reports.filter((r: any) => {
          const s = dismissedReportIds.includes(r.id) ? 'dismissed' : (resolvedReportIds.includes(r.id) ? 'resolved' : (r.status || 'open'));
          return s === reportFilter;
        });
  }, [isRealAdmin, reportFilter, moderationReports, reports, dismissedReportIds, resolvedReportIds]);

  // Load target moderation history when opening case file
  useEffect(() => {
    if (!inspectingCase) {
      setCaseTargetLogs([]);
      return;
    }

    const isReal = 'reporterId' in inspectingCase;
    const targetId = isReal 
      ? ((inspectingCase as ReportDocument).reportedUserId || (inspectingCase as ReportDocument).reportedGameId)
      : (inspectingCase as ReportItem).targetId;

    if (!targetId) {
      setCaseTargetLogs([]);
      return;
    }

    if (isRealAdmin) {
      setIsCaseLogsLoading(true);
      fetchTargetModerationHistory(targetId, 10)
        .then(logs => setCaseTargetLogs(logs))
        .catch(err => {
          console.warn('Could not load case target history:', err);
          setCaseTargetLogs([]);
        })
        .finally(() => setIsCaseLogsLoading(false));
    } else {
      // Demo Mode: Filter from local moderationLogs
      const demoTargetLogs = moderationLogs.filter(l => l.targetId === targetId);
      setCaseTargetLogs(demoTargetLogs);
    }
  }, [inspectingCase, isRealAdmin, moderationLogs]);

  // =========================================================================
  // Phase 1: Operational Telemetry & Bounded Analytics
  // =========================================================================
  const allCurrentReports = isRealAdmin ? moderationReports : reports;
  const openReportsCount = isRealAdmin
    ? moderationReports.filter(r => r.status === 'open').length
    : reports.filter((r: any) => !resolvedReportIds.includes(r.id) && !dismissedReportIds.includes(r.id) && r.status !== 'reviewing').length;

  const reviewingReportsCount = isRealAdmin
    ? moderationReports.filter(r => r.status === 'reviewing').length
    : reports.filter((r: any) => r.status === 'reviewing' && !resolvedReportIds.includes(r.id) && !dismissedReportIds.includes(r.id)).length;

  const resolvedReportsCount = isRealAdmin
    ? moderationReports.filter(r => r.status === 'resolved').length
    : reports.filter((r: any) => resolvedReportIds.includes(r.id) || r.status === 'resolved').length;

  const dismissedReportsCount = isRealAdmin
    ? moderationReports.filter(r => r.status === 'dismissed').length
    : reports.filter((r: any) => dismissedReportIds.includes(r.id) || r.status === 'dismissed').length;

  const pendingSafetyQueue = openReportsCount + reviewingReportsCount;

  // Urgent reports (Harassment, Unsafe Behavior, Fraud)
  const urgentReportsCount = allCurrentReports.filter((r: any) => {
    const reason = r.reason?.toLowerCase() || '';
    const status = isRealAdmin 
      ? r.status 
      : (dismissedReportIds.includes(r.id) ? 'dismissed' : (resolvedReportIds.includes(r.id) ? 'resolved' : (r.status || 'open')));
    return (status === 'open' || status === 'reviewing') && 
      (reason.includes('harass') || reason.includes('unsafe') || reason.includes('fraud') || reason.includes('scam'));
  }).length;

  // Live match capacity metrics
  const activeMatchesList = games.filter(g => g.status !== 'Cancelled');
  const totalSpotsOccupied = activeMatchesList.reduce((acc, g) => acc + g.participants.length, 0);
  const totalCapacityAvailable = activeMatchesList.reduce((acc, g) => acc + g.maxPlayers, 0);
  const platformCapacityRate = totalCapacityAvailable > 0 
    ? Math.round((totalSpotsOccupied / totalCapacityAvailable) * 100) 
    : 0;
  const liveWindowVolumeKWD = activeMatchesList.reduce((acc, g) => acc + g.totalCourtCostKWD, 0);

  // 24-Hour Moderation Velocity
  const oneDayAgoMs = Date.now() - 24 * 60 * 60 * 1000;
  const velocity24h = moderationLogs.filter(l => {
    const logTime = new Date(l.createdAtISO || l.createdAt).getTime();
    return !isNaN(logTime) && logTime >= oneDayAgoMs;
  }).length;

  // Reason Breakdown
  const reasonBreakdown = allCurrentReports.reduce((acc, r: any) => {
    const rawReason = (r.reason || 'other').toLowerCase();
    let key = 'other';
    if (rawReason.includes('harass')) key = 'harassment';
    else if (rawReason.includes('unsafe')) key = 'unsafe_behavior';
    else if (rawReason.includes('fake')) key = 'fake_profile';
    else if (rawReason.includes('fraud') || rawReason.includes('scam')) key = 'scam_or_fraud';
    else if (rawReason.includes('spam')) key = 'spam';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // =========================================================================
  // Action Handlers
  // =========================================================================
  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    setFirebaseTestResult(null);
    try {
      const res = await testFirebaseConnection();
      setFirebaseTestResult(res);
    } catch (err) {
      setFirebaseTestResult({
        connected: false,
        message: err instanceof Error ? err.message : String(err),
        projectId: 'influential-odyssey-hggh3',
        databaseId: 'ai-studio-la3ib-c2efd6fd-7a67-4343-b3f5-86cd82af971d',
        storageBucket: 'influential-odyssey-hggh3.firebasestorage.app',
        authConnected: false,
        firestoreConnected: false,
        firestoreWriteSuccess: false,
        firestoreReadSuccess: false,
        storageConnected: false,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const handleRunMigration = async () => {
    if (!confirm(t('Are you sure you want to sync all local data to the cloud database?', 'هل أنت متأكد من رغبتك في مزامنة البيانات المحلية مع قاعدة البيانات السحابية؟'))) {
      return;
    }
    await migrateLocalStateToFirestore(status => {
      setMigrationStatus(status);
    });
  };

  // Moderation: Review report
  const handleReviewReport = async (reportId: string) => {
    setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
    setActionError(null);
    try {
      await reviewModerationReport(reportId);
      setActionFeedback(t('Report marked as reviewing.', 'تم وضع البلاغ قيد المراجعة.'));
      if (inspectingCase && inspectingCase.id === reportId) {
        setInspectingCase(prev => prev ? { ...prev, status: 'reviewing' } as any : null);
      }
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to review report:', err);
      setActionError(err?.message || t('Failed to review report.', 'فشل بدء مراجعة البلاغ.'));
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Open in-modal dialogs for interactive action confirmation
  const openResolveDialog = (
    reportId: string, 
    targetLabel: string, 
    targetType: 'user' | 'game' | 'report', 
    targetId: string, 
    reason: string
  ) => {
    setActionError(null);
    setActionDialog({
      type: 'resolve',
      reportId,
      targetLabel,
      targetType,
      targetId,
      reason,
      inputText: targetType === 'game'
        ? 'Match content investigated and resolved with organizer according to Community Guidelines.'
        : 'Official warning issued to athlete and recorded in moderation audit log in accordance with Community Guidelines.'
    });
  };

  const openDismissDialog = (
    reportId: string, 
    targetLabel: string, 
    targetType: 'user' | 'game' | 'report', 
    targetId: string, 
    reason: string
  ) => {
    setActionError(null);
    setActionDialog({
      type: 'dismiss',
      reportId,
      targetLabel,
      targetType,
      targetId,
      reason,
      inputText: 'Reviewed and dismissed: No policy violation found.'
    });
  };

  // Dialog confirmation handlers
  const handleConfirmResolve = async () => {
    if (!actionDialog) return;
    const { reportId, inputText } = actionDialog;
    const finalResolution = (inputText || 'Report reviewed and action taken according to Community Guidelines.').trim();

    setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
    setActionError(null);
    try {
      if (isRealAdmin) {
        await resolveModerationReport(reportId, finalResolution);
      } else {
        setResolvedReportIds(prev => [...prev, reportId]);
      }
      if (inspectingCase && inspectingCase.id === reportId) {
        setInspectingCase(prev => prev ? { ...prev, status: 'resolved', resolution: finalResolution } as any : null);
      }
      setActionDialog(null);
      setActionFeedback(t('Report resolved and action recorded successfully.', 'تم حل البلاغ وتسجيل الإجراء الإشرافي بنجاح.'));
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to resolve report:', err);
      setActionError(err?.message || t('Failed to resolve report. Permission denied or network issue.', 'فشل حل البلاغ. يرجى التحقق من الصلاحيات والاتصال.'));
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const handleConfirmDismiss = async () => {
    if (!actionDialog) return;
    const { reportId, inputText } = actionDialog;
    const finalReason = (inputText || 'Reviewed and dismissed: No policy violation found.').trim();

    setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
    setActionError(null);
    try {
      if (isRealAdmin) {
        await dismissModerationReport(reportId, finalReason);
      } else {
        setDismissedReportIds(prev => [...prev, reportId]);
      }
      if (inspectingCase && inspectingCase.id === reportId) {
        setInspectingCase(prev => prev ? { ...prev, status: 'dismissed', dismissalReason: finalReason } as any : null);
      }
      setActionDialog(null);
      setActionFeedback(t('Report dismissed successfully.', 'تم رفض البلاغ بنجاح.'));
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to dismiss report:', err);
      setActionError(err?.message || t('Failed to dismiss report. Permission denied or network issue.', 'فشل رفض البلاغ. يرجى التحقق من الصلاحيات والاتصال.'));
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Direct handlers for programmatic or test invocation
  const handleResolveReport = async (reportId: string, directResolution?: string) => {
    if (typeof directResolution === 'string') {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
      setActionError(null);
      try {
        if (isRealAdmin) {
          await resolveModerationReport(reportId, directResolution);
        } else {
          setResolvedReportIds(prev => [...prev, reportId]);
        }
        setActionFeedback(t('Report resolved successfully.', 'تم حل البلاغ بنجاح.'));
        setTimeout(() => setActionFeedback(null), 4000);
      } catch (err: any) {
        console.error('Failed to resolve report:', err);
        setActionError(err?.message || t('Failed to resolve report.', 'فشل حل البلاغ.'));
        throw err;
      } finally {
        setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
      }
      return;
    }

    const rep = activeReportsList.find(r => r.id === reportId);
    const isReal = rep && 'reporterId' in rep;
    const tType: 'user' | 'game' | 'report' = isReal 
      ? ((rep as ReportDocument).reportedUserId ? 'user' : ((rep as ReportDocument).reportedGameId ? 'game' : 'report'))
      : (rep as any)?.targetType || 'report';
    const targetId = isReal 
      ? ((rep as ReportDocument).reportedUserId || (rep as ReportDocument).reportedGameId || 'unknown') 
      : (rep as any)?.targetId;
    const targetLabel = tType === 'game'
      ? (games.find(g => g.id === targetId)?.title || t('Match', 'مباراة'))
      : (players.find(p => p.id === targetId || p.uid === targetId)?.name || t('Athlete', 'رياضي'));
    openResolveDialog(reportId, targetLabel, tType, targetId, (rep as any)?.reason || '');
  };

  const handleDismissReport = async (reportId: string, directReason?: string) => {
    if (typeof directReason === 'string') {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
      setActionError(null);
      try {
        if (isRealAdmin) {
          await dismissModerationReport(reportId, directReason);
        } else {
          setDismissedReportIds(prev => [...prev, reportId]);
        }
        setActionFeedback(t('Report dismissed successfully.', 'تم رفض البلاغ بنجاح.'));
        setTimeout(() => setActionFeedback(null), 4000);
      } catch (err: any) {
        console.error('Failed to dismiss report:', err);
        setActionError(err?.message || t('Failed to dismiss report.', 'فشل رفض البلاغ.'));
        throw err;
      } finally {
        setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
      }
      return;
    }

    const rep = activeReportsList.find(r => r.id === reportId);
    const isReal = rep && 'reporterId' in rep;
    const tType: 'user' | 'game' | 'report' = isReal 
      ? ((rep as ReportDocument).reportedUserId ? 'user' : ((rep as ReportDocument).reportedGameId ? 'game' : 'report'))
      : (rep as any)?.targetType || 'report';
    const targetId = isReal 
      ? ((rep as ReportDocument).reportedUserId || (rep as ReportDocument).reportedGameId || 'unknown') 
      : (rep as any)?.targetId;
    const targetLabel = tType === 'game'
      ? (games.find(g => g.id === targetId)?.title || t('Match', 'مباراة'))
      : (players.find(p => p.id === targetId || p.uid === targetId)?.name || t('Athlete', 'رياضي'));
    openDismissDialog(reportId, targetLabel, tType, targetId, (rep as any)?.reason || '');
  };

  // Phase 4: Confirm force cancel game
  const handleConfirmCancelGame = async () => {
    if (!gameCancelDialog) return;
    const { gameId, reason } = gameCancelDialog;
    const finalReason = (reason || 'Community safety / policy violation intervention').trim();

    setActionLoadingMap(prev => ({ ...prev, [gameId]: true }));
    setActionError(null);
    try {
      if (isRealAdmin) {
        await moderateGameCancellation(gameId, finalReason);
      } else {
        cancelGame(gameId, `Moderation: ${finalReason}`);
      }
      setGameCancelDialog(null);
      setActionFeedback(t('Match successfully moderated and cancelled.', 'تم إلغاء المباراة إدارياً بنجاح.'));
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to moderate cancel game:', err);
      setActionError(err?.message || t('Failed to moderate cancel game.', 'فشل الإجراء الإداري للمباراة.'));
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [gameId]: false }));
    }
  };

  // Phase 3: Confirm toggle athlete organizing status
  const handleConfirmAthletePrivilege = async () => {
    if (!athletePrivilegeDialog) return;
    const { userId, currentCanOrganize, reason } = athletePrivilegeDialog;
    const targetCanOrganize = !currentCanOrganize;

    setActionLoadingMap(prev => ({ ...prev, [userId]: true }));
    setActionError(null);
    try {
      await setAthleteOrganizingStatus(userId, targetCanOrganize, reason);
      setAthletePrivilegeDialog(null);
      setActionFeedback(targetCanOrganize 
        ? t('Organizer privilege restored for athlete.', 'تمت إعادة صلاحية تنظيم المباريات للاعب.')
        : t('Organizer privilege restricted for athlete.', 'تم تعليق صلاحية تنظيم المباريات للاعب.')
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      console.error('Failed to update organizing privilege:', err);
      setActionError(err?.message || t('Failed to update athlete privilege.', 'فشل تعديل صلاحية اللاعب.'));
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Filtered games list
  const filteredGames = useMemo(() => {
    return games.filter(g => {
      const matchSearch = gameSearchTerm === '' ||
        g.title.toLowerCase().includes(gameSearchTerm.toLowerCase()) ||
        g.courtName.toLowerCase().includes(gameSearchTerm.toLowerCase()) ||
        g.organizer.name.toLowerCase().includes(gameSearchTerm.toLowerCase()) ||
        g.organizer.username.toLowerCase().includes(gameSearchTerm.toLowerCase());
      
      const matchSport = gameSportFilter === 'all' || g.sport.toLowerCase() === gameSportFilter.toLowerCase();
      const matchStatus = gameStatusFilter === 'all' || g.status.toLowerCase() === gameStatusFilter.toLowerCase();

      return matchSearch && matchSport && matchStatus;
    });
  }, [games, gameSearchTerm, gameSportFilter, gameStatusFilter]);

  // Filtered players list
  const filteredPlayers = useMemo(() => {
    return players.filter(u => {
      const matchSearch = userSearchTerm === '' ||
        u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.area.toLowerCase().includes(userSearchTerm.toLowerCase());
      
      const matchRole = userRoleFilter === 'all' ||
        (userRoleFilter === 'organizers' && (u.isOrganizer || u.gamesHosted > 0)) ||
        (userRoleFilter === 'restricted' && u.canOrganize === false);

      return matchSearch && matchRole;
    });
  }, [players, userSearchTerm, userRoleFilter]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    return moderationLogs.filter(log => {
      const matchSearch = auditSearchTerm === '' ||
        log.targetId.toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
        (log.reportId && log.reportId.toLowerCase().includes(auditSearchTerm.toLowerCase())) ||
        (log.reason && log.reason.toLowerCase().includes(auditSearchTerm.toLowerCase())) ||
        (log.resolution && log.resolution.toLowerCase().includes(auditSearchTerm.toLowerCase())) ||
        log.moderatorId.toLowerCase().includes(auditSearchTerm.toLowerCase());

      const matchAction = auditActionFilter === 'all' || log.action === auditActionFilter;
      const matchTarget = auditTargetTypeFilter === 'all' || log.targetType === auditTargetTypeFilter;

      return matchSearch && matchAction && matchTarget;
    });
  }, [moderationLogs, auditSearchTerm, auditActionFilter, auditTargetTypeFilter]);

  // Early return: ONLY after all hooks have been unconditionally called
  if (!adminModalOpen) return null;

  // Strict Authorization Guard: Only verified administrators can access the Admin Panel
  if (!currentUser.isAdmin || currentUser.isDemoUser) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
        <div 
          className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl p-6 text-center space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {t('Access Restricted', 'غير مصرح بالدخول')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('Administrator privileges are required to access this dashboard.', 'صلاحيات الإشراف مطلوبة للوصول إلى هذه اللوحة.')}
            </p>
          </div>
          <button
            onClick={() => setAdminModalOpen(false)}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-900 dark:text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            {t('Close', 'إغلاق')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 overflow-y-auto">
      <div 
        className="relative w-full max-w-5xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl overflow-hidden flex flex-col my-auto max-h-[94dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-[#22304E] bg-slate-50 dark:bg-[#0B1120]">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1246DF]/10 dark:bg-[#1246DF]/20 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center font-black text-base sm:text-lg border border-[#1246DF]/20 shrink-0">
              ⚡
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {t('La3ib Kuwait Operations & Admin', 'إشراف عمليات لعيب - الكويت')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1246DF]/10 dark:bg-[#1246DF]/20 text-[#1246DF] dark:text-[#05BCD1] border border-[#1246DF]/20 flex items-center gap-1.5 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1246DF] dark:bg-[#05BCD1]"></span>
                  {t('Admin', 'مسؤول')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {t(
                  'Verifiable telemetry, case investigation files, athlete permission controls, and tamper-proof audit trails',
                  'إحصائيات موثوقة، ملفات تحقيق تفصيلية، إدارة صلاحيات المنظمين، وسجل إشرافي غير قابل للتعديل'
                )}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setAdminModalOpen(false)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex border-b border-slate-200 dark:border-[#22304E] bg-slate-50/70 dark:bg-[#0B1120]/80 px-3 sm:px-6 overflow-x-auto gap-1 scrollbar-none">
          <button
            onClick={() => setActiveAdminSection('overview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSection === 'overview'
                ? 'border-[#1246DF] text-[#1246DF] dark:text-[#05BCD1]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{t('Overview & Telemetry', 'الإحصائيات والعمليات')}</span>
          </button>

          <button
            onClick={() => setActiveAdminSection('reports')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSection === 'reports'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('Reports & Safety Queue', 'البلاغات والأمان')}</span>
            {pendingSafetyQueue > 0 && (
              <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-1.5 py-0.5 rounded-full border border-red-200 dark:border-red-800 font-mono">
                {pendingSafetyQueue}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveAdminSection('games')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSection === 'games'
                ? 'border-[#1246DF] text-[#1246DF] dark:text-[#05BCD1]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t('Game Oversight', 'إدارة المباريات')}</span>
            <span className="text-[10px] bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
              {games.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSection('users')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSection === 'users'
                ? 'border-[#1246DF] text-[#1246DF] dark:text-[#05BCD1]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('Athletes & Permissions', 'اللاعبين والصلاحيات')}</span>
            <span className="text-[10px] bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
              {players.length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSection('audit')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              activeAdminSection === 'audit'
                ? 'border-[#1246DF] text-[#1246DF] dark:text-[#05BCD1]'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t('Compliance Audit Trail', 'سجل الإشراف')}</span>
            <span className="text-[10px] bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded-full font-mono">
              {moderationLogs.length}
            </span>
          </button>
        </div>

        {/* Global Feedback & Error Banners */}
        <div className="px-6 pt-3 empty:hidden">
          {actionError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-800 dark:text-red-200 flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">{t('Operation Failed', 'فشلت العملية')}</p>
                  <p className="text-[11px] text-red-700 dark:text-red-300 break-all">{actionError}</p>
                </div>
              </div>
              <button onClick={() => setActionError(null)} className="text-red-500 hover:text-red-700 dark:hover:text-red-200 text-xs px-1 cursor-pointer">✕</button>
            </div>
          )}

          {actionFeedback && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{actionFeedback}</span>
              </div>
              <button onClick={() => setActionFeedback(null)} className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 text-xs px-1 cursor-pointer">✕</button>
            </div>
          )}
        </div>

        {/* Admin Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* ========================================================================= */}
          {/* SECTION 1: OVERVIEW & TELEMETRY                                          */}
          {/* ========================================================================= */}
          {activeAdminSection === 'overview' && (
            <div className="space-y-6">
              {/* Telemetry Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 dark:bg-[#1B253D] p-4 rounded-xl border border-slate-200 dark:border-[#22304E] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{t('Pending Safety Queue', 'طابور الأمان المعلق')}</span>
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{pendingSafetyQueue}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      ({openReportsCount} {t('open', 'مفتوح')}, {reviewingReportsCount} {t('in review', 'مراجعة')})
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold block ${urgentReportsCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {urgentReportsCount} {t('high severity cases', 'حالات حرجة')}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-[#1B253D] p-4 rounded-xl border border-slate-200 dark:border-[#22304E] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{t('Active Match Capacity', 'سعة المباريات النشطة')}</span>
                    <Activity className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{platformCapacityRate}%</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {totalSpotsOccupied}/{totalCapacityAvailable} {t('spots', 'مقعد')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {activeMatchesList.length} {t('live pickup matches', 'مباراة نشطة')}
                  </span>
                </div>

                <div className="bg-slate-50 dark:bg-[#1B253D] p-4 rounded-xl border border-slate-200 dark:border-[#22304E] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{t('Match Turnover (Active Window)', 'حجم التعاملات الحالية')}</span>
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{liveWindowVolumeKWD.toFixed(3)} KWD</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('Court bookings value in window', 'قيمة الملاعب في النافذة')}</span>
                </div>

                <div className="bg-slate-50 dark:bg-[#1B253D] p-4 rounded-xl border border-slate-200 dark:border-[#22304E] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{t('Admin Activity (24h)', 'نشاط الإشراف (24س)')}</span>
                    <Clock className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white block">{velocity24h}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{moderationLogs.length} {t('total audit records', 'إجمالي السجلات')}</span>
                </div>
              </div>

              {/* Report Categories Aggregation & Safety Distribution */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-500 dark:text-red-400" />
                    <span>{t('Report Reason Breakdown (Community Safety)', 'توزيع أسباب البلاغات حسب المعايير')}</span>
                  </h4>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {allCurrentReports.length} {t('total reports logged', 'إجمالي البلاغات')}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 bg-white dark:bg-[#131C31] rounded-lg border border-slate-200 dark:border-[#22304E]">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-semibold">{t('Harassment & Conduct', 'المضايقة والسلوك')}</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{reasonBreakdown['harassment'] || 0}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#131C31] rounded-lg border border-slate-200 dark:border-[#22304E]">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-semibold">{t('Unsafe Match Behavior', 'سلوك غير آمن بالمباراة')}</span>
                    <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{reasonBreakdown['unsafe_behavior'] || 0}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#131C31] rounded-lg border border-slate-200 dark:border-[#22304E]">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-semibold">{t('Scam / Financial Fraud', 'الاحتيال أو التلاعب')}</span>
                    <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{reasonBreakdown['scam_or_fraud'] || 0}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#131C31] rounded-lg border border-slate-200 dark:border-[#22304E]">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-semibold">{t('Fake / Impersonation Profile', 'حساب وهمي أو منتحل')}</span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{reasonBreakdown['fake_profile'] || 0}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#131C31] rounded-lg border border-slate-200 dark:border-[#22304E]">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-semibold">{t('Spam & Promotions', 'رسائل مزعجة وإعلانات')}</span>
                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{reasonBreakdown['spam'] || 0}</span>
                  </div>
                  <div className="p-3 bg-white dark:bg-[#131C31] rounded-lg border border-slate-200 dark:border-[#22304E]">
                    <span className="text-[10px] uppercase text-slate-500 dark:text-slate-400 block font-semibold">{t('Other Community Issues', 'بلاغات أخرى')}</span>
                    <span className="text-lg font-bold text-slate-600 dark:text-slate-400">{reasonBreakdown['other'] || 0}</span>
                  </div>
                </div>
              </div>

              {/* Data Integrity & Architecture Boundaries Notice */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold">
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{t('Data Integrity & Architecture Boundaries Notice', 'توضيح حدود وتكامل البيانات والمعايير الأمنية')}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  {t(
                    'All operational figures presented above are calculated strictly from active data records (reports, games, moderation logs). Platform-wide historical aggregates are summarized in real time to ensure high performance and data security.',
                    'جميع الأرقام التشغيلية أعلاه محسوبة بدقة من سجلات البيانات النشطة (البلاغات، المباريات، سجل الإشراف) لضمان السرعة والأمان.'
                  )}
                </p>
              </div>

              {/* Cloud Backend & Synchronization Status */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t('Cloud Database & RBAC Infrastructure', 'البنية التحتية لقاعدة البيانات السحابية والصلاحيات')}</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    {isFirebaseConfigured ? (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {t('Connected to Cloud', 'متصل بالسحابة')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/80 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        {t('Demo Mode Sandbox', 'وضع تجريبي')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    onClick={handleTestFirebase}
                    disabled={isTestingFirebase}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#22304E] border border-slate-200 dark:border-[#22304E] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin text-amber-500' : 'text-slate-400'}`} />
                    <span>{isTestingFirebase ? t('Testing Connection...', 'جارٍ الفحص...') : t('Test Cloud Connection', 'اختبار الاتصال السحابي')}</span>
                  </button>

                  <button
                    onClick={handleRunMigration}
                    disabled={migrationStatus?.inProgress}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/70 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Cloud className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{t('Sync Local Data to Cloud', 'مزامنة البيانات محلياً مع السحابة')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const success = await continueAsDemo();
                      if (success) {
                        setAdminModalOpen(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{t('Launch Demo Mode Sandbox', 'تشغيل الوضع التجريبي')}</span>
                  </button>
                </div>

                {/* Test Result Message */}
                {firebaseTestResult && (
                  <div className={`p-4 rounded-xl text-xs space-y-2.5 border ${
                    firebaseTestResult.connected 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                      : 'bg-white dark:bg-[#131C31] border-slate-200 dark:border-[#22304E] text-slate-700 dark:text-slate-300'
                  }`}>
                    <div className="flex items-start gap-2">
                      {firebaseTestResult.connected ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{firebaseTestResult.message}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                          {t('Verified at', 'تم التحقق في')} {new Date(firebaseTestResult.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: REPORTS & CASE INVESTIGATION                                   */}
          {/* ========================================================================= */}
          {activeAdminSection === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('Community Safety & Moderation Queue', 'طابور مراجعة البلاغات والأمان')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isRealAdmin 
                      ? t('Incident reports registry with multi-factor case inspection', 'سجل البلاغات المعتمد مع فحص شامل لملف القضية')
                      : t('Simulated demo reports queue', 'طابور بلاغات تجريبي')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {isRealAdmin && (
                    <button
                      onClick={refreshModerationQueue}
                      disabled={isModerationLoading}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Refresh reports"
                    >
                      <RefreshCw className={`w-3 h-3 ${isModerationLoading ? 'animate-spin' : ''}`} />
                      <span>{t('Refresh', 'تحديث')}</span>
                    </button>
                  )}

                  {/* Filter buttons */}
                  <div className="flex bg-slate-100 dark:bg-[#1B253D] p-0.5 rounded-lg border border-slate-200 dark:border-[#22304E] text-[11px]">
                    {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setReportFilter(f)}
                        className={`px-2 py-0.5 rounded-md font-bold capitalize transition-colors cursor-pointer ${
                          reportFilter === f 
                            ? 'bg-white dark:bg-[#131C31] text-[#1246DF] dark:text-[#05BCD1]' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {activeReportsList.length === 0 ? (
                <div className="text-center py-12 p-6 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] text-slate-500 dark:text-slate-400 space-y-1">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-900 dark:text-white text-sm">
                    {t('All caught up! No reports pending review.', 'تمت مراجعة جميع البلاغات!')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('New reports submitted by athletes will appear here in real time.', 'أي بلاغات جديدة ستظهر هنا تلقائياً.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeReportsList.map((r: any) => {
                    const isRealDoc = 'reporterId' in r;
                    const reportId = r.id;
                    const status = isRealDoc 
                      ? (r.status || 'open') 
                      : (dismissedReportIds.includes(r.id) ? 'dismissed' : (resolvedReportIds.includes(r.id) ? 'resolved' : (r.status || 'open')));
                    const reason = r.reason;
                    const details = r.details;
                    const createdAt = r.createdAt || r.timestamp || 'Recent';
                    const targetType: 'user' | 'game' | 'report' = isRealDoc 
                      ? (r.reportedUserId ? 'user' : (r.reportedGameId ? 'game' : 'report'))
                      : r.targetType;
                    const targetId = isRealDoc 
                      ? (r.reportedUserId || r.reportedGameId || 'unknown') 
                      : r.targetId;

                    const resolvedGame = targetType === 'game' ? games.find(g => g.id === targetId) : null;
                    const resolvedUser = targetType === 'user' ? players.find(p => p.id === targetId || p.uid === targetId) : null;

                    const targetLabel = targetType === 'game'
                      ? (resolvedGame ? resolvedGame.title : t('Game unavailable / Past match', 'المباراة غير متوفرة / منتهية'))
                      : (resolvedUser ? `${resolvedUser.name} (@${resolvedUser.username})` : t('Former Athlete / User profile removed', 'لاعب سابق / حساب محذوف'));

                    const isLoading = Boolean(actionLoadingMap[reportId]);

                    return (
                      <div 
                        key={reportId}
                        className={`p-4 rounded-xl border space-y-2.5 transition-all ${
                          status === 'resolved' || status === 'dismissed'
                            ? 'bg-slate-50 dark:bg-[#1B253D]/50 border-slate-200 dark:border-[#22304E] opacity-70' 
                            : status === 'reviewing'
                              ? 'bg-amber-50/40 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60'
                              : 'bg-red-50/40 dark:bg-red-950/30 border-red-300 dark:border-red-900/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">
                              {targetType.toUpperCase()} REPORT • #{reportId.slice(0, 12)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              status === 'open' 
                                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                : status === 'reviewing'
                                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                  : status === 'resolved'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#22304E]'
                            }`}>
                              {status}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{createdAt}</span>
                        </div>

                        {/* Reported Target Preview */}
                        <div className="p-2.5 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-xs flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase block font-semibold">
                              {t('Target:', 'الهدف:')} {targetType}
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                              {targetLabel}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                              ID: {targetId}
                            </span>
                          </div>

                          <button
                            onClick={() => setInspectingCase(r)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] border border-slate-200 dark:border-[#22304E] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                            <span>{t('Case File', 'ملف القضية')}</span>
                          </button>
                        </div>

                        {/* Reason & Details */}
                        <div className="text-xs space-y-1">
                          <p className="text-slate-800 dark:text-slate-200">
                            <strong className="text-slate-500 dark:text-slate-400">{t('Reason:', 'السبب:')}</strong> "{reason}"
                          </p>
                          {details && (
                            <p className="text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-[#131C31] p-2 rounded-lg border border-slate-200 dark:border-[#22304E] text-[11px]">
                              {details}
                            </p>
                          )}
                          {r.resolution && (
                            <p className="text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-[11px]">
                              <strong>{t('Resolution:', 'الإجراء المتخذ:')}</strong> {r.resolution}
                            </p>
                          )}
                          {r.dismissalReason && (
                            <p className="text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#131C31]/50 p-2 rounded-lg border border-slate-200 dark:border-[#22304E] text-[11px]">
                              <strong>{t('Dismissal Reason:', 'سبب الرفض:')}</strong> {r.dismissalReason}
                            </p>
                          )}
                        </div>

                        {/* Quick Actions Footer */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-200 dark:border-[#22304E]">
                          {status === 'open' && isRealAdmin && (
                            <button
                              onClick={() => handleReviewReport(reportId)}
                              disabled={isLoading}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-800 dark:text-slate-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                              <span>{t('Mark Reviewing', 'بدء المراجعة')}</span>
                            </button>
                          )}

                          {(status === 'open' || status === 'reviewing') && (
                            <>
                              <button
                                onClick={() => openDismissDialog(reportId, targetLabel, targetType, targetId, reason)}
                                disabled={isLoading}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-xs rounded-lg cursor-pointer transition-colors"
                              >
                                <span>{t('Dismiss', 'رفض البلاغ')}</span>
                              </button>

                              <button
                                onClick={() => openResolveDialog(reportId, targetLabel, targetType, targetId, reason)}
                                disabled={isLoading}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{t('Resolve & Take Action', 'حل البلاغ')}</span>
                              </button>
                            </>
                          )}

                          {(status === 'resolved' || status === 'dismissed') && (
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                              <CheckCircle className={`w-3.5 h-3.5 ${status === 'resolved' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                              <span>{status === 'resolved' ? t('Resolved ✓', 'تم الحل ✓') : t('Dismissed', 'مرفوض')}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: GAMES MANAGEMENT & OVERSIGHT                                  */}
          {/* ========================================================================= */}
          {activeAdminSection === 'games' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('Live Game Moderation & Court Oversight', 'إدارة ومتابعة المباريات الحية في الكويت')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('Inspect participant rosters, financial court turnover, and apply administrative force-cancellations', 'متابعة كشوف اللاعبين، الرسوم المالية، وتطبيق الإلغاءات الإدارية الموثقة')}
                  </p>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={gameSearchTerm}
                    onChange={(e) => setGameSearchTerm(e.target.value)}
                    placeholder={t('Search by match title, court, or host...', 'ابحث بالعنوان، الملعب، أو المنظم...')}
                    className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF]"
                  />
                </div>

                <select
                  value={gameSportFilter}
                  onChange={(e) => setGameSportFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">{t('All Sports', 'جميع الرياضات')}</option>
                  <option value="padel">Padel</option>
                  <option value="football">Football</option>
                  <option value="basketball">Basketball</option>
                  <option value="volleyball">Volleyball</option>
                </select>

                <select
                  value={gameStatusFilter}
                  onChange={(e) => setGameStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">{t('All Statuses', 'جميع الحالات')}</option>
                  <option value="open">Open</option>
                  <option value="almost full">Almost Full</option>
                  <option value="full">Full</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {filteredGames.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] text-slate-500 dark:text-slate-400 text-xs">
                  {t('No games found matching criteria.', 'لا توجد مباريات مطابقة للبحث.')}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGames.map(g => {
                    const hasOpenReport = allCurrentReports.some((r: any) => {
                      const tId = ('reporterId' in r) ? r.reportedGameId : r.targetId;
                      const s = ('reporterId' in r) ? r.status : (resolvedReportIds.includes(r.id) ? 'resolved' : 'open');
                      return tId === g.id && (s === 'open' || s === 'reviewing');
                    });

                    const isRosterExpanded = expandedRosterGameId === g.id;

                    return (
                      <div key={g.id} className="p-4 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] space-y-3 text-xs">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 dark:text-white text-sm">{g.title}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                g.status === 'Cancelled' 
                                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' 
                                  : g.status === 'Full'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              }`}>
                                {g.status}
                              </span>
                              {hasOpenReport && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-200 border border-red-200 dark:border-red-700 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                                  <span>{t('Active Safety Report', 'بلاغ أمان معلق')}</span>
                                </span>
                              )}
                            </div>

                            <p className="text-slate-600 dark:text-slate-400 mt-1">
                              {g.courtName} • <span className="text-slate-800 dark:text-slate-300 font-semibold">{g.area}</span> • {g.date} {formatTimeRange12Hour(g.startTime, g.endTime, language)}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                              {t('Organizer:', 'المنظم:')} <strong className="text-slate-800 dark:text-slate-300">{g.organizer.name}</strong> (@{g.organizer.username})
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setExpandedRosterGameId(isRosterExpanded ? null : g.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#131C31] hover:bg-slate-100 dark:hover:bg-[#22304E] border border-slate-200 dark:border-[#22304E] text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span>{t('Roster', 'الكشف')} ({g.participants.length})</span>
                              {isRosterExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            <button
                              onClick={() => setGameCancelDialog({ gameId: g.id, gameTitle: g.title, reason: 'Community safety / policy violation intervention' })}
                              disabled={g.status === 'Cancelled'}
                              className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-colors cursor-pointer ${
                                g.status === 'Cancelled' 
                                  ? 'bg-slate-100 dark:bg-[#131C31] text-slate-400 border border-slate-200 dark:border-[#22304E] cursor-not-allowed'
                                  : 'bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                              }`}
                            >
                              {g.status === 'Cancelled' ? t('Cancelled', 'ملغية') : t('Force Cancel', 'إلغاء فوري')}
                            </button>
                          </div>
                        </div>

                        {/* Financial and Capacity Summary */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
                          <div className="bg-white dark:bg-[#131C31] p-2 rounded-lg border border-slate-200 dark:border-[#22304E]">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t('SPOTS', 'المقاعد')}</span>
                            <span className="text-slate-900 dark:text-white font-bold">{g.participants.length} / {g.maxPlayers}</span>
                          </div>
                          <div className="bg-white dark:bg-[#131C31] p-2 rounded-lg border border-slate-200 dark:border-[#22304E]">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t('SPOT FEE', 'رسوم اللاعب')}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{g.pricePerPlayerKWD.toFixed(3)} KWD</span>
                          </div>
                          <div className="bg-white dark:bg-[#131C31] p-2 rounded-lg border border-slate-200 dark:border-[#22304E]">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t('COURT TOTAL', 'إجمالي الملعب')}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{g.totalCourtCostKWD.toFixed(3)} KWD</span>
                          </div>
                          <div className="bg-white dark:bg-[#131C31] p-2 rounded-lg border border-slate-200 dark:border-[#22304E]">
                            <span className="text-slate-500 dark:text-slate-400 block text-[10px]">{t('VISIBILITY', 'الخصوصية')}</span>
                            <span className="text-slate-700 dark:text-slate-300 font-bold">{g.visibility}</span>
                          </div>
                        </div>

                        {/* Expandable Participant Roster Drawer */}
                        {isRosterExpanded && (
                          <div className="p-3 bg-white dark:bg-[#131C31] rounded-lg border border-slate-200 dark:border-[#22304E] space-y-2">
                            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider block">
                              {t('Confirmed Participant Roster & Spot Status', 'كشف الحضور وحالة دفع الحصص:')}
                            </span>
                            <div className="divide-y divide-slate-100 dark:divide-[#22304E]">
                              {g.participants.map(p => (
                                <div key={p.userId} className="py-2 flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <img 
                                      src={p.avatar} 
                                      alt={p.name} 
                                      className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" 
                                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                    />
                                    <div>
                                      <span className="font-bold text-slate-900 dark:text-white block">{p.name}</span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400">ID: {p.userId}</span>
                                    </div>
                                  </div>
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    p.paymentStatus === 'paid' || p.paymentStatus === 'Paid'
                                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-[#1B253D] text-slate-600 dark:text-slate-400'
                                  }`}>
                                    {p.paymentStatus || 'unpaid'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 4: ATHLETES & HOST PERMISSION MANAGEMENT                          */}
          {/* ========================================================================= */}
          {activeAdminSection === 'users' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('Athlete Directory & Match Host Privileges', 'دليل اللاعبين وإدارة صلاحيات المنظمين')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('Inspect athlete attendance reliability, previous warnings, and manage listing privileges', 'متابعة سجل الحضور والإنذارات السابقة وإدارة صلاحية إنشاء المباريات')}
                  </p>
                </div>
              </div>

              {/* Architectural Notice */}
              <div className="p-3.5 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                  <span>{t('Administrative Capability Restriction Model', 'نموذج تقييد الصلاحيات الإداري المعتمد')}</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  {t(
                    'To ensure community safety, organizers violating guidelines can have their match organizing privileges suspended (canOrganize = false), immediately preventing unauthorized game creation across the platform.',
                    'لحماية المجتمع، يمكن تعليق صلاحية تنظيم المباريات (canOrganize = false) للحسابات المخالفة لمنع نشر أي مباريات غير مصرح بها فوراً.'
                  )}
                </p>
              </div>

              {/* Search & Filter */}
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    placeholder={t('Search athletes by name, handle, or Kuwait area...', 'ابحث بالاسم، الحساب، أو المنطقة...')}
                    className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF]"
                  />
                </div>

                <div className="flex bg-slate-100 dark:bg-[#1B253D] p-0.5 rounded-xl border border-slate-200 dark:border-[#22304E] text-[11px]">
                  {(['all', 'organizers', 'restricted'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => setUserRoleFilter(role)}
                      className={`px-2.5 py-1 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                        userRoleFilter === role 
                          ? 'bg-white dark:bg-[#131C31] text-[#1246DF] dark:text-[#05BCD1]' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPlayers.length === 0 ? (
                <div className="text-center py-12 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] text-slate-500 dark:text-slate-400 text-xs">
                  {t('No athletes found matching criteria.', 'لا يوجد رياضيون مطابقون للبحث.')}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredPlayers.map(u => {
                    const isRestricted = u.canOrganize === false;
                    const priorUserLogs = moderationLogs.filter(l => l.targetId === u.id || (u.uid && l.targetId === u.uid));

                    return (
                      <div key={u.id} className="p-3.5 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] flex flex-wrap items-center justify-between text-xs gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img 
                            src={u.avatar} 
                            alt={u.name} 
                            className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0" 
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 dark:text-white truncate">{u.name}</p>
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">@{u.username}</span>
                              {u.isAdmin && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 font-bold">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                              {u.area} • <strong className="text-amber-500">★ {u.rating ? u.rating.toFixed(1) + '/5' : '—'}</strong> Rating • {u.gamesHosted} hosted • {u.gamesPlayed} played
                            </p>
                            {priorUserLogs.length > 0 && (
                              <p className="text-amber-600 dark:text-amber-400 text-[10px] font-semibold mt-0.5 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                <span>{priorUserLogs.length} {t('previous moderation action(s) on file', 'إجراء إشرافي سابق في السجل')}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                            isRestricted 
                              ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {isRestricted ? t('Hosting Restricted 🚫', 'تنظيم المباريات معلق 🚫') : t('Host Eligible ✓', 'مؤهل للتنظيم ✓')}
                          </span>

                          <button
                            onClick={() => setAthletePrivilegeDialog({
                              userId: u.id,
                              userName: u.name,
                              currentCanOrganize: !isRestricted,
                              reason: isRestricted ? 'Host privilege restored after review' : 'Restricted host privilege due to community guidelines'
                            })}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isRestricted 
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                : 'bg-slate-200 hover:bg-slate-300 dark:bg-[#131C31] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {isRestricted ? t('Restore Hosting', 'إعادة التفعيل') : t('Restrict Hosting', 'تعليق التنظيم')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 5: COMPLIANCE AUDIT TRAIL                                        */}
          {/* ========================================================================= */}
          {activeAdminSection === 'audit' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('Immutable Moderation Audit Logs', 'سجل الإشراف غير القابل للتعديل')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('Chronological ledger of all moderation actions (/moderationLogs). Append-only, tamper-proof.', 'سجل زمني لجميع القرارات الإدارية. إضافة فقط ومحمي من التعديل والحذف.')}
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={auditSearchTerm}
                    onChange={(e) => setAuditSearchTerm(e.target.value)}
                    placeholder={t('Search by Target ID, Report ID, or reason...', 'ابحث بمعرف الهدف أو البلاغ أو السبب...')}
                    className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF]"
                  />
                </div>

                <select
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">{t('All Actions', 'جميع الإجراءات')}</option>
                  <option value="review_report">{t('Review Report', 'مراجعة البلاغ')}</option>
                  <option value="resolve_report">{t('Resolve Report', 'حل البلاغ')}</option>
                  <option value="dismiss_report">{t('Dismiss Report', 'رفض البلاغ')}</option>
                  <option value="cancel_game">{t('Cancel Game', 'إلغاء المباراة')}</option>
                </select>

                <select
                  value={auditTargetTypeFilter}
                  onChange={(e) => setAuditTargetTypeFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                >
                  <option value="all">{t('All Targets', 'جميع الأهداف')}</option>
                  <option value="user">{t('Athlete', 'لاعب')}</option>
                  <option value="game">{t('Match', 'مباراة')}</option>
                  <option value="report">{t('Report', 'بلاغ')}</option>
                </select>
              </div>

              {filteredAuditLogs.length === 0 ? (
                <div className="text-center py-10 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] text-slate-500 dark:text-slate-400 text-xs">
                  {t('No moderation actions found matching criteria.', 'لا توجد إجراءات إشراف مسجلة مطابقة للبحث.')}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAuditLogs.map(log => {
                    const actionBadgeColor = 
                      log.action === 'resolve_report' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' :
                      log.action === 'dismiss_report' ? 'bg-slate-200 dark:bg-[#131C31] text-slate-700 dark:text-slate-300 border-slate-300 dark:border-[#22304E]' :
                      log.action === 'cancel_game' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800' :
                      'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800';

                    return (
                      <div key={log.id} className="p-3 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] text-xs space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono border ${actionBadgeColor}`}>
                              {log.action.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">
                              TARGET: {log.targetType}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {log.createdAtISO || log.createdAt}
                          </span>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300">
                          <strong className="text-slate-500 dark:text-slate-400">Target ID:</strong> <span className="font-mono text-slate-900 dark:text-white">{log.targetId}</span>
                          {log.reportId && (
                            <span className="ml-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">(Ref: {log.reportId})</span>
                          )}
                        </p>

                        {log.reason && (
                          <p className="text-slate-700 dark:text-slate-300 text-[11px] bg-white dark:bg-[#131C31] p-2 rounded-lg border border-slate-200 dark:border-[#22304E]">
                            <strong className="text-slate-500 dark:text-slate-400">{t('Reason / Notes:', 'السبب / الملاحظات:')}</strong> {log.reason}
                          </p>
                        )}

                        {log.resolution && (
                          <p className="text-emerald-800 dark:text-emerald-300 text-[11px] bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                            <strong className="text-emerald-600 dark:text-emerald-400">{t('Action Enforced:', 'الإجراء المطبق:')}</strong> {log.resolution}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono pt-1">
                          <span>Moderator UID: {log.moderatorId}</span>
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Immutable
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PHASE 2: CASE INVESTIGATION DRAWER / MODAL                                */}
      {/* ========================================================================= */}
      {inspectingCase && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70">
          <div 
            className="w-full max-w-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl overflow-hidden p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const isReal = 'reporterId' in inspectingCase;
              const caseStatus: string = isReal 
                ? ((inspectingCase as ReportDocument).status || 'open')
                : (dismissedReportIds.includes(inspectingCase.id) ? 'dismissed' : (resolvedReportIds.includes(inspectingCase.id) ? 'resolved' : ((inspectingCase as any).status || 'open')));
              const tType: 'user' | 'game' | 'report' = isReal 
                ? ((inspectingCase as ReportDocument).reportedUserId ? 'user' : ((inspectingCase as ReportDocument).reportedGameId ? 'game' : 'report'))
                : (inspectingCase as any)?.targetType || 'report';
              const targetId = isReal 
                ? ((inspectingCase as ReportDocument).reportedUserId || (inspectingCase as ReportDocument).reportedGameId || 'unknown') 
                : (inspectingCase as any)?.targetId;

              const targetUser = tType === 'user' ? players.find(p => p.id === targetId || p.uid === targetId) : null;
              const targetGame = tType === 'game' ? games.find(g => g.id === targetId) : null;

              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#22304E]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#1246DF]/10 dark:bg-[#1246DF]/20 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center font-bold">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {t('Case File', 'ملف التحقيق في البلاغ')} #{inspectingCase.id.slice(0, 14)}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            caseStatus === 'open' 
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' 
                              : caseStatus === 'reviewing'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                : caseStatus === 'resolved'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-[#22304E]'
                          }`}>
                            {caseStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {t('Submitted on', 'تاريخ التقديم')} {(inspectingCase as any).createdAt || (inspectingCase as any).timestamp || 'Recent'}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setInspectingCase(null)}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                  {/* Reporter context */}
                  {isReal && (
                    <div className="p-3 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] text-xs space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                        {t('Reporter Context', 'بيانات مقدم البلاغ:')}
                      </span>
                      <p className="text-slate-800 dark:text-slate-200">
                        UID: <span className="font-mono text-slate-600 dark:text-slate-400">{(inspectingCase as ReportDocument).reporterId}</span>
                      </p>
                    </div>
                  )}

                  {/* Target Details */}
                  <div className="p-3 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] text-xs space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      {t('Reported Target File', 'ملف الهدف المشكو في حقه:')} ({tType.toUpperCase()})
                    </span>

                    {tType === 'user' && targetUser && (
                      <div className="flex items-center gap-3 pt-1">
                        <img 
                          src={targetUser.avatar} 
                          alt={targetUser.name} 
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700" 
                        />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{targetUser.name} (@{targetUser.username})</p>
                          <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                            {targetUser.area} • Rating: <strong className="text-amber-500">★ {targetUser.rating ? targetUser.rating.toFixed(1) + '/5' : '—'}</strong> • {targetUser.gamesHosted} hosted
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">UID: {targetId}</p>
                        </div>
                      </div>
                    )}

                    {tType === 'game' && targetGame && (
                      <div className="space-y-1 pt-1">
                        <p className="font-bold text-slate-900 dark:text-white text-sm">{targetGame.title}</p>
                        <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                          {targetGame.courtName} ({targetGame.area}) • Host: {targetGame.organizer.name} • {targetGame.status}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Game ID: {targetId}</p>
                      </div>
                    )}

                    {!targetUser && !targetGame && (
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        Target ID: <span className="font-mono text-slate-900 dark:text-white">{targetId}</span> (Historical record or past entity)
                      </p>
                    )}
                  </div>

                  {/* Incident Description */}
                  <div className="p-3 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] text-xs space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      {t('Incident Statement & Reason', 'تفاصيل ومبررات البلاغ:')}
                    </span>
                    <p className="text-slate-800 dark:text-slate-200">
                      <strong>{t('Alleged Violation:', 'المخالفة المزعومة:')}</strong> "{(inspectingCase as any).reason}"
                    </p>
                    {(inspectingCase as any).details && (
                      <p className="text-slate-700 dark:text-slate-300 bg-white dark:bg-[#131C31] p-2.5 rounded-lg border border-slate-200 dark:border-[#22304E] text-[11px] leading-relaxed">
                        {(inspectingCase as any).details}
                      </p>
                    )}
                  </div>

                  {/* Prior Moderation History for Target */}
                  <div className="p-3 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                        {t('Prior Moderation Ledger for this Target', 'سجل القرارات الإدارية السابقة لهذا الهدف')}
                      </span>
                      {isCaseLogsLoading && <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />}
                    </div>

                    {caseTargetLogs.length === 0 ? (
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                        {isCaseLogsLoading ? t('Querying history...', 'جارِ البحث في السجل...') : t('No previous moderation penalties recorded.', 'لا توجد قرارات إشراف سابقة مسجلة.')}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {caseTargetLogs.map(l => (
                          <div key={l.id} className="p-2 rounded-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-[11px] space-y-0.5">
                            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                              <span className="text-amber-600 dark:text-amber-400 font-bold">{l.action}</span>
                              <span>{l.createdAtISO ? l.createdAtISO.slice(0, 10) : ''}</span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-300">{l.resolution || l.reason || 'Action recorded'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions Drawer Bar */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#22304E]">
                    <button
                      type="button"
                      onClick={() => setInspectingCase(null)}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                    >
                      {t('Close', 'إغلاق')}
                    </button>

                    {caseStatus === 'open' && isRealAdmin && (
                      <button
                        type="button"
                        onClick={() => handleReviewReport(inspectingCase.id)}
                        disabled={Boolean(actionLoadingMap[inspectingCase.id])}
                        className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-amber-600 dark:text-amber-400 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{t('Mark Reviewing', 'بدء المراجعة')}</span>
                      </button>
                    )}

                    {(caseStatus === 'open' || caseStatus === 'reviewing') && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const rep = inspectingCase;
                            setInspectingCase(null);
                            handleDismissReport(rep.id);
                          }}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          {t('Dismiss Report', 'رفض البلاغ')}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const rep = inspectingCase;
                            setInspectingCase(null);
                            handleResolveReport(rep.id);
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{t('Resolve & Take Action', 'حل البلاغ')}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 4: GAME CANCELLATION DIALOG                                         */}
      {/* ========================================================================= */}
      {gameCancelDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70">
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#22304E]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-bold">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('Force Cancel Match', 'إلغاء المباراة إدارياً')}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{gameCancelDialog.gameTitle}</p>
                </div>
              </div>
              <button 
                onClick={() => setGameCancelDialog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                {t('Quick Reason Presets:', 'أسباب الإلغاء الجاهزة:')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setGameCancelDialog(prev => prev ? { ...prev, reason: 'Community safety and sportsmanship violation intervention' } : null)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer"
                >
                  {t('Safety Violation', 'مخالفة سلوكية أو أمنية')}
                </button>
                <button
                  type="button"
                  onClick={() => setGameCancelDialog(prev => prev ? { ...prev, reason: 'Court venue scheduling conflict or unverified court' } : null)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer"
                >
                  {t('Venue Conflict', 'تعارض مواعيد الملعب')}
                </button>
                <button
                  type="button"
                  onClick={() => setGameCancelDialog(prev => prev ? { ...prev, reason: 'Organizer requested emergency cancellation' } : null)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer"
                >
                  {t('Organizer Request', 'طلب المنظم')}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                {t('Moderation Reason (Recorded in /moderationLogs):', 'سبب الإلغاء (يسجل في سجل الإشراف):')}
              </label>
              <textarea
                value={gameCancelDialog.reason}
                onChange={(e) => setGameCancelDialog(prev => prev ? { ...prev, reason: e.target.value } : null)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#22304E]">
              <button
                type="button"
                onClick={() => setGameCancelDialog(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
              >
                {t('Back', 'رجوع')}
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelGame}
                disabled={Boolean(actionLoadingMap[gameCancelDialog.gameId])}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>{actionLoadingMap[gameCancelDialog.gameId] ? t('Cancelling...', 'جارِ الإلغاء...') : t('Confirm Cancellation', 'تأكيد الإلغاء')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PHASE 3: ATHLETE PRIVILEGE DIALOG                                         */}
      {/* ========================================================================= */}
      {athletePrivilegeDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70">
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#22304E]">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                  athletePrivilegeDialog.currentCanOrganize 
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400' 
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {athletePrivilegeDialog.currentCanOrganize ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {athletePrivilegeDialog.currentCanOrganize 
                      ? t('Restrict Match Hosting Privilege', 'تعليق صلاحية تنظيم المباريات')
                      : t('Restore Match Hosting Privilege', 'إعادة تفعيل صلاحية تنظيم المباريات')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{athletePrivilegeDialog.userName}</p>
                </div>
              </div>
              <button 
                onClick={() => setAthletePrivilegeDialog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                {t('Reason / Policy Reference (Logged in /moderationLogs):', 'سبب الإجراء (يسجل في سجل الإشراف):')}
              </label>
              <textarea
                value={athletePrivilegeDialog.reason}
                onChange={(e) => setAthletePrivilegeDialog(prev => prev ? { ...prev, reason: e.target.value } : null)}
                rows={2}
                className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#22304E]">
              <button
                type="button"
                onClick={() => setAthletePrivilegeDialog(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={handleConfirmAthletePrivilege}
                disabled={Boolean(actionLoadingMap[athletePrivilegeDialog.userId])}
                className={`px-4 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer ${
                  athletePrivilegeDialog.currentCanOrganize
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <span>{actionLoadingMap[athletePrivilegeDialog.userId] ? t('Processing...', 'جارِ المعالجة...') : t('Confirm Action', 'تأكيد الإجراء')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE RESOLVE / DISMISS CONFIRMATION DIALOG                         */}
      {/* ========================================================================= */}
      {actionDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70">
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#22304E]">
              <div className="flex items-center gap-2.5">
                {actionDialog.type === 'resolve' ? (
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <Check className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
                    <X className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {actionDialog.type === 'resolve'
                      ? t('Resolve Report & Take Action', 'حل البلاغ واتخاذ الإجراء')
                      : t('Dismiss Report', 'رفض البلاغ')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {actionDialog.type === 'resolve'
                      ? t('Record action taken and mark report as resolved', 'تسجيل الإجراء وتغيير حالة البلاغ إلى منجز')
                      : t('Close report without sanctioning athlete', 'إغلاق البلاغ دون تطبيق عقوبة على اللاعب')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActionDialog(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target and Reason Context */}
            <div className="p-3 bg-slate-50 dark:bg-[#1B253D] rounded-xl border border-slate-200 dark:border-[#22304E] text-xs space-y-1.5">
              <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span>{t('Target:', 'الهدف:')} <strong className="text-slate-900 dark:text-white">{actionDialog.targetLabel}</strong></span>
                <span className="font-mono text-[10px] text-slate-400">#{actionDialog.reportId.slice(0, 14)}</span>
              </div>
              <div className="text-slate-700 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">{t('Report Reason:', 'سبب البلاغ:')}</span> "{actionDialog.reason}"
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                {actionDialog.type === 'resolve'
                  ? t('Quick Action Presets:', 'إجراءات الإشراف الجاهزة:')
                  : t('Dismissal Reason Presets:', 'أسباب الرفض الجاهزة:')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {actionDialog.type === 'resolve' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActionDialog(prev => prev ? { ...prev, inputText: 'Official warning issued to athlete regarding sportsmanship and guidelines.' } : null)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer transition-colors"
                    >
                      {t('Warning Issued', 'إنذار رسمي')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionDialog(prev => prev ? { ...prev, inputText: 'Athlete counseled on community standards; recorded in moderation audit log.' } : null)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer transition-colors"
                    >
                      {t('Guideline Counseling', 'توجيه إرشادي')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionDialog(prev => prev ? { ...prev, inputText: 'Match content investigated and resolved with organizer according to rules.' } : null)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer transition-colors"
                    >
                      {t('Match Content Resolved', 'تسوية المباراة')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActionDialog(prev => prev ? { ...prev, inputText: 'Reviewed and dismissed: No policy violation found.' } : null)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer transition-colors"
                    >
                      {t('No Violation Found', 'لا توجد مخالفة')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionDialog(prev => prev ? { ...prev, inputText: 'Insufficient evidence to substantiate reported violation.' } : null)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer transition-colors"
                    >
                      {t('Insufficient Evidence', 'أدلة غير كافية')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionDialog(prev => prev ? { ...prev, inputText: 'Issue resolved informally between athletes prior to moderation review.' } : null)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#22304E] cursor-pointer transition-colors"
                    >
                      {t('Resolved Informally', 'تسوية ودية')}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Custom Notes / Input Text */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block">
                {actionDialog.type === 'resolve'
                  ? t('Resolution Summary / Action Taken (Recorded in /moderationLogs):', 'ملخص الإجراء المتخذ (يسجل في سجل الإشراف):')
                  : t('Dismissal Explanation:', 'سبب رفض البلاغ:')}
              </label>
              <textarea
                value={actionDialog.inputText}
                onChange={(e) => setActionDialog(prev => prev ? { ...prev, inputText: e.target.value } : null)}
                rows={3}
                className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#22304E] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF]"
                placeholder={t('Enter notes here...', 'أدخل الملاحظات هنا...')}
              />
            </div>

            {/* Error Message if any */}
            {actionError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/80 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <span className="break-all">{actionError}</span>
              </div>
            )}

            {/* Dialog Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#22304E]">
              <button
                type="button"
                onClick={() => setActionDialog(null)}
                disabled={Boolean(actionLoadingMap[actionDialog.reportId])}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#22304E] text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg cursor-pointer transition-colors"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              {actionDialog.type === 'resolve' ? (
                <button
                  type="button"
                  onClick={handleConfirmResolve}
                  disabled={Boolean(actionLoadingMap[actionDialog.reportId])}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{actionLoadingMap[actionDialog.reportId] ? t('Resolving...', 'جارٍ الحل...') : t('Confirm & Take Action', 'تأكيد وحل البلاغ')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmDismiss}
                  disabled={Boolean(actionLoadingMap[actionDialog.reportId])}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>{actionLoadingMap[actionDialog.reportId] ? t('Dismissing...', 'جارٍ الرفض...') : t('Confirm Dismiss', 'تأكيد الرفض')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
