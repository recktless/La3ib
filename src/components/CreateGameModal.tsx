import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  SportType, 
  SkillLevel, 
  GenderPreference, 
  GameVisibility, 
  KuwaitArea,
  CostSharingMethod,
  getCostSharingMethods,
  getTodayLocalDate 
} from '../types';
import { 
  X, 
  Sparkles, 
  Calculator, 
  Users, 
  Check, 
  Plus, 
  ShieldCheck, 
  ShieldAlert,
  Calendar,
  Clock,
  MapPin,
  Lock,
  DollarSign
} from 'lucide-react';

const KUWAIT_AREAS: KuwaitArea[] = [
  'Kuwait City',
  'Salmiya',
  'Shuwaikh',
  'Hawalli',
  'Mishref',
  'Yarmouk',
  'Jabriya',
  'Sabhan',
  'Mahboula',
  'Abu Hasaniya',
  'Jahra',
  'Ardhiya'
];

export const CreateGameModal: React.FC = () => {
  const { 
    createGameModalOpen, 
    setCreateGameModalOpen, 
    createGamePrefill, 
    setCreateGamePrefill,
    createGame, 
    updateGame,
    players, 
    currentUser,
    firebaseUser,
    authStatus,
    setAuthModalOpen,
    setAuthModalMode,
    language,
    t 
  } = useApp();

  const isRestricted = currentUser?.canOrganize === false;
  const isPrivilegeLoading = authStatus === 'loading';

  const [title, setTitle] = useState('');
  const [sport, setSport] = useState<SportType>('Football');
  const [date, setDate] = useState<string>(() => getTodayLocalDate());
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('21:30');
  const [courtName, setCourtName] = useState('Mishref Youth Center Stadium');
  const [area, setArea] = useState<KuwaitArea>('Mishref');
  const [address, setAddress] = useState('Block 6, Mishref Oasis Road');
  const [isIndoor, setIsIndoor] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [totalCourtCostKWD, setTotalCourtCostKWD] = useState(15.000);
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('Intermediate');
  const [gender, setGender] = useState<GenderPreference>('Everyone');
  const [visibility, setVisibility] = useState<GameVisibility>('Public');
  const [description, setDescription] = useState('');
  const [costSharingEnabled, setCostSharingEnabled] = useState(() => Boolean(createGamePrefill?.costSharing?.enabled));
  const [selectedCostSharingMethods, setSelectedCostSharingMethods] = useState<CostSharingMethod[]>(() => {
    const methods = getCostSharingMethods(createGamePrefill?.costSharing);
    return methods.length > 0 ? methods : ['cash'];
  });
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isLinkedLi3ibBooking, setIsLinkedLi3ibBooking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or prefill from Li3ib booking or existing game whenever the modal opens
  useEffect(() => {
    if (!createGameModalOpen) {
      return;
    }

    if (createGamePrefill) {
      if (createGamePrefill.title) setTitle(createGamePrefill.title);
      if (createGamePrefill.sport) setSport(createGamePrefill.sport);
      setDate(createGamePrefill.date || getTodayLocalDate());
      if (createGamePrefill.startTime) setStartTime(createGamePrefill.startTime);
      if (createGamePrefill.endTime) setEndTime(createGamePrefill.endTime);
      if (createGamePrefill.courtName) setCourtName(createGamePrefill.courtName);
      if (createGamePrefill.area) setArea(createGamePrefill.area);
      if (createGamePrefill.address) setAddress(createGamePrefill.address);
      if (createGamePrefill.isIndoor !== undefined) setIsIndoor(createGamePrefill.isIndoor);
      if (createGamePrefill.maxPlayers) setMaxPlayers(createGamePrefill.maxPlayers);
      if (createGamePrefill.totalCourtCostKWD) setTotalCourtCostKWD(createGamePrefill.totalCourtCostKWD);
      if (createGamePrefill.skillLevel) setSkillLevel(createGamePrefill.skillLevel);
      if (createGamePrefill.description) setDescription(createGamePrefill.description);
      if (createGamePrefill.gender) setGender(createGamePrefill.gender);
      if (createGamePrefill.visibility) setVisibility(createGamePrefill.visibility);
      setIsLinkedLi3ibBooking(!!createGamePrefill.linkedBookingId);

      // Preserve existing game cost-sharing settings if editing/prefilling, otherwise default OFF
      if (createGamePrefill.costSharing !== undefined) {
        setCostSharingEnabled(Boolean(createGamePrefill.costSharing.enabled));
        const methods = getCostSharingMethods(createGamePrefill.costSharing);
        setSelectedCostSharingMethods(methods.length > 0 ? methods : ['cash']);
      } else {
        // Default OFF
        setCostSharingEnabled(false);
        setSelectedCostSharingMethods(['cash']);
      }
    } else {
      setTitle('Friday Night Football ⚽');
      setSport('Football');
      setDate(getTodayLocalDate());
      setStartTime('20:00');
      setEndTime('21:30');
      setCourtName('Mishref Youth Center Stadium');
      setArea('Mishref');
      setAddress('Block 6, Mishref Oasis Road');
      setIsIndoor(false);
      setMaxPlayers(10);
      setTotalCourtCostKWD(15.000);
      setSkillLevel('Intermediate');
      setGender('Everyone');
      setVisibility('Public');
      setDescription('Looking for intermediate players. Nothing too serious, just a good competitive match.');
      // Default OFF for newly created games
      setCostSharingEnabled(false);
      setSelectedCostSharingMethods(['cash']);
      setIsLinkedLi3ibBooking(false);
    }
  }, [createGamePrefill, createGameModalOpen]);

  if (!createGameModalOpen) return null;

  // Real-time automatic split calculation: Total court cost ÷ number of players = player's share
  const pricePerPlayer = maxPlayers > 0 
    ? parseFloat((totalCourtCostKWD / maxPlayers).toFixed(3))
    : 0;

  const toggleFriend = (id: string) => {
    setSelectedFriendIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleCostSharingMethod = (method: CostSharingMethod) => {
    setSelectedCostSharingMethods(prev => 
      prev.includes(method) ? prev.filter(item => item !== method) : [...prev, method]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRestricted || isPrivilegeLoading) {
      if (isRestricted) {
        setErrorMessage(t(
          'Your account is currently not allowed to organize games or book pitches. Please contact an administrator for assistance.',
          'حسابك غير مصرح له حالياً بإنشاء مباريات أو حجز الملاعب. يرجى التواصل مع الإدارة للمساعدة.'
        ));
      }
      return;
    }
    if (!title.trim()) {
      setErrorMessage(t('Please enter a game title.', 'يرجى إدخال اسم المباراة.'));
      return;
    }
    if (!date) {
      setErrorMessage(t('Please select a game date.', 'يرجى تحديد تاريخ المباراة.'));
      return;
    }
    if (!startTime) {
      setErrorMessage(t('Please select a start time.', 'يرجى تحديد وقت البدء.'));
      return;
    }
    if (!courtName.trim()) {
      setErrorMessage(t('Please provide a venue or court name.', 'يرجى إدخال اسم الملعب.'));
      return;
    }
    if (!maxPlayers || maxPlayers < 2) {
      setErrorMessage(t('Max players must be at least 2.', 'الحد الأدنى لعدد اللاعبين هو 2.'));
      return;
    }

    if (!currentUser || (!firebaseUser && authStatus === 'unauthenticated')) {
      setErrorMessage(t('Please sign in to your account to publish a game.', 'يرجى تسجيل الدخول لنشر المباراة.'));
      setAuthModalMode('login');
      setAuthModalOpen(true);
      return;
    }

    if (costSharingEnabled && selectedCostSharingMethods.length === 0) {
      setErrorMessage(t(
        'Please select at least one cost-sharing method (Cash, WAMD, or Request Link).',
        'يرجى اختيار طريقة واحدة على الأقل لتقاسم التكلفة (نقداً، ومض، أو طلب رابط).'
      ));
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);
    console.log('[CreateGame Diagnostic] Starting game submission, submitting set to true');

    try {
      if (createGamePrefill?.id) {
        await updateGame(createGamePrefill.id, {
          title: title.trim(),
          sport,
          date,
          startTime,
          endTime,
          courtName: courtName.trim(),
          area,
          address: address.trim(),
          isIndoor,
          maxPlayers: Number(maxPlayers),
          totalCourtCostKWD: Number(totalCourtCostKWD),
          pricePerPlayerKWD: pricePerPlayer,
          skillLevel,
          gender,
          visibility,
          description: description.trim() || undefined,
          costSharing: {
            enabled: costSharingEnabled,
            methods: costSharingEnabled ? selectedCostSharingMethods : undefined,
            method: costSharingEnabled && selectedCostSharingMethods.length > 0 ? selectedCostSharingMethods[0] : undefined,
            estimatedShare: costSharingEnabled ? pricePerPlayer : undefined
          }
        });
        console.log('[CreateGame Diagnostic] updateGame operation succeeded');
      } else {
        await createGame({
          title: title.trim(),
          sport,
          date,
          startTime,
          endTime,
          courtName: courtName.trim(),
          area,
          address: address.trim(),
          coordinates: { x: 50 + Math.floor(Math.random() * 20 - 10), y: 50 + Math.floor(Math.random() * 20 - 10) },
          isIndoor,
          maxPlayers: Number(maxPlayers),
          totalCourtCostKWD: Number(totalCourtCostKWD),
          pricePerPlayerKWD: pricePerPlayer,
          skillLevel,
          gender,
          visibility,
          status: 'Open',
          description: description.trim() || undefined,
          linkedBookingId: createGamePrefill?.linkedBookingId,
          cancellationPolicy: 'Free cancellation up to 4 hours before kickoff.',
          costSharing: {
            enabled: costSharingEnabled,
            methods: costSharingEnabled ? selectedCostSharingMethods : undefined,
            method: costSharingEnabled && selectedCostSharingMethods.length > 0 ? selectedCostSharingMethods[0] : undefined,
            estimatedShare: costSharingEnabled ? pricePerPlayer : undefined
          }
        });
        console.log('[CreateGame Diagnostic] createGame operation succeeded');
      }

      setCreateGamePrefill(null);
      setCreateGameModalOpen(false);
    } catch (err: any) {
      console.error('[CreateGame Diagnostic] Failed to create game:', {
        code: err?.code,
        message: err?.message || String(err)
      });
      let friendlyMsg = t('Failed to save game to Cloud Firestore. Please check your connection and try again.', 'فشل حفظ المباراة في قاعدة البيانات. يرجى التحقق من الاتصال والمحاولة مجدداً.');
      if (err?.message?.includes('timed out') || err?.message?.includes('TIMEOUT')) {
        friendlyMsg = t('Operation timed out connecting to Firestore. Please check your connection and try again.', 'انتهت مهلة الاتصال بقاعدة البيانات. يرجى التحقق من الاتصال والمحاولة مجدداً.');
      } else if (err?.message?.includes('permission-denied') || err?.message?.includes('PERMISSION_DENIED')) {
        friendlyMsg = t('Permission denied: You must be signed in with a valid account to publish a game.', 'تم رفض الصلاحية: يجب تسجيل الدخول بحساب صالح لنشر المباراة.');
      } else if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.error) friendlyMsg = parsed.error;
        } catch {
          friendlyMsg = err.message;
        }
      }
      setErrorMessage(friendlyMsg);
    } finally {
      setSubmitting(false);
      console.log('[CreateGame Diagnostic] Loading state reset (submitting=false)');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              +
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {t('Create a Game in Kuwait', 'إنشاء مباراة جديدة في الكويت')}
              </h2>
              {isLinkedLi3ibBooking && (
                <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {t('Imported seamlessly from your Li3ib booking', 'تم استيراد بيانات الحجز من Li3ib بنجاح')}
                </p>
              )}
            </div>
          </div>
          <button 
            onClick={() => {
              setCreateGameModalOpen(false);
              setCreateGamePrefill(null);
            }}
            className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Prominent Restriction Warning Banner */}
          {isRestricted && (
            <div 
              data-testid="booking-restricted-banner"
              role="alert"
              className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-950/80 via-neutral-900 to-amber-950/80 border-2 border-amber-500/60 shadow-lg shadow-amber-950/40 text-amber-100 flex items-start gap-3.5"
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

          {/* Game Title */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              {t('Game Name', 'اسم المباراة')} *
            </label>
            <input 
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Friday Football, Padel Smash 2v2..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          {/* Sport & Skill Level */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Sport', 'الرياضة')}
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value as SportType)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="Football">⚽ Football (كرة القدم)</option>
                <option value="Padel">🎾 Padel (بادل)</option>
                <option value="Basketball">🏀 Basketball (كرة السلة)</option>
                <option value="Volleyball">🏐 Volleyball (كرة الطائرة)</option>
                <option value="Tennis">🎾 Tennis (تنس)</option>
                <option value="Badminton">🏸 Badminton (ريشة)</option>
                <option value="Other">🏆 Other (أخرى)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Skill Level', 'المستوى الرياضي')}
              </label>
              <select
                value={skillLevel}
                onChange={(e) => setSkillLevel(e.target.value as SkillLevel)}
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value="Beginner">Beginner (مبتدئ)</option>
                <option value="Casual">Casual (ودي / ترويحي)</option>
                <option value="Intermediate">Intermediate (متوسط)</option>
                <option value="Advanced">Advanced (متقدم)</option>
                <option value="Competitive">Competitive (تنافسي عالي)</option>
                <option value="Any level">Any level (جميع المستويات)</option>
              </select>
            </div>
          </div>

          {/* Schedule: Date & Times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Date', 'التاريخ')}
              </label>
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Start Time', 'وقت البداية')}
              </label>
              <input 
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('End Time', 'وقت النهاية')}
              </label>
              <input 
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Court & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Court / Venue', 'اسم الملعب / المرفق')}
              </label>
              <input 
                type="text"
                required
                value={courtName}
                onChange={(e) => setCourtName(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Kuwait Area', 'المنطقة في الكويت')}
              </label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value as KuwaitArea)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {KUWAIT_AREAS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* COURT COST & COST SHARING */}
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                {t('Court Cost & Estimates', 'تكلفة الملعب والتقديرات')}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  {t('Total Court Cost (KWD)', 'إجمالي تكلفة الملعب (د.ك)')}
                </label>
                <input 
                  type="number"
                  step="0.500"
                  min="0"
                  value={totalCourtCostKWD}
                  onChange={(e) => setTotalCourtCostKWD(parseFloat(e.target.value) || 0)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">
                  {t('Max Players', 'العدد الأقصى للاعبين')}
                </label>
                <input 
                  type="number"
                  min="2"
                  max="30"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value) || 2)}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Split the cost with players Toggle */}
            <div className="pt-3 border-t border-neutral-800/80">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">
                      {t('Split the cost with players', 'تقاسم التكلفة مع اللاعبين')}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {t(
                      'When OFF, no payment method is required or shown. When ON, select how players pay.',
                      'عند الإيقاف، لا تطلب طريقة دفع من اللاعبين. عند التفعيل، اختر طريقة الدفع للمنظم.'
                    )}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={costSharingEnabled}
                    onChange={(e) => setCostSharingEnabled(e.target.checked)}
                    className="sr-only peer"
                    aria-label="Split the cost with players"
                  />
                  <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* When ON: Require host to select one or more methods */}
              {costSharingEnabled && (
                <div className="space-y-3 pt-3 mt-3 border-t border-neutral-800/80 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">
                      {t('Select Cost-Sharing Method (Required)', 'اختر طريقة تقاسم التكلفة (مطلوبة)')}
                    </label>
                    <span className="text-[10px] text-neutral-400">
                      {t('Choose any combination', 'اختر طريقة أو أكثر')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Cash */}
                    <div
                      onClick={() => toggleCostSharingMethod('cash')}
                      className={`p-3 rounded-xl border text-start transition-all cursor-pointer select-none flex flex-col justify-between ${
                        selectedCostSharingMethods.includes('cash')
                          ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          💵 {t('Cash', 'نقداً')}
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedCostSharingMethods.includes('cash')}
                          onChange={() => {}}
                          aria-label="Cash"
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-snug">
                        {t('Players pay the host outside La3ib.', 'يدفع اللاعبون للمنظم نقداً خارج تطبيق لعيب.')}
                      </p>
                    </div>

                    {/* WAMD */}
                    <div
                      onClick={() => toggleCostSharingMethod('wamd')}
                      className={`p-3 rounded-xl border text-start transition-all cursor-pointer select-none flex flex-col justify-between ${
                        selectedCostSharingMethods.includes('wamd')
                          ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          ⚡ {t('WAMD', 'ومض')}
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedCostSharingMethods.includes('wamd')}
                          onChange={() => {}}
                          aria-label="WAMD"
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-snug">
                        {t('Players pay the host using WAMD outside La3ib.', 'يدفع اللاعبون للمنظم عبر ومض خارج تطبيق لعيب.')}
                      </p>
                    </div>

                    {/* Request Link */}
                    <div
                      onClick={() => toggleCostSharingMethod('request_link')}
                      className={`p-3 rounded-xl border text-start transition-all cursor-pointer select-none flex flex-col justify-between ${
                        selectedCostSharingMethods.includes('request_link')
                          ? 'bg-emerald-950/60 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs flex items-center gap-1.5">
                          🔗 {t('Request Link', 'طلب رابط دفع')}
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedCostSharingMethods.includes('request_link')}
                          onChange={() => {}}
                          aria-label="Request Link"
                          className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                        />
                      </div>
                      <p className="text-[10px] text-neutral-400 leading-snug">
                        {t('Participants can request a payment link from the host.', 'يمكن للمشاركين طلب رابط دفع من المنظم.')}
                      </p>
                    </div>
                  </div>

                  {selectedCostSharingMethods.length === 0 && (
                    <p className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 mt-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {t('Please select at least one method.', 'يرجى اختيار طريقة دفع واحدة على الأقل.')}
                    </p>
                  )}

                  {/* Estimated Share per player clearly labelled as estimate */}
                  <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                        {t('Estimated Share per Player (Estimate)', 'الحصة التقديرية لكل لاعب (تقديري)')}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        Formula: {totalCourtCostKWD.toFixed(3)} KWD ÷ {maxPlayers} players
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 text-end">
                      <span className="text-lg font-black text-white">{pricePerPlayer.toFixed(3)}</span>
                      <span className="text-xs font-bold text-emerald-400">KWD</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gender & Visibility */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Gender Preference', 'الجنس')}
              </label>
              <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800">
                {(['Everyone', 'Men', 'Women'] as GenderPreference[]).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      gender === g ? 'bg-emerald-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {g === 'Everyone' ? t('Everyone', 'الجميع') : g === 'Men' ? t('Men', 'رجال') : t('Women', 'نساء')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                {t('Game Visibility', 'نوع النشر')}
              </label>
              <div className="flex rounded-xl bg-neutral-950 p-1 border border-neutral-800">
                {(['Public', 'Private', 'Invite only'] as GameVisibility[]).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVisibility(v)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      visibility === v ? 'bg-emerald-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {v === 'Public' ? t('Public', 'عام') : v === 'Private' ? t('Private', 'خاص') : t('Invite', 'دعوات')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Invite Friends Checklist */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
              {t('Quick Invite Friends (Optional)', 'دعوة سريعة للأصدقاء (اختياري)')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {players.filter(p => p.id !== currentUser.id).slice(0, 6).map(friend => {
                const isSelected = selectedFriendIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleFriend(friend.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-emerald-950/60 border-emerald-500 text-white' 
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <img 
                      src={friend.avatar} 
                      alt={friend.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{friend.name.split(' ')[0]}</p>
                      <p className="text-[10px] text-neutral-500 truncate">{friend.area}</p>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Organizer Description */}
          <div>
            <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
              {t('Description / Organizer Notes', 'رسالة المنظم للمشاركين')}
            </label>
            <textarea 
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('Looking for intermediate players. Nothing too serious, just a good game...', 'نبحث عن لاعبين بمستوى متوسط، اللعب حماسي وودي...')}
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl p-3 text-sm text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-2">
              <span className="leading-relaxed">{errorMessage}</span>
              <button 
                type="button" 
                onClick={() => setErrorMessage(null)} 
                className="text-rose-400 hover:text-rose-200 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-3 border-t border-neutral-800 flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-neutral-400 block">
                {costSharingEnabled ? t('Estimated Share (Estimate):', 'الحصة التقديرية (تقديري):') : t('Cost Sharing:', 'تقاسم التكلفة:')}
              </span>
              <span className="text-base sm:text-lg font-black text-emerald-400">
                {costSharingEnabled ? `${pricePerPlayer.toFixed(3)} KWD` : t('Disabled (Free to Join)', 'غير مفعل (مجانياً)')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreateGameModalOpen(false);
                  setCreateGamePrefill(null);
                  setErrorMessage(null);
                }}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-neutral-300 font-bold text-xs"
              >
                {t('Cancel', 'إلغاء')}
              </button>

              <div className="flex flex-col items-end gap-1">
                <button
                  type="submit"
                  disabled={isRestricted || isPrivilegeLoading || submitting}
                  aria-label="Post Booking"
                  onKeyDown={(e) => {
                    if (isRestricted || isPrivilegeLoading) {
                      e.preventDefault();
                    }
                  }}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
                    isRestricted || isPrivilegeLoading
                      ? 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed opacity-60 shadow-none'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-neutral-950 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                      <span>{t('Saving to Firestore...', 'جاري الحفظ في Firestore...')}</span>
                    </>
                  ) : createGamePrefill?.id ? (
                    t('Save Match Settings', 'حفظ تعديلات المباراة')
                  ) : (
                    t('Post Game & Open Spots', 'نشر المباراة وفتح الحجز')
                  )}
                </button>
                {isRestricted && (
                  <span className="text-[10px] text-amber-400 font-semibold text-right rtl:text-left">
                    {t('Account restricted from organizing games', 'حسابك مقيد من تنظيم المباريات')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
