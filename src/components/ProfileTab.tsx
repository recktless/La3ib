import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Trophy, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  Edit3, 
  Share2, 
  Lock, 
  UserPlus, 
  Flame,
  Star,
  Camera,
  Loader2,
  LogOut,
  LogIn,
  Sparkles,
  Shield,
  Mail,
  User,
  Check,
  X,
  History,
  Activity,
  Ban,
  UserCheck,
  Key,
  Trash2,
  AlertTriangle,
  AlertCircle
} from 'lucide-react';
import { SportType, SkillLevel, KuwaitArea, PlayerActivityStats } from '../types';
import { isFirebaseConfigured, uploadUserProfilePicture, validateUsername, mapFirebaseAuthError } from '../lib/firebase';

const KUWAIT_AREAS: KuwaitArea[] = [
  'Salmiya', 'Shuwaikh', 'Mishref', 'Kuwait City', 'Hawalli', 'Yarmouk', 'Jabriya', 'Sabhan', 'Mahboula', 'Abu Hasaniya', 'Jahra', 'Ardhiya'
];

const SPORT_ICONS: Record<SportType, string> = {
  Football: '⚽',
  Padel: '🎾',
  Basketball: '🏀',
  Volleyball: '🏐',
  Tennis: '🎾',
  Badminton: '🏸',
  Other: '🏆',
};

const AVAILABLE_SPORTS: SportType[] = [
  'Football',
  'Padel',
  'Basketball',
  'Volleyball',
  'Tennis',
  'Badminton',
  'Other'
];

const SKILL_LEVEL_OPTIONS: SkillLevel[] = [
  'Beginner',
  'Casual',
  'Intermediate',
  'Advanced',
  'Competitive'
];

export const ProfileTab: React.FC = () => {
  const { 
    currentUser, 
    updateCurrentUserProfile, 
    loadPlayerActivity,
    blockedUserIds,
    blockedPlayersList,
    unblockPlayer,
    isBlockActionLoading,
    authStatus, 
    firebaseUser,
    setAuthModalOpen, 
    setAuthModalMode, 
    logout, 
    continueAsDemo,
    sendPasswordResetEmailAction,
    deleteAccountAction,
    reauthenticateAction,
    checkUsername,
    t,
    language 
  } = useApp();

  const isGoogleUser = Boolean(firebaseUser?.providerData?.some(p => p.providerId === 'google.com'));

  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [usernameInput, setUsernameInput] = useState(currentUser.username || '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [bioInput, setBioInput] = useState(currentUser.bio);
  const [areaInput, setAreaInput] = useState<KuwaitArea>(currentUser.area);
  const [ageInput, setAgeInput] = useState(currentUser.age?.toString() || '26');
  const [showAge, setShowAge] = useState(currentUser.privacy.showAge);
  const [showPhone, setShowPhone] = useState(currentUser.privacy.showPhone);
  const [allowDirectInvites, setAllowDirectInvites] = useState(currentUser.privacy.allowDirectInvites);
  const [selectedFavoriteSports, setSelectedFavoriteSports] = useState<SportType[]>(currentUser.favoriteSports || []);
  const [skillsInput, setSkillsInput] = useState<{ [key in SportType]?: SkillLevel }>(currentUser.skills || {});
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account Security state
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Factual real activity stats for current user
  const [myActivityStats, setMyActivityStats] = useState<PlayerActivityStats | null>(null);
  const [isMyActivityLoading, setIsMyActivityLoading] = useState(false);

  useEffect(() => {
    const uid = currentUser.uid || currentUser.id;
    if (!uid) return;
    let isSubscribed = true;
    setIsMyActivityLoading(true);

    loadPlayerActivity(uid)
      .then(stats => {
        if (isSubscribed) {
          setMyActivityStats(stats);
          setIsMyActivityLoading(false);
        }
      })
      .catch(err => {
        if (isSubscribed) {
          console.warn('[ProfileTab] Could not load activity stats for current user:', err);
          setIsMyActivityLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentUser.id, currentUser.uid, loadPlayerActivity]);

  useEffect(() => {
    setNameInput(currentUser.name);
    setUsernameInput(currentUser.username || '');
    setUsernameError(null);
    setBioInput(currentUser.bio);
    setAreaInput(currentUser.area);
    setAgeInput(currentUser.age?.toString() || '26');
    setSelectedFavoriteSports(currentUser.favoriteSports || []);
    setSkillsInput(currentUser.skills || {});
    setShowAge(currentUser.privacy.showAge);
    setShowPhone(currentUser.privacy.showPhone);
    setAllowDirectInvites(currentUser.privacy.allowDirectInvites);
  }, [currentUser]);

  const toggleFavoriteSport = (sport: SportType) => {
    setSelectedFavoriteSports(prev => {
      if (prev.includes(sport)) {
        return prev.filter(s => s !== sport);
      } else {
        setSkillsInput(curr => {
          if (!curr[sport]) {
            return { ...curr, [sport]: 'Intermediate' };
          }
          return curr;
        });
        return [...prev, sport];
      }
    });
  };

  const handleSkillChange = (sport: SportType, level: SkillLevel) => {
    setSkillsInput(prev => ({
      ...prev,
      [sport]: level
    }));
  };

  const removeSkill = (sport: SportType) => {
    setSkillsInput(prev => {
      const next = { ...prev };
      delete next[sport];
      return next;
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setNameInput(currentUser.name);
    setUsernameInput(currentUser.username || '');
    setUsernameError(null);
    setBioInput(currentUser.bio);
    setAreaInput(currentUser.area);
    setAgeInput(currentUser.age?.toString() || '26');
    setSelectedFavoriteSports(currentUser.favoriteSports || []);
    setSkillsInput(currentUser.skills || {});
    setShowAge(currentUser.privacy.showAge);
    setShowPhone(currentUser.privacy.showPhone);
    setAllowDirectInvites(currentUser.privacy.allowDirectInvites);
    setSaveError(null);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setSaveError(null);
    try {
      const userId = currentUser.uid || currentUser.id;
      if (isFirebaseConfigured && authStatus === 'authenticated') {
        const downloadUrl = await uploadUserProfilePicture(file, userId);
        await updateCurrentUserProfile({ avatar: downloadUrl });
      } else {
        const reader = new FileReader();
        reader.onload = async (event) => {
          if (event.target?.result) {
            await updateCurrentUserProfile({ avatar: event.target.result as string });
          }
        };
        reader.readAsDataURL(file);
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
      setSaveError(err?.message || t('Failed to upload avatar.', 'فشل رفع الصورة الشخصية.'));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError(null);

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setSaveError(t('Display name cannot be empty.', 'الاسم المعروض لا يمكن أن يكون فارغاً.'));
      setIsSaving(false);
      return;
    }
    if (trimmedName.length > 60) {
      setSaveError(t('Display name cannot exceed 60 characters.', 'الاسم المعروض لا يمكن أن يتجاوز 60 حرفاً.'));
      setIsSaving(false);
      return;
    }

    const trimmedUsername = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (trimmedUsername !== (currentUser.username || '').toLowerCase()) {
      const val = validateUsername(trimmedUsername);
      if (!val.valid) {
        setSaveError(val.error || t('Invalid username format.', 'صيغة اسم المستخدم غير صحيحة.'));
        setIsSaving(false);
        return;
      }
      const avail = await checkUsername(trimmedUsername);
      if (!avail.available) {
        setSaveError(avail.error || t('Username is already taken.', 'اسم المستخدم محجوز بالفعل.'));
        setIsSaving(false);
        return;
      }
    }

    if (bioInput.length > 300) {
      setSaveError(t('Bio cannot exceed 300 characters.', 'النبذة الرياضية لا يمكن أن تتجاوز 300 حرف.'));
      setIsSaving(false);
      return;
    }

    const parsedAge = parseInt(ageInput, 10);
    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 99) {
      setSaveError(t('Please enter a valid age between 10 and 99.', 'يرجى إدخال عمر صحيح بين 10 و 99.'));
      setIsSaving(false);
      return;
    }

    try {
      await updateCurrentUserProfile({
        name: trimmedName,
        username: trimmedUsername,
        bio: bioInput.slice(0, 300),
        area: areaInput,
        age: parsedAge,
        favoriteSports: selectedFavoriteSports,
        skills: skillsInput,
        privacy: {
          showAge,
          showPhone,
          allowDirectInvites
        }
      });
      setIsEditing(false);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setSaveError(err?.message || t('Failed to save profile changes. Please try again.', 'فشل في حفظ التعديلات. يرجى المحاولة مجدداً.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const targetEmail = currentUser.email || firebaseUser?.email;
    if (!targetEmail) {
      setResetNotice(t('No email address registered with this account.', 'لا يوجد بريد إلكتروني مسجل لهذا الحساب.'));
      return;
    }
    setIsSendingReset(true);
    setResetNotice(null);
    try {
      await sendPasswordResetEmailAction(targetEmail);
      setResetNotice(t('Password reset link sent to your registered email!', 'تم إرسال رابط استعادة كلمة المرور إلى بريدك المسجل!'));
    } catch (err: any) {
      setResetNotice(mapFirebaseAuthError(err, language));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    setDeleteError(null);

    // If email user and no password provided, prompt before calling deletion
    if (authStatus === 'authenticated' && !isGoogleUser && !deletePasswordInput.trim()) {
      setDeleteError(t('Please enter your password to confirm account deletion.', 'يرجى إدخال كلمة المرور لتأكيد حذف الحساب.'));
      return;
    }

    setIsDeletingAccount(true);
    try {
      await deleteAccountAction(deletePasswordInput.trim() || undefined);
      setShowDeleteConfirmModal(false);
      setDeletePasswordInput('');
    } catch (err: any) {
      setDeleteError(mapFirebaseAuthError(err, language));
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="max-w-4xl mx-auto py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        <p className="text-xs text-neutral-400 font-medium">
          {t('Loading athlete profile...', 'جارٍ تحميل الملف الرياضي...')}
        </p>
      </div>
    );
  }

  const activeSkillsList = Array.from(
    new Set([
      ...selectedFavoriteSports,
      ...(Object.keys(skillsInput) as SportType[])
    ])
  );
  const unratedSports = AVAILABLE_SPORTS.filter(s => !activeSkillsList.includes(s));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Account Authentication Status Card */}
      <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
            authStatus === 'authenticated'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : authStatus === 'demo'
              ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              : 'bg-neutral-800 text-neutral-400'
          }`}>
            {authStatus === 'authenticated' ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : authStatus === 'demo' ? (
              <Sparkles className="w-5 h-5 text-amber-400" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t('Account State', 'حالة الحساب')}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                authStatus === 'authenticated'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : authStatus === 'demo'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-neutral-800 text-neutral-300'
              }`}>
                {authStatus === 'authenticated'
                  ? t('Firebase Verified Athlete', 'موثق عبر Firebase')
                  : authStatus === 'demo'
                  ? t('Demo Mode (Ahmed Al-Kandari)', 'حساب تجريبي (أحمد الكندري)')
                  : t('Unauthenticated Guest', 'غير مسجل (زائر)')}
              </span>
            </div>
            <p className="text-xs text-neutral-300 mt-0.5">
              {authStatus === 'authenticated'
                ? currentUser.email || t('Authenticated with Firebase Auth', 'مسجل بنجاح عبر Firebase Auth')
                : authStatus === 'demo'
                ? t('Exploring with mock identity. Sign in or register to persist your own data.', 'تتصفح حالياً بالحساب التجريبي. سجل دخولك لحفظ بياناتك الخاصة.')
                : t('Sign in or create an account with email or Google to activate your athlete profile.', 'سجل دخولك أو أنشئ حساباً لتفعيل ملفك الرياضي.')}
            </p>
          </div>
        </div>

        {/* Auth Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {authStatus === 'authenticated' ? (
            <button
              onClick={logout}
              className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-red-950/60 border border-neutral-700 hover:border-red-800/80 text-xs font-bold text-neutral-300 hover:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('Sign Out', 'تسجيل الخروج')}</span>
            </button>
          ) : authStatus === 'demo' ? (
            <>
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('Sign In / Register', 'دخول / حساب جديد')}</span>
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-xs font-semibold text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title={t('Log out of the demo account to test unauthenticated state', 'تسجيل الخروج من الحساب التجريبي')}
              >
                <span>{t('Log Out Demo', 'خروج من التجريبي')}</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  setAuthModalMode('login');
                  setAuthModalOpen(true);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('Sign In / Register', 'تسجيل الدخول')}</span>
              </button>
              <button
                onClick={continueAsDemo}
                className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
              >
                <span>{t('Use Demo Mode', 'استخدام التجريبي')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Profile Header Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl">
        {/* Cover gradient */}
        <div className="h-36 bg-gradient-to-r from-emerald-700 via-teal-800 to-neutral-900 relative">
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-1.5 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEditing ? t('Close Settings', 'إغلاق') : t('Edit Profile & Bio', 'تعديل الملف الرياضي')}</span>
            </button>
          </div>
        </div>

        {/* Profile Details Bar */}
        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="relative group">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-neutral-900 shadow-2xl"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title={t('Upload Profile Photo', 'رفع صورة شخصية')}
                  className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5 text-white mb-1" />
                      <span className="text-[10px]">{t('Change', 'تغيير')}</span>
                    </>
                  )}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/*"
                  className="hidden" 
                />
                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-neutral-900" />
              </div>

              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-white">{currentUser.name}</h1>
                  <span className="text-xs text-neutral-400 font-mono">@{currentUser.username}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{currentUser.area}, Kuwait</span>
                  {currentUser.privacy.showAge && currentUser.age && (
                    <>
                      <span>•</span>
                      <span>{currentUser.age} {t('yrs', 'سنة')}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Attendance & Reliability Ribbon */}
            <div className="bg-emerald-950/70 border border-emerald-800/80 rounded-2xl p-3.5 text-right sm:text-center self-start sm:self-auto">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">
                {t('Attendance Reliability', 'موثوقية الحضور')}
              </span>
              <div className="text-2xl font-black text-white flex items-center justify-center gap-1">
                <span>{currentUser.attendanceRate}%</span>
                <Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
              </div>
              <span className="text-[10px] text-neutral-400 block">{t('High Reliability Tier', 'فئة موثوقة جداً')}</span>
            </div>
          </div>

          {/* Bio */}
          <p className="text-xs sm:text-sm text-neutral-300 max-w-2xl leading-relaxed">
            {currentUser.bio}
          </p>

          {savedNotice && (
            <div className="mt-3 p-2.5 bg-emerald-950/80 text-emerald-300 text-xs rounded-xl border border-emerald-800 flex items-center justify-center gap-2 font-bold animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{t('Profile & settings saved successfully to Firestore!', 'تم حفظ التعديلات والبيانات بنجاح في Firestore!')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editing / Privacy Controls Box */}
      {isEditing && (
        <div className="p-6 rounded-3xl bg-neutral-900 border border-neutral-800 space-y-4 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              {t('Edit Athlete Profile', 'تعديل الملف الرياضي')}
            </h3>
            {authStatus === 'authenticated' && (
              <span className="text-[11px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full font-medium">
                {t('Syncs with Firestore', 'مزامنة مباشرة مع Firestore')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                {t('Display Name', 'الاسم المعروض')}
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t('e.g. Faisal Al-Sabah', 'مثال: فيصل الصباح')}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                {t('Unique Username', 'اسم المستخدم الفريد')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-mono">@</span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setUsernameInput(raw);
                    setUsernameError(null);
                  }}
                  placeholder="athlete_kw"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-7 pr-3 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                {t('3–25 chars (letters, numbers, underscores).', '٣ إلى ٢٥ حرفاً (أحرف، أرقام، وشرطة سفلية).')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                {t('Kuwait Area', 'المنطقة السكنية')}
              </label>
              <select
                value={areaInput}
                onChange={(e) => setAreaInput(e.target.value as KuwaitArea)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {KUWAIT_AREAS.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                {t('Age', 'العمر')}
              </label>
              <input
                type="number"
                min="10"
                max="99"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Favorite Sports Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-400">
                {t('Favorite Sports', 'الرياضات المفضلة')}
              </label>
              <span className="text-[11px] text-neutral-500">
                {t('Tap to toggle', 'اضغط للاختيار')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SPORTS.map(sport => {
                const isSelected = selectedFavoriteSports.includes(sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => toggleFavoriteSport(sport)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-950'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <span>{SPORT_ICONS[sport] || '🏅'}</span>
                    <span>{sport}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-400 ms-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sports Skills Editor */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-400">
                {t('Sports & Skill Levels', 'الرياضات والمستوى الرياضي')}
              </label>
              <span className="text-[11px] text-neutral-500">
                {t('Rate your proficiency', 'حدد مستوى مهارتك')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeSkillsList.map(sport => {
                const currentLevel = skillsInput[sport] || 'Intermediate';
                return (
                  <div
                    key={sport}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/90"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{SPORT_ICONS[sport] || '🏅'}</span>
                      <span className="text-xs font-bold text-white">{sport}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={currentLevel}
                        onChange={(e) => handleSkillChange(sport, e.target.value as SkillLevel)}
                        className="bg-neutral-900 border border-neutral-700 text-emerald-400 text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {SKILL_LEVEL_OPTIONS.map(lvl => (
                          <option key={lvl} value={lvl} className="bg-neutral-900 text-white font-normal">
                            {lvl}
                          </option>
                        ))}
                      </select>

                      {activeSkillsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSkill(sport)}
                          title={t('Remove skill', 'إزالة')}
                          className="p-1 text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {unratedSports.length > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-neutral-400">{t('+ Add skill for:', '+ إضافة مهارة لـ:')}</span>
                <select
                  value=""
                  onChange={(e) => {
                    const sportToAdd = e.target.value as SportType;
                    if (sportToAdd) {
                      handleSkillChange(sportToAdd, 'Intermediate');
                    }
                  }}
                  className="bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-300 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">{t('Choose sport...', 'اختر الرياضة...')}</option>
                  {unratedSports.map(s => (
                    <option key={s} value={s}>{SPORT_ICONS[s]} {s}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1">
              {t('Sports Bio', 'النبذة الرياضية')}
            </label>
            <textarea
              rows={3}
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder={t('Tell other players about your playstyle, position, and schedule...', 'اكتب نبذة عن أسلوب لعبك، مركزك المفضل، ومواعيدك...')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-neutral-800 text-xs">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/80 cursor-pointer transition-colors">
              <span className="text-neutral-300">{t('Show Age on Public Profile', 'إظهار العمر في الملف العام')}</span>
              <input 
                type="checkbox"
                checked={showAge}
                onChange={(e) => setShowAge(e.target.checked)}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-950 hover:bg-neutral-800/80 cursor-pointer transition-colors">
              <span className="text-neutral-300">{t('Allow Direct Game Invites from Community', 'السماح بتلقي دعوات المباريات المباشرة')}</span>
              <input 
                type="checkbox"
                checked={allowDirectInvites}
                onChange={(e) => setAllowDirectInvites(e.target.checked)}
                className="accent-emerald-500 w-4 h-4"
              />
            </label>
          </div>

          {saveError && (
            <div className="p-3 bg-red-950/80 border border-red-800 text-red-300 text-xs rounded-xl font-medium">
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button 
              type="button"
              onClick={handleCancelEdit} 
              className="px-4 py-2 text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button 
              type="button"
              onClick={handleSaveProfile} 
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('Save Changes to Firestore', 'حفظ التعديلات في Firestore')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3 Key Metric Blocks (Games Played, Hosted, Upcoming) */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block">
            {t('Games Played', 'مباريات لعبها')}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-white mt-1 block">
            {myActivityStats !== null ? myActivityStats.gamesPlayed : (currentUser.gamesPlayed ?? 0)}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block">
            {t('Games Hosted', 'مباريات نظمها')}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 block">
            {myActivityStats !== null ? myActivityStats.gamesHosted : (currentUser.gamesHosted ?? 0)}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-center">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-400 block">
            {t('Upcoming Games', 'مباريات قادمة')}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-400 mt-1 block">
            {myActivityStats !== null ? myActivityStats.upcomingGames : 0}
          </span>
        </div>
      </div>

      {/* Recent Activity for Current User */}
      <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <span>{t('Recent Activity', 'النشاط الأخير')}</span>
          </h3>
          {isMyActivityLoading && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>{t('Updating...', 'تحديث...')}</span>
            </div>
          )}
        </div>

        {myActivityStats && myActivityStats.recentActivities.length > 0 ? (
          <div className="space-y-2 divide-y divide-neutral-900">
            {myActivityStats.recentActivities.map((act) => (
              <div 
                key={act.gameId}
                className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-lg shrink-0">{SPORT_ICONS[act.sport] || '🏆'}</span>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{act.title}</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {act.courtName ? `${act.courtName} • ` : ''}{act.area || 'Kuwait'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
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
          <p className="text-xs text-neutral-500 italic">
            {t('No recent match activity found yet.', 'لم يتم تسجيل نشاط مباريات بعد.')}
          </p>
        )}
      </div>

      {/* Favorite Sports & Skill Badges */}
      <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
          {t('Sports & Skill Levels', 'الرياضات والمستوى')}
        </h3>

        {/* Favorite sports tags */}
        {currentUser.favoriteSports && currentUser.favoriteSports.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-xs font-semibold text-neutral-400">
              {t('Favorite Sports:', 'الرياضات المفضلة:')}
            </span>
            {currentUser.favoriteSports.map(sport => (
              <span 
                key={sport}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold"
              >
                <span>{SPORT_ICONS[sport] || '🏅'}</span>
                <span>{sport}</span>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(currentUser.skills || {}).map(([sportName, level]) => (
            <div 
              key={sportName} 
              className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900 border border-neutral-800/80"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-lg">
                  {SPORT_ICONS[sportName as SportType] || '🏅'}
                </span>
                <span className="text-xs font-bold text-white">{sportName}</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2.5 py-1 rounded-full">
                {level}
              </span>
            </div>
          ))}
          {Object.keys(currentUser.skills || {}).length === 0 && (
            <p className="text-xs text-neutral-500 italic">
              {t('No sports skills listed yet. Click Edit Profile to add skills.', 'لا توجد رياضات مضافة بعد. اضغط على تعديل لإضافة المهارات.')}
            </p>
          )}
        </div>
      </div>

      {/* Community Badges */}
      <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-200">
          {t('Kuwait Community Badges', 'أوسمة المجتمع الرياضي')}
        </h3>

        <div className="flex flex-wrap gap-2.5">
          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs">
            <span className="text-base">🤝</span>
            <div>
              <p className="font-bold text-white">Fair Play Hero</p>
              <p className="text-[10px] text-neutral-400">Zero disputes reported</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs">
            <span className="text-base">⏰</span>
            <div>
              <p className="font-bold text-white">Always Punctual</p>
              <p className="text-[10px] text-neutral-400">Arrives 15 min early</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3.5 py-2 rounded-xl text-xs">
            <span className="text-base">👑</span>
            <div>
              <p className="font-bold text-white">Top Li3ib Host</p>
              <p className="text-[10px] text-neutral-400">8 games organized</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blocked Players Management (Step 6) */}
      <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {t('Blocked Players', 'قائمة المحظورين')}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {t('Manage players you have blocked from interacting with you in the community.', 'إدارة اللاعبين المحظورين من التفاعل معك في المجتمع.')}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
            {blockedPlayersList.length}
          </span>
        </div>

        {blockedPlayersList.length === 0 ? (
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/60 text-center text-xs text-neutral-500 italic">
            {t('You have not blocked any players.', 'لا يوجد أي لاعبين في قائمة الحظر.')}
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/60 rounded-2xl bg-neutral-900 border border-neutral-800/80 overflow-hidden">
            {blockedPlayersList.map(blockedPlayer => {
              const pid = blockedPlayer.id || blockedPlayer.uid || '';
              const isLoading = isBlockActionLoading(pid);
              return (
                <div key={pid} className="p-3.5 flex items-center justify-between gap-3 hover:bg-neutral-800/40 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={blockedPlayer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} 
                      alt={blockedPlayer.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-700 shrink-0" 
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{blockedPlayer.name}</p>
                      <p className="text-[10px] text-neutral-400 font-mono truncate">@{blockedPlayer.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => unblockPlayer(pid)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{t('Unblock', 'إلغاء الحظر')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Security & Authentication Management */}
      <div className="p-6 rounded-3xl bg-neutral-950 border border-neutral-800 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {t('Account & Security Settings', 'إعدادات الحساب والأمان')}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {t('Manage your sign-in credentials, password recovery, and account lifecycle.', 'إدارة بيانات الاعتماد، استعادة كلمة المرور، ودورة حياة الحساب.')}
              </p>
            </div>
          </div>
        </div>

        {/* Email & Provider Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              {t('Registered Email', 'البريد الإلكتروني المسجل')}
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">
                {currentUser.email || firebaseUser?.email || (authStatus === 'demo' ? 'ahmed.kandari@demo.la3ib.kw' : t('Not set', 'غير مسجل'))}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
              {t('Sign-In Method', 'طريقة تسجيل الدخول')}
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              {isGoogleUser ? (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span className="text-emerald-400">{t('Google Account OAuth', 'حساب Google')}</span>
                </>
              ) : authStatus === 'authenticated' ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="text-emerald-400">{t('Email & Password', 'البريد الإلكتروني وكلمة المرور')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-amber-400">{t('Demo Simulation Profile', 'الملف التجريبي')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Password Reset Section */}
        {authStatus === 'authenticated' && !isGoogleUser && (
          <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('Password Recovery & Reset', 'استعادة وتغيير كلمة المرور')}</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {t('Need to change or reset your password? We will send an official Firebase recovery link to your inbox.', 'هل تحتاج إلى تغيير أو استعادة كلمة المرور؟ سنرسل رابطاً رسمياً إلى بريدك.')}
              </p>
            </div>
            <button
              type="button"
              disabled={isSendingReset}
              onClick={handleSendPasswordReset}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isSendingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{t('Send Reset Link', 'إرسال رابط الاستعادة')}</span>
            </button>
          </div>
        )}

        {isGoogleUser && (
          <div className="p-3.5 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              {t('Your account is secured directly via Google OAuth. Passwords, two-factor authentication, and security keys are managed in your Google Account.', 'حسابك مؤمن مباشرة عبر Google OAuth. تتم إدارة كلمات المرور والتحقق بخطوتين من خلال حساب Google.')}
            </span>
          </div>
        )}

        {/* Feedback Alert for Password Reset */}
        {resetNotice && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{resetNotice}</span>
          </div>
        )}

        {/* Danger Zone: Account Deletion */}
        <div className="p-4 rounded-2xl bg-red-950/20 border border-red-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
          <div>
            <h4 className="text-xs font-bold text-red-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>{t('Danger Zone: Account Deletion', 'منطقة الخطر: حذف الحساب')}</span>
            </h4>
            <p className="text-[11px] text-red-200/70 mt-0.5">
              {t('Permanently delete your athlete profile, private settings, and social connections.', 'حذف ملفك الرياضي، إعداداتك الخاصة، وبيانات حسابك بشكل نهائي.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeletePasswordInput('');
              setShowDeleteConfirmModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 hover:text-white border border-red-800/80 text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('Delete Account', 'حذف الحساب')}</span>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="relative w-full max-w-md bg-neutral-900 border border-red-900/60 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-950/80 border border-red-800 text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">
                  {t('Delete Account Permanently?', 'تأكيد حذف الحساب نهائياً')}
                </h3>
                <p className="text-xs text-neutral-400">
                  {t('This action is irreversible and immediate.', 'هذا الإجراء نهائي ولا يمكن التراجع عنه.')}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 space-y-2 mb-4">
              <p className="font-semibold text-neutral-200">
                {t('What will be deleted:', 'البيانات التي سيتم حذفها:')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 text-[11px]">
                <li>{t('Your athlete profile and bio (@username reservation will be released)', 'ملفك الرياضي ونبذتك (سيتم تحرير اسم المستخدم @)')}</li>
                <li>{t('Private contact details and preferences', 'بيانات الاتصال والتفضيلات الخاصة')}</li>
                <li>{t('Social friends, following/follower lists, and incoming invites', 'قوائم الأصدقاء والمتابعين والدعوات')}</li>
                <li>{t('Personal notifications and community blocks', 'الإشعارات وقائمة الحظر')}</li>
              </ul>
              <p className="text-[10px] text-neutral-500 italic pt-1 border-t border-neutral-900">
                {t('* Past games and match logs remain intact for community integrity without personal identity.', '* تبقى سجلات المباريات السابقة محافظة على تكامل المجتمع بدون هويتك الشخصية.')}
              </p>
            </div>

            {/* Re-authentication Input */}
            {authStatus === 'authenticated' && !isGoogleUser && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  {t('Confirm with Your Password', 'أدخل كلمة المرور لتأكيد الهوية')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="password"
                    value={deletePasswordInput}
                    onChange={(e) => setDeletePasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {isGoogleUser && (
              <div className="mb-4 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-neutral-400">
                {t('When you click confirm, a Google popup will verify your credentials to authorize this permanent deletion.', 'عند الضغط على تأكيد، ستظهر نافذة Google للتحقق من هويتك لإتمام الحذف النهائي.')}
              </div>
            )}

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletePasswordInput('');
                  setDeleteError(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/30 cursor-pointer disabled:opacity-50"
              >
                {isDeletingAccount ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('Deleting Account...', 'جارٍ حذف الحساب...')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('Yes, Delete Account', 'نعم، حذف الحساب نهائياً')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
