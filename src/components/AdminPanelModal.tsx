import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReportItem, ReportDocument } from '../types';
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
  FileText
} from 'lucide-react';
import { 
  isFirebaseConfigured, 
  testFirebaseConnection,
  FirebaseTestReport
} from '../lib/firebase';
import { 
  migrateLocalStateToFirestore, 
  MigrationStatus 
} from '../lib/migration';

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
    refreshModerationQueue,
    cancelGame,
    t 
  } = useApp();

  const [activeAdminSection, setActiveAdminSection] = useState<'overview' | 'reports' | 'games' | 'users' | 'audit'>('overview');
  const [resolvedReportIds, setResolvedReportIds] = useState<string[]>([]);
  const [reportFilter, setReportFilter] = useState<'all' | 'open' | 'reviewing' | 'resolved' | 'dismissed'>('all');
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  // Firebase testing and migration states
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [firebaseTestResult, setFirebaseTestResult] = useState<FirebaseTestReport | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);

  if (!adminModalOpen) return null;

  const totalVolumeKWD = games.reduce((acc, g) => acc + g.totalCourtCostKWD, 0);
  const totalSpots = games.reduce((acc, g) => acc + g.participants.length, 0);

  const isRealAdmin = Boolean(currentUser.isAdmin && !currentUser.isDemoUser);

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
    if (!confirm(t('Are you sure you want to seed all local data into Firebase Cloud Firestore?', 'هل أنت متأكد من رغبتك في رفع البيانات المحلية إلى فايربيس كلاود؟'))) {
      return;
    }
    await migrateLocalStateToFirestore(status => {
      setMigrationStatus(status);
    });
  };

  // Moderation: Review report
  const handleReviewReport = async (reportId: string) => {
    setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
    try {
      await reviewModerationReport(reportId);
    } catch (err) {
      console.error('Failed to review report:', err);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Moderation: Resolve report
  const handleResolveReport = async (reportId: string) => {
    const resolution = prompt(
      t('Enter resolution notes / action taken:', 'أدخل ملاحظات الإجراء المتخذ:'),
      'Report reviewed and action taken according to Community Guidelines.'
    );
    if (resolution === null) return;

    setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
    try {
      if (isRealAdmin) {
        await resolveModerationReport(reportId, resolution);
      } else {
        setResolvedReportIds(prev => [...prev, reportId]);
      }
    } catch (err) {
      console.error('Failed to resolve report:', err);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Moderation: Dismiss report
  const handleDismissReport = async (reportId: string) => {
    const reason = prompt(
      t('Enter reason for dismissal:', 'أدخل سبب رفض البلاغ:'),
      'Reviewed and dismissed: No policy violation found.'
    );
    if (reason === null) return;

    setActionLoadingMap(prev => ({ ...prev, [reportId]: true }));
    try {
      if (isRealAdmin) {
        await dismissModerationReport(reportId, reason);
      } else {
        setResolvedReportIds(prev => [...prev, reportId]);
      }
    } catch (err) {
      console.error('Failed to dismiss report:', err);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [reportId]: false }));
    }
  };

  // Moderation: Force-cancel game
  const handleModerateGame = async (gameId: string) => {
    const reason = prompt(
      t('Enter moderation reason for cancelling this match:', 'أدخل سبب إلغاء المباراة الإداري:'),
      'Community safety / policy violation intervention'
    );
    if (!reason) return;

    setActionLoadingMap(prev => ({ ...prev, [gameId]: true }));
    try {
      if (isRealAdmin) {
        await moderateGameCancellation(gameId, reason);
      } else {
        cancelGame(gameId, `Moderation: ${reason}`);
      }
    } catch (err) {
      console.error('Failed to moderate cancel game:', err);
    } finally {
      setActionLoadingMap(prev => ({ ...prev, [gameId]: false }));
    }
  };

  // Active reports list based on active mode
  const activeReportsList: (ReportDocument | ReportItem)[] = isRealAdmin
    ? (reportFilter === 'all' 
        ? moderationReports 
        : moderationReports.filter(r => r.status === reportFilter))
    : reports;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-black">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">
                  {t('La3ib Kuwait Operations & Admin Dashboard', 'لوحة تحكم العمليات والإشراف الرياضي - الكويت')}
                </h2>
                {isRealAdmin ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Trusted Firestore Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Demo Mode Sandbox
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400">
                {t(
                  'Community moderation, match oversight, and immutable audit logs',
                  'إدارة البلاغات ومتابعة المباريات وسجل الإشراف غير القابل للتعديل'
                )}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setAdminModalOpen(false)}
            className="p-1.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex border-b border-neutral-800 bg-neutral-950/60 px-6 overflow-x-auto">
          <button
            onClick={() => setActiveAdminSection('overview')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeAdminSection === 'overview'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {t('Overview & Stats', 'الإحصائيات العامة')}
          </button>

          <button
            onClick={() => setActiveAdminSection('reports')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeAdminSection === 'reports'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('Reports & Safety', 'البلاغات والأمان')}</span>
            <span className="text-[10px] bg-red-950 text-red-400 px-1.5 py-0.5 rounded-full border border-red-800">
              {isRealAdmin
                ? moderationReports.filter(r => r.status === 'open' || r.status === 'reviewing').length
                : reports.filter((r: ReportItem) => !resolvedReportIds.includes(r.id)).length}
            </span>
          </button>

          <button
            onClick={() => setActiveAdminSection('games')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeAdminSection === 'games'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {t('Active Games', 'المباريات القائمة')} ({games.length})
          </button>

          <button
            onClick={() => setActiveAdminSection('users')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all shrink-0 ${
              activeAdminSection === 'users'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            {t('User Moderation', 'إدارة المستخدمين')} ({players.length})
          </button>

          {isRealAdmin && (
            <button
              onClick={() => setActiveAdminSection('audit')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
                activeAdminSection === 'audit'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t('Audit Logs', 'سجل الإشراف')}</span>
              <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded-full border border-neutral-700">
                {moderationLogs.length}
              </span>
            </button>
          )}
        </div>

        {/* Admin Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* OVERVIEW */}
          {activeAdminSection === 'overview' && (
            <div className="space-y-6">
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Total Match Volume', 'حجم المعاملات')}</span>
                  <span className="text-xl font-black text-emerald-400 mt-1 block">{totalVolumeKWD.toFixed(3)} KWD</span>
                  <span className="text-[10px] text-neutral-500">via KNET Gateway</span>
                </div>

                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Active Pickup Matches', 'المباريات المفتوحة')}</span>
                  <span className="text-xl font-black text-white mt-1 block">{games.length}</span>
                  <span className="text-[10px] text-neutral-500">All Kuwait areas</span>
                </div>

                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Confirmed Bookings', 'الحجوزات المؤكدة')}</span>
                  <span className="text-xl font-black text-white mt-1 block">{totalSpots}</span>
                  <span className="text-[10px] text-neutral-500">Players matched</span>
                </div>

                <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-800">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">{t('Kuwait Community Health', 'معدل الحضور')}</span>
                  <span className="text-xl font-black text-purple-400 mt-1 block">96.8%</span>
                  <span className="text-[10px] text-neutral-500">Attendance reliability</span>
                </div>
              </div>

              {/* Firebase Cloud Backend & Migration Status */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-400" />
                    <span>{t('Firebase Cloud Backend & Storage', 'خوادم فايربيس السحابية وقاعدة البيانات')}</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    {isFirebaseConfigured ? (
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Firebase Configured ✓
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Demo Mode (Local State)
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-neutral-400 leading-relaxed">
                  {t(
                    'La3ib is prepared with Firestore collections (users, games, courts, bookings, chats, reports, payments), Cloud Storage rules, and Auth adapters. Demo data remains active.',
                    'تطبيق لعيب جاهز مع مجموعات فايرستور (المستخدمين، المباريات، الملاعب، الحجوزات، المحادثات، البلاغات)، قواعد التخزين، والمصادقة. البيانات التجريبية مفعلة كنسخة احتياطية.'
                  )}
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    onClick={handleTestFirebase}
                    disabled={isTestingFirebase}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-neutral-200 hover:text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
                    <span>{isTestingFirebase ? t('Testing...', 'جارِ الاختبار...') : t('Test Firebase Connection', 'اختبار الاتصال بفايربيس')}</span>
                  </button>

                  <button
                    onClick={handleRunMigration}
                    disabled={migrationStatus?.inProgress}
                    className="px-3 py-1.5 rounded-xl bg-amber-950/50 hover:bg-amber-900/60 border border-amber-800/70 text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Cloud className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('Migrate Local State to Firestore', 'ترحيل البيانات إلى فايرستور')}</span>
                  </button>
                </div>

                {/* Test Result Message */}
                {firebaseTestResult && (
                  <div className={`p-4 rounded-xl text-xs space-y-2.5 border ${
                    firebaseTestResult.connected 
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                  }`}>
                    <div className="flex items-start gap-2">
                      {firebaseTestResult.connected ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="font-semibold text-white">{firebaseTestResult.message}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5 font-mono">
                          Verified at {new Date(firebaseTestResult.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                      <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                        <span className="text-neutral-400 block text-[10px]">AUTH SERVICE</span>
                        <span className={firebaseTestResult.authConnected ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                          {firebaseTestResult.authConnected ? '✓ Initialized' : '✗ Error'}
                        </span>
                      </div>
                      <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                        <span className="text-neutral-400 block text-[10px]">FIRESTORE R/W</span>
                        <span className={firebaseTestResult.firestoreWriteSuccess && firebaseTestResult.firestoreReadSuccess ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          {firebaseTestResult.firestoreWriteSuccess && firebaseTestResult.firestoreReadSuccess ? '✓ Read & Write OK' : '✗ Pending'}
                        </span>
                      </div>
                      <div className="bg-neutral-900/80 p-2 rounded border border-neutral-800">
                        <span className="text-neutral-400 block text-[10px]">STORAGE BUCKET</span>
                        <span className={firebaseTestResult.storageConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                          {firebaseTestResult.storageConnected ? '✓ Connected' : '✗ Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Migration Progress Bar */}
                {migrationStatus && (
                  <div className="p-3 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300 font-medium">{migrationStatus.currentStep}</span>
                      <span className="font-mono text-amber-400 font-bold">{migrationStatus.progressPercent}%</span>
                    </div>
                    <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-400 h-full transition-all duration-300"
                        style={{ width: `${migrationStatus.progressPercent}%` }}
                      />
                    </div>
                    {migrationStatus.error && (
                      <p className="text-xs text-red-400 font-mono mt-1">{migrationStatus.error}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Connected Li3ib Courts Status */}
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span>{t('Integrated Li3ib Kuwait Court Facilities', 'ملاعب الكويت المتصلة بـ Li3ib')}</span>
                  </h4>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Li3ib API Connected ✓
                  </span>
                </div>

                <div className="divide-y divide-neutral-900 text-xs">
                  {courts.map(c => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{c.name}</p>
                        <p className="text-[11px] text-neutral-400">{c.area} • {c.sport} • {c.pricePerHourKWD.toFixed(3)} KWD/hr</p>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-950">
                        {c.availableSlots.length} slots today
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REPORTS */}
          {activeAdminSection === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {t('Community Safety & Moderation Queue', 'طابور مراجعة البلاغات والأمان')}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    {isRealAdmin 
                      ? t('Live Firestore reports collection with authoritative status transitions', 'بلاغات حية مباشرة من قاعدة البيانات مع دورة حالة موثوقة')
                      : t('Simulated Demo reports queue (Demo Mode)', 'طابور بلاغات تجريبي')}
                  </p>
                </div>

                {isRealAdmin && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={refreshModerationQueue}
                      disabled={isModerationLoading}
                      className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs font-bold flex items-center gap-1"
                      title="Refresh reports"
                    >
                      <RefreshCw className={`w-3 h-3 ${isModerationLoading ? 'animate-spin' : ''}`} />
                      <span>{t('Refresh', 'تحديث')}</span>
                    </button>

                    {/* Filter buttons */}
                    <div className="flex bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[11px]">
                      {(['all', 'open', 'reviewing', 'resolved', 'dismissed'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setReportFilter(f)}
                          className={`px-2 py-0.5 rounded-md font-bold capitalize transition-colors ${
                            reportFilter === f 
                              ? 'bg-neutral-800 text-white' 
                              : 'text-neutral-400 hover:text-white'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activeReportsList.length === 0 ? (
                <div className="text-center py-12 p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-400 space-y-1">
                  <CheckCircle className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-white text-sm">
                    {t('All caught up! No reports pending review.', 'تمت مراجعة جميع البلاغات!')}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {t('New reports submitted by athletes will appear here in real time.', 'أي بلاغات جديدة ستظهر هنا تلقائياً.')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeReportsList.map((r: any) => {
                    const isRealDoc = 'reporterId' in r;
                    const reportId = r.id;
                    const status = isRealDoc ? (r.status || 'open') : (resolvedReportIds.includes(r.id) ? 'resolved' : 'open');
                    const reason = r.reason;
                    const details = r.details;
                    const createdAt = r.createdAt || r.timestamp || 'Recent';
                    const targetType = isRealDoc 
                      ? (r.reportedUserId ? 'user' : (r.reportedGameId ? 'game' : 'report'))
                      : r.targetType;
                    const targetId = isRealDoc 
                      ? (r.reportedUserId || r.reportedGameId || 'unknown') 
                      : r.targetId;

                    // Fallback target resolution without crashing if target deleted
                    const resolvedGame = targetType === 'game' ? games.find(g => g.id === targetId) : null;
                    const resolvedUser = targetType === 'user' ? players.find(p => p.id === targetId || p.uid === targetId) : null;

                    const targetLabel = targetType === 'game'
                      ? (resolvedGame ? resolvedGame.title : t('Game unavailable / Past match', 'المباراة غير متوفرة / منتهية'))
                      : (resolvedUser ? `${resolvedUser.name} (@${resolvedUser.username})` : t('Former Athlete / User profile removed', 'لاعب سابق / حساب محذوف'));

                    const isLoading = Boolean(actionLoadingMap[reportId]);

                    return (
                      <div 
                        key={reportId}
                        className={`p-4 rounded-2xl border space-y-2.5 transition-all ${
                          status === 'resolved' || status === 'dismissed'
                            ? 'bg-neutral-950/40 border-neutral-800/50 opacity-70' 
                            : status === 'reviewing'
                              ? 'bg-neutral-950 border-amber-800/60'
                              : 'bg-neutral-950 border-red-900/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                              {targetType.toUpperCase()} REPORT • #{reportId.slice(0, 12)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              status === 'open' 
                                ? 'bg-red-950 text-red-400 border border-red-800'
                                : status === 'reviewing'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : status === 'resolved'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-neutral-800 text-neutral-400'
                            }`}>
                              {status}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-500">{createdAt}</span>
                        </div>

                        {/* Reported Target preview */}
                        <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800/80 text-xs flex items-center justify-between">
                          <div className="min-w-0 pr-2">
                            <span className="text-[10px] text-neutral-400 uppercase block font-semibold">
                              {t('Target:', 'الهدف:')} {targetType}
                            </span>
                            <span className="font-bold text-white truncate block">
                              {targetLabel}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              ID: {targetId}
                            </span>
                          </div>

                          {targetType === 'game' && resolvedGame && (
                            <button
                              onClick={() => handleModerateGame(targetId)}
                              disabled={isLoading || resolvedGame.status === 'Cancelled'}
                              className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-[11px] rounded-lg shrink-0 cursor-pointer"
                            >
                              {resolvedGame.status === 'Cancelled' ? t('Cancelled', 'ملغية') : t('Force Cancel', 'إلغاء المباراة')}
                            </button>
                          )}
                        </div>

                        {/* Reason & Details */}
                        <div className="text-xs space-y-1">
                          <p className="text-neutral-200">
                            <strong className="text-neutral-400">{t('Reason:', 'السبب:')}</strong> "{reason}"
                          </p>
                          {details && (
                            <p className="text-neutral-300 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800 text-[11px]">
                              {details}
                            </p>
                          )}
                          {r.resolution && (
                            <p className="text-emerald-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/50 text-[11px]">
                              <strong>Resolution:</strong> {r.resolution}
                            </p>
                          )}
                          {r.dismissalReason && (
                            <p className="text-neutral-400 bg-neutral-900/40 p-2 rounded-lg border border-neutral-800 text-[11px]">
                              <strong>Dismissal Reason:</strong> {r.dismissalReason}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-neutral-900">
                          {status === 'open' && isRealAdmin && (
                            <button
                              onClick={() => handleReviewReport(reportId)}
                              disabled={isLoading}
                              className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-amber-400" />
                              <span>{t('Mark Reviewing', 'بدء المراجعة')}</span>
                            </button>
                          )}

                          {(status === 'open' || status === 'reviewing') && (
                            <>
                              <button
                                onClick={() => handleDismissReport(reportId)}
                                disabled={isLoading}
                                className="px-2.5 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white font-bold text-xs rounded-lg cursor-pointer"
                              >
                                <span>{t('Dismiss', 'رفض البلاغ')}</span>
                              </button>

                              <button
                                onClick={() => handleResolveReport(reportId)}
                                disabled={isLoading}
                                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{t('Resolve & Take Action', 'حل البلاغ')}</span>
                              </button>
                            </>
                          )}

                          {(status === 'resolved' || status === 'dismissed') && (
                            <span className="text-xs text-neutral-400 font-bold flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{status === 'resolved' ? 'Resolved ✓' : 'Dismissed'}</span>
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

          {/* GAMES */}
          {activeAdminSection === 'games' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t('Live Game Moderation & Oversight', 'إدارة وإلغاء المباريات الحية')}
              </h4>

              <div className="space-y-2">
                {games.map(g => (
                  <div key={g.id} className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between text-xs gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-white text-sm truncate">{g.title}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          g.status === 'Cancelled' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-neutral-800 text-neutral-300'
                        }`}>
                          {g.status}
                        </span>
                      </div>
                      <p className="text-neutral-400 truncate">{g.courtName} ({g.area}) • Host: {g.organizer.name}</p>
                      <p className="text-emerald-400 font-semibold mt-0.5">
                        {g.participants.length}/{g.maxPlayers} players • {g.totalCourtCostKWD.toFixed(3)} KWD total
                      </p>
                    </div>

                    <button
                      onClick={() => handleModerateGame(g.id)}
                      disabled={g.status === 'Cancelled'}
                      className={`px-3 py-1.5 font-bold text-xs rounded-xl shrink-0 ${
                        g.status === 'Cancelled' 
                          ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                          : 'bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 cursor-pointer'
                      }`}
                    >
                      {g.status === 'Cancelled' ? t('Cancelled', 'ملغية') : t('Force Cancel', 'إلغاء فوري')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {activeAdminSection === 'users' && (
            <div className="space-y-3">
              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-neutral-400 space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>{t('User Account Restriction Policy Note', 'سياسة تعليق الحسابات')}</span>
                </p>
                <p className="text-[11px] leading-relaxed">
                  {t(
                    'In accordance with Firebase security architecture guidelines, true permanent account suspension requires Firebase Auth Custom Claims or server-side Cloud Functions so revoked tokens cannot be refreshed. Client-side ban flags are intentionally avoided to prevent false security illusions.',
                    'وفقاً لمعايير أمان فايربيس، يتطلب حظر الحسابات الجذري استخدام Firebase Auth Custom Claims أو Cloud Functions لإلغاء التوكن بشكل آمن، تجنباً للأعلام البرمجية السطحية القابلة للتجاوز.'
                  )}
                </p>
              </div>

              <div className="space-y-2">
                {players.map(u => (
                  <div key={u.id} className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <img 
                        src={u.avatar} 
                        alt={u.name} 
                        className="w-9 h-9 rounded-full object-cover ring-1 ring-neutral-700" 
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                      <div>
                        <p className="font-bold text-white">{u.name} (@{u.username})</p>
                        <p className="text-neutral-400">{u.area} • {u.attendanceRate}% Attendance • {u.friendCount ?? 0} Friends</p>
                      </div>
                    </div>

                    <span className="text-[11px] px-2 py-1 bg-neutral-900 text-neutral-400 border border-neutral-800 rounded-lg">
                      {u.isAdmin ? 'Admin' : 'Athlete'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIT LOGS */}
          {activeAdminSection === 'audit' && isRealAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    {t('Immutable Moderation Audit Logs', 'سجل الإشراف غير القابل للتعديل')}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    {t('Path: /moderationLogs (Append-only, strictly tamper-proof)', 'المسار: moderationLogs (إضافة فقط ومحمي من الحذف والتعديل)')}
                  </p>
                </div>
              </div>

              {moderationLogs.length === 0 ? (
                <div className="text-center py-10 rounded-2xl bg-neutral-950 border border-neutral-800 text-neutral-500 text-xs">
                  {t('No moderation actions recorded yet.', 'لا توجد إجراءات إشراف مسجلة بعد.')}
                </div>
              ) : (
                <div className="space-y-2">
                  {moderationLogs.map(log => (
                    <div key={log.id} className="p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-400 font-mono">
                          {log.action.toUpperCase()} • {log.targetType.toUpperCase()}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {log.createdAtISO || log.createdAt}
                        </span>
                      </div>
                      <p className="text-neutral-300">
                        <strong className="text-neutral-400">Target ID:</strong> <span className="font-mono text-neutral-200">{log.targetId}</span>
                      </p>
                      {log.reason && (
                        <p className="text-neutral-400 text-[11px]">
                          <strong>Reason:</strong> {log.reason}
                        </p>
                      )}
                      {log.resolution && (
                        <p className="text-neutral-400 text-[11px]">
                          <strong>Resolution:</strong> {log.resolution}
                        </p>
                      )}
                      <p className="text-[10px] text-neutral-600 font-mono">
                        Moderator UID: {log.moderatorId}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
