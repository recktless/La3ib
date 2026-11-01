import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight, 
  HeartHandshake, 
  Ban, 
  Activity, 
  FileCheck, 
  Crown, 
  CreditCard, 
  Lock, 
  AlertTriangle, 
  Flag,
  UserX,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink
} from 'lucide-react';
import { ReportReason } from '../types';

export const CommunityGuidelinesTab: React.FC = () => {
  const { 
    setActiveTab, 
    setProfileSubView, 
    language, 
    t, 
    submitReport, 
    currentUser, 
    authStatus, 
    blockedPlayersList, 
    unblockPlayer,
    isBlockActionLoading,
    games
  } = useApp();

  const isRtl = language === 'ar';

  // Report Modal State
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportTargetType, setReportTargetType] = useState<'user' | 'game' | 'chat'>('user');
  const [reportTargetId, setReportTargetId] = useState('');
  const [reportReason, setReportReason] = useState<ReportReason>('inappropriate_behavior');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Blocked users management dialog state
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);

  const handleOpenReport = (type: 'user' | 'game' = 'user') => {
    setReportTargetType(type);
    setReportTargetId('');
    setReportReason('inappropriate_behavior');
    setReportDetails('');
    setReportSuccess(false);
    setReportError(null);
    setShowReportDialog(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTargetId.trim()) {
      setReportError(t('Please specify the username, player ID, or match title.', 'يرجى تحديد اسم المستخدم أو معرّف اللاعب أو عنوان المباراة.'));
      return;
    }
    if (!reportDetails.trim()) {
      setReportError(t('Please provide a brief explanation of the incident.', 'يرجى تقديم شرح موجز للواقعة.'));
      return;
    }

    setIsSubmitting(true);
    setReportError(null);
    try {
      await submitReport({
        reportedUserId: reportTargetType === 'user' ? reportTargetId.trim() : undefined,
        reportedGameId: reportTargetType === 'game' ? reportTargetId.trim() : undefined,
        reason: reportReason,
        details: reportDetails.trim()
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportDialog(false);
        setReportSuccess(false);
      }, 2500);
    } catch (err: any) {
      console.error('[Guidelines] Report error:', err);
      setReportError(err?.message || t('Failed to submit report. Please try again.', 'فشل إرسال البلاغ. يرجى المحاولة مجدداً.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const guidelinesSections = [
    {
      id: 'respect',
      icon: HeartHandshake,
      titleEn: '1. Respect and Sportsmanship',
      titleAr: '١. الاحترام والروح الرياضية',
      descEn: 'La3ib is founded on mutual camaraderie and athletic passion. Treat all athletes, referees, venue staff, and organizers with dignity. Win with humility, lose with grace, and never engage in aggressive dissent, taunting, or hostile conduct on or off the pitch.',
      descAr: 'تقوم منصة لاعب على روح الزمالة والشغف بالرياضة. تعامل مع جميع اللاعبين والمنظمين وطاقم الملاعب باحترام. التزم بالروح الرياضية عند الفوز والخسارة، وتجنب أي سلوك عدائي أو مشادات كلامية داخل الملعب وخارجه.'
    },
    {
      id: 'harassment',
      icon: Ban,
      titleEn: '2. Harassment and Discrimination',
      titleAr: '٢. منع التحرش والتمييز',
      descEn: 'Zero tolerance for discriminatory speech, hate speech, bullying, insults, or harassment based on race, nationality, gender, religion, skill level, or appearance. Any form of verbal abuse or physical intimidation results in immediate account suspension.',
      descAr: 'لا تهاون مع أي شكل من أشكال التمييز أو خطاب الكراهية أو التنمر أو الإساءة لأي سبب كان. أي اعتداء لفظي أو سلوك ترهيبي يعرض الحساب للإيقاف الفوري دون تهاون.'
    },
    {
      id: 'safety',
      icon: Activity,
      titleEn: '3. Safe Real-World Participation',
      titleAr: '٣. المشاركة الآمنة على أرض الملعب',
      descEn: 'Prioritize physical safety at all times. Wear appropriate footwear suitable for the surface (turf, court, or sand). Stop play immediately if an athlete is hurt or exhibits distress. Respect venue safety protocols and emergency exits across Kuwait sports hubs.',
      descAr: 'السلامة الجسدية هي الأولوية القصوى دائماً. ارتدِ الأحذية الرياضية المناسبة لنوعية الأرضية (عشب صناعي، صالة، أو رمل). أوقف اللعب فوراً عند إصابة أي لاعب، والتزم بإرشادات السلامة للمنشآت والملاعب في الكويت.'
    },
    {
      id: 'listings',
      icon: FileCheck,
      titleEn: '4. Honest Game Listings',
      titleAr: '٤. الإعلانات الصادقة للمباريات',
      descEn: 'Game descriptions must represent genuine, confirmed matches. Accurately specify the sport, gender preference, skill level expectations, exact pitch address, and kickoff times. Do not post misleading skill ratings or phantom games to reserve court slots.',
      descAr: 'يجب أن تكون تفاصيل المباريات المنشورة حقيقية ومؤكدة. حدد نوع الرياضة ومستوى المهارة المطلوب وموقع الملعب بدقة وأوقات البدء والانتهاء. يُمنع نشر إعلانات مضللة أو مباريات وهمية.'
    },
    {
      id: 'organizers',
      icon: Crown,
      titleEn: '5. Organizer Responsibilities',
      titleAr: '٥. مسؤوليات المنظمين',
      descEn: 'Organizers represent the backbone of our community. Maintain confirmed court bookings, arrive 15 minutes before match start, provide match balls and pinnies, and communicate schedule updates proactively in game chat. Failure to host confirmed games impairs organizing privileges.',
      descAr: 'المنظمون هم عمود المجتمع الرياضي. احرص على تأكيد حجز الملعب مسبقاً، والتواجد قبل المباراة بـ 15 دقيقة، وتوفير الكرات وأطقم التمييز، والتواصل بوضوح في محادثة المباراة. عدم الحضور يلغي صلاحية التنظيم.'
    },
    {
      id: 'payments',
      icon: CreditCard,
      titleEn: '6. Payments, Cost-Sharing & Scams',
      titleAr: '٦. المدفوعات والتقاسم العادل للتكاليف',
      descEn: 'Cost sharing on La3ib is strictly intended to distribute actual pitch rental costs fairly among players. Commercial scalping, charging excessive surcharges, or requesting non-sanctioned outside transfers is strictly forbidden. Use verified WAMD mobile transfers or cash.',
      descAr: 'تقاسم التكلفة في لعّيب مخصص فقط للتوزيع العادل لسعر إيجار الملعب الفعلي بين المشاركين. يُمنع منعاً باتاً تحقيق أرباح غير مشروعة أو فرض رسوم مضاعفة. اعتمد على تحويلات ومض الموثقة أو الدفع النقدي.'
    },
    {
      id: 'privacy',
      icon: Lock,
      titleEn: '7. Privacy and Personal Data',
      titleAr: '٧. الخصوصية وحماية البيانات الشخصية',
      descEn: 'Respect fellow athletes\' privacy. Never publish or share personal phone numbers, civil IDs, or private player roster contacts outside match coordination. Photography and video recordings require consensual agreement among court participants.',
      descAr: 'احترم خصوصية زملائك الرياضيين. يُمنع نشر أو تداول أرقام الهواتف أو البيانات الشخصية خارج إطار تنسيق المباراة. يتطلب التصوير أو النشر موافقة المشاركين في الملعب.'
    },
    {
      id: 'reporting',
      icon: Flag,
      titleEn: '8. Reporting and Blocking',
      titleAr: '٨. الإبلاغ وحظر المستخدمين',
      descEn: 'You have continuous access to safety tools. Report games, organizers, or participants who breach these standards. You may also block athletes immediately to prevent them from seeing your games, sending messages, or joining your hosted matches.',
      descAr: 'لديك وصول كامل لأدوات الأمان. أبلغ عن أي مباراة أو مستخدم يخالف هذه المعايير. يمكنك أيضاً حظر أي لاعب فوراً لمنعه من رؤية مبارياتك أو مراسلتك أو الانضمام لمبارياتك.'
    },
    {
      id: 'consequences',
      icon: AlertTriangle,
      titleEn: '9. Consequences of Violations',
      titleAr: '٩. عواقب مخالفة الإرشادات',
      descEn: 'Violations are evaluated by platform administrators. Penalties progress from formal advisory warnings to suspension of match organizing privileges (canOrganize = false), temporary account lockdowns, and permanent device/account bans for severe breaches.',
      descAr: 'تتم مراجعة البلاغات من قبل إدارة المنصة بدقة. تتدرج العقوبات من التنبيه الإرشادي إلى إيقاف صلاحية تنظيم المباريات، وحتى حظر الحساب نهائياً في حالات المخالفات الجسيمة.'
    }
  ];

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 pb-12 select-none">
      {/* 1. Header & Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 text-slate-700 hover:text-[#06135B] dark:text-[#B9C9E0] dark:hover:text-white transition-colors cursor-pointer shadow-xs hover:shadow-sm"
            aria-label={t('Back to Home', 'العودة للرئيسية')}
            title={t('Back to Home', 'العودة للرئيسية')}
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#3A60AA] dark:text-[#B9C9E0]" />
              <h1 className="text-xl sm:text-2xl font-black text-[#06135B] dark:text-white tracking-tight">
                {t('Community & Safety Guidelines', 'إرشادات المجتمع والسلامة')}
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#B9C9E0]/80 mt-0.5">
              {t(
                'Our shared commitments for fair, friendly, and respectful sports across Kuwait.',
                'التزاماتنا المشتركة لممارسة رياضية عادلة، آمنة، ومحترمة في جميع أنحاء الكويت.'
              )}
            </p>
          </div>
        </div>

        {/* Action Button: File Report */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => handleOpenReport('user')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Flag className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{t('File Safety Report', 'تقديم بلاغ أمان')}</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
        <h2 className="text-sm font-bold text-[#06135B] dark:text-white">
          {t('A Safe, Respectful Platform for Every Athlete in Kuwait', 'بيئة رياضية آمنة ومحترمة لكل رياضي في الكويت')}
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          {t(
            'Whether organizing football in Mishref, playing padel in Shuwaikh, or joining basketball in Abu Hasaniya, every participant is expected to adhere to these standards. Violating these principles harms community trust and may lead to removal from the platform.',
            'سواء كنت تنظم مباراة كرة قدم في مشرف، تلعب البادل في الشويخ، أو تنضم لكرة السلة في أبو الحصانية، يُتوقع من كل رياضي الالتزام بهذه المعايير للحفاظ على بيئة رياضية إيجابية للجميع.'
          )}
        </p>
      </div>

      {/* 3. Nine Core Guideline Sections */}
      <div className="space-y-3.5">
        {guidelinesSections.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.id}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-[#3A60AA]/40 dark:hover:border-[#B9C9E0]/40 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#EEF3F9] dark:bg-[#142578] border border-[#B9C9E0]/50 dark:border-[#1F3590]/60 text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#06135B] dark:text-white leading-snug">
                    {language === 'ar' ? section.titleAr : section.titleEn}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {language === 'ar' ? section.descAr : section.descEn}
                  </p>

                  {/* Contextual Action for Reporting & Blocking Section */}
                  {section.id === 'reporting' && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 mt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleOpenReport('user')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#142578] dark:hover:bg-[#1B3088] text-[#06135B] dark:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#B9C9E0]/60 dark:border-[#1F3590]"
                      >
                        <Flag className="w-3 h-3 text-rose-500" />
                        <span>{t('Report User / Match', 'إبلاغ عن مستخدم / مباراة')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBlockedDialog(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        <UserX className="w-3 h-3 text-slate-500" />
                        <span>{t('Manage Blocked Athletes', 'إدارة الرياضيين المحظورين')} ({blockedPlayersList.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Support Contact Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#EEF3F9] dark:bg-[#0D1C68] border border-[#B9C9E0]/60 dark:border-[#1F3590]/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div>
          <h4 className="text-xs font-bold text-[#06135B] dark:text-white uppercase tracking-wider">
            {t('Need Direct Support or Urgent Assistance?', 'تحتاج إلى مساعدة عاجلة أو دعم مباشر؟')}
          </h4>
          <p className="text-xs text-slate-600 dark:text-[#B9C9E0]/90 mt-0.5">
            {t(
              'Our community safety team in Kuwait investigates all reports within 24 hours.',
              'فريق الأمان المجتمعي في الكويت يحقق في جميع البلاغات خلال 24 ساعة.'
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleOpenReport('user')}
          className="px-4 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-xs"
        >
          {t('Submit Safety Inquiry', 'إرسال استفسار أمان')}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* REAL FUNCTIONAL REPORT DIALOG                                             */}
      {/* ========================================================================= */}
      {showReportDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
        >
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl p-5 sm:p-6 overflow-hidden shadow-2xl transition-colors max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowReportDialog(false)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              aria-label={t('Close', 'إغلاق')}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <Flag className="w-4 h-4" />
              </div>
              <div>
                <h3 id="report-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Submit Community Safety Report', 'تقديم بلاغ أمان مجتمعي')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Strictly confidential review by La3ib administrators.', 'مراجعة سرية تامة من قبل مسؤولي منصة لعّيب.')}
                </p>
              </div>
            </div>

            {reportSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('Report Received', 'تم استلام البلاغ')}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                  {t(
                    'Thank you for keeping La3ib safe. Our team will review the log and take prompt action.',
                    'شكراً لمساهمتك في أمان المجتمع. سيقوم فريقنا بمراجعة السجل واتخاذ الإجراء اللازم.'
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3.5">
                {reportError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                    {reportError}
                  </div>
                )}

                {/* Target Type Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Report Target Type', 'نوع البلاغ')}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportTargetType('user')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        reportTargetType === 'user'
                          ? 'bg-[#3A60AA] text-white border-[#3A60AA]'
                          : 'bg-slate-50 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2A3B5C]'
                      }`}
                    >
                      {t('Athlete / Player', 'لاعب / رياضي')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportTargetType('game')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                        reportTargetType === 'game'
                          ? 'bg-[#3A60AA] text-white border-[#3A60AA]'
                          : 'bg-slate-50 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2A3B5C]'
                      }`}
                    >
                      {t('Match / Game', 'مباراة')}
                    </button>
                  </div>
                </div>

                {/* Target Identifier Input */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {reportTargetType === 'user' 
                      ? t('Username or Player Name', 'اسم المستخدم أو اللاعب')
                      : t('Match Title or Court Name', 'عنوان المباراة أو اسم الملعب')}
                  </label>
                  <input
                    type="text"
                    value={reportTargetId}
                    onChange={(e) => setReportTargetId(e.target.value)}
                    placeholder={reportTargetType === 'user' ? 'e.g. athlete_kw or Player Name' : 'e.g. Friday Night 7v7'}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3A60AA]"
                  />
                </div>

                {/* Reason Select */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Violation Category', 'سبب البلاغ')}
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as ReportReason)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-slate-900 dark:text-white focus:outline-none focus:border-[#3A60AA]"
                  >
                    <option value="inappropriate_behavior">{t('Inappropriate or Aggressive Behavior', 'سلوك غير لائق أو عدائي')}</option>
                    <option value="offensive_content">{t('Harassment or Hate Speech', 'تحرش أو إساءة لفظية')}</option>
                    <option value="fraud_scam">{t('Payment Fraud or Cost Scam', 'احتيال مالي أو مبالغة في التكلفة')}</option>
                    <option value="rules_violation">{t('Misleading Match Information', 'معلومات مضللة عن المباراة')}</option>
                    <option value="no_show">{t('No-Show Organizer / Abandoned Match', 'غياب المنظم / إلغاء مفاجئ')}</option>
                    <option value="other">{t('Other Safety Concern', 'مخاوف أمان أخرى')}</option>
                  </select>
                </div>

                {/* Details Textarea */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('Incident Explanation', 'تفاصيل الواقعة')}
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder={t('Please describe what happened...', 'يرجى وصف ما حدث بموضوعية...')}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#3A60AA] resize-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#1B253D]">
                  <button
                    type="button"
                    onClick={() => setShowReportDialog(false)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1B253D] rounded-xl transition-colors cursor-pointer"
                  >
                    {t('Cancel', 'إلغاء')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('Submitting...', 'جارٍ الإرسال...')}</span>
                      </>
                    ) : (
                      <>
                        <Flag className="w-3.5 h-3.5" />
                        <span>{t('Submit Report', 'إرسال البلاغ')}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REAL FUNCTIONAL BLOCKED ATHLETES DIALOG                                  */}
      {/* ========================================================================= */}
      {showBlockedDialog && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blocked-dialog-title"
        >
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl p-5 sm:p-6 overflow-hidden shadow-2xl transition-colors max-h-[92dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowBlockedDialog(false)}
              className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
              aria-label={t('Close', 'إغلاق')}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-slate-700 dark:text-slate-300 flex items-center justify-center">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <h3 id="blocked-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Blocked Athletes', 'الرياضيون المحظورون')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Blocked users cannot view your games or message you.', 'المستخدمون المحظورون لا يمكنهم رؤية مبارياتك أو مراسلتك.')}
                </p>
              </div>
            </div>

            {blockedPlayersList.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <UserX className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('You have not blocked any athletes.', 'لم تقم بحظر أي لاعب بعد.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {blockedPlayersList.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C]"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {player.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        @{player.username || player.id}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isBlockActionLoading(player.id)}
                      onClick={() => unblockPlayer(player.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#1246DF] dark:text-[#05BCD1] hover:bg-white dark:hover:bg-[#131C31] rounded-lg transition-colors cursor-pointer border border-[#BFDBFE] dark:border-[#2A3B5C] disabled:opacity-50"
                    >
                      {isBlockActionLoading(player.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        t('Unblock', 'إلغاء الحظر')
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 dark:border-[#1B253D] mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowBlockedDialog(false);
                  setActiveTab('profile');
                  setProfileSubView('settings');
                }}
                className="text-xs font-semibold text-[#3A60AA] dark:text-[#B9C9E0] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t('Open Account Privacy Settings', 'فتح إعدادات خصوصية الحساب')}</span>
                <ExternalLink className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => setShowBlockedDialog(false)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {t('Close', 'إغلاق')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
