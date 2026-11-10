import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MapPin, 
  ShieldCheck, 
  CheckCircle2, 
  Edit3, 
  Lock, 
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
  Users, 
  Key, 
  Trash2, 
  AlertTriangle, 
  AlertCircle, 
  Settings,
  HelpCircle,
  UserPlus,
  Image as ImageIcon
} from 'lucide-react';
import { SettingsView } from './SettingsView';
import { BrandedLoader } from './BrandedLoader';
import { SportType, SkillLevel, KuwaitArea, PlayerActivityStats, resolvePlayerAvatar, getSportLabel, getSkillLabel, formatPlayerRating } from '../types';
import { isFirebaseConfigured, uploadUserProfilePicture, compressImageClient, validateUsername, mapFirebaseAuthError } from '../lib/firebase';

const SPORT_ICONS: Record<SportType, string> = {
  Football: '',
  Padel: '',
  Basketball: '',
  Volleyball: '',
  Tennis: '',
  Badminton: '',
  Other: '',
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
    blockedPlayersList,
    unblockPlayer,
    isBlockActionLoading,
    followersList,
    followingList,
    friendsList,
    setSelectedPlayerProfile,
    isFollowingUser,
    toggleFollowPlayer,
    isFollowActionLoading,
    authStatus, 
    firebaseUser, 
    setAuthModalOpen, 
    setAuthModalMode, 
    logout, 
    sendPasswordResetEmailAction, 
    deleteAccountAction, 
    checkUsername, 
    profileSubView,
    setProfileSubView,
    updateUserBanner,
    removeUserBannerAction,
    t, 
    language 
  } = useApp();

  const isGoogleUser = Boolean(firebaseUser?.providerData?.some(p => p.providerId === 'google.com'));

  const [isEditing, setIsEditing] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState<'friends' | 'followers' | 'following'>('friends');

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const handleBannerFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(file.name);
    if (!isImage) {
      setSaveError(t('Invalid file type. Please choose a valid image (JPEG, PNG, WEBP).', 'نوع الملف غير صالح. يرجى اختيار صورة صالحة.'));
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setSaveError(t('Banner image must be under 15MB.', 'يجب ألا يتجاوز حجم الغلاف ١٥ ميغابايت.'));
      return;
    }

    setIsUploadingBanner(true);
    setSaveError(null);
    try {
      await updateUserBanner(file);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to upload banner.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleRemoveBanner = async () => {
    setIsUploadingBanner(true);
    try {
      await removeUserBannerAction();
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to remove banner.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const safeFriendsList = friendsList || [];
  const safeFollowersList = followersList || [];
  const safeFollowingList = followingList || [];
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [usernameInput, setUsernameInput] = useState(currentUser.username || '');
  const [bioInput, setBioInput] = useState(currentUser.bio);
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

  // Activity stats for current user
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
    setBioInput(currentUser.bio);
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
    setBioInput(currentUser.bio);
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
    e.target.value = '';

    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|bmp)$/i.test(file.name);
    if (!isImage) {
      setSaveError(t('Invalid file type. Please choose a valid image (JPEG, PNG, WEBP, GIF).', 'نوع الملف غير صالح. يرجى اختيار صورة صالحة.'));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setSaveError(t('Image must be under 10MB.', 'يجب ألا يتجاوز حجم الصورة ١٠ ميغابايت.'));
      return;
    }

    setIsUploadingAvatar(true);
    setSaveError(null);
    try {
      const userId = currentUser.uid || currentUser.id;
      if (isFirebaseConfigured && authStatus === 'authenticated') {
        const downloadUrl = await uploadUserProfilePicture(file, userId);
        await updateCurrentUserProfile({ avatar: downloadUrl });
      } else {
        const { dataUrl } = await compressImageClient(file, 400, 0.82);
        await updateCurrentUserProfile({ avatar: dataUrl });
      }
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    } catch (err: any) {
      console.error('Failed to upload avatar:', err);
      setSaveError(t('Could not upload profile picture. Please try another image.', 'فشل تحميل الصورة الشخصية. يرجى تجربة صورة أخرى.'));
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
        area: currentUser.area || 'Kuwait City',
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
      <div className="max-w-4xl mx-auto py-24">
        <BrandedLoader 
          mode="section" 
          message={t('Loading athlete profile...', 'جارٍ تحميل الملف الرياضي...')} 
        />
      </div>
    );
  }

  if (profileSubView === 'settings') {
    return (
      <SettingsView
        onBackToProfile={() => setProfileSubView('profile')}
        onOpenEditProfile={() => {
          setProfileSubView('profile');
          setIsEditing(true);
        }}
      />
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
      {/* Account Authentication Status Card - Strict Flat */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${
            authStatus === 'authenticated'
              ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[#1246DF] dark:text-[#05BCD1]'
              : authStatus === 'demo'
              ? 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-600 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-[#1B253D] text-slate-500'
          }`}>
            {authStatus === 'authenticated' ? (
              <ShieldCheck className="w-5 h-5" />
            ) : authStatus === 'demo' ? (
              <Sparkles className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('Account State', 'حالة الحساب')}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                authStatus === 'authenticated'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-[#1246DF] dark:text-[#05BCD1] border border-blue-200 dark:border-blue-900/60'
                  : authStatus === 'demo'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60'
                  : 'bg-slate-100 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300'
              }`}>
                {authStatus === 'authenticated'
                  ? t('Verified Athlete', 'رياضي موثق')
                  : authStatus === 'demo'
                  ? t('Demo Mode', 'وضع تجريبي')
                  : t('Guest Athlete', 'رياضي زائر')}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {authStatus === 'authenticated'
                ? currentUser.email || t('Verified Account', 'حساب موثق')
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
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-[#1B253D] dark:hover:bg-rose-950/40 border border-slate-200 hover:border-rose-300 dark:border-[#2A3B5C] text-xs font-bold text-slate-700 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                className="px-3.5 py-1.5 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('Sign In / Register', 'دخول / حساب جديد')}</span>
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200 dark:border-[#2A3B5C]"
                title={t('Log out of the demo account to test unauthenticated state', 'تسجيل الخروج من الحساب التجريبي')}
              >
                <span>{t('Log Out Demo', 'خروج من التجريبي')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setAuthModalMode('login');
                setAuthModalOpen(true);
              }}
              className="px-4 py-1.5 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t('Sign In / Register', 'تسجيل الدخول')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Profile Header Banner - Customizable Athlete Cover */}
      <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] transition-colors">
        {/* Banner Surface */}
        <div className="h-36 sm:h-44 relative w-full overflow-hidden bg-slate-900">
          {currentUser.bannerUrl ? (
            <img 
              src={currentUser.bannerUrl} 
              alt={currentUser.name} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <div className="w-full h-full bg-[#B9C9E0]" />
          )}

          {/* Contrast scrim overlay only when a custom banner image is present */}
          {currentUser.bannerUrl && (
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/30 pointer-events-none" />
          )}

          {/* Action buttons on banner */}
          <div className="absolute top-2.5 sm:top-3.5 right-2.5 sm:right-3.5 rtl:right-auto rtl:left-2.5 sm:rtl:left-3.5 flex items-center gap-1 sm:gap-2 z-10 flex-wrap max-w-[calc(100%-1rem)] justify-end">
            {/* Upload / Change Banner button */}
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={isUploadingBanner}
              className="px-3 py-1.5 rounded-xl bg-slate-950/75 hover:bg-slate-950 border border-white/25 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title={t('Change Profile Banner', 'تغيير صورة الغلاف')}
            >
              {isUploadingBanner ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#05BCD1]" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-white" />
              )}
              <span className="hidden sm:inline">{t('Change Banner', 'تغيير الغلاف')}</span>
            </button>

            {/* Remove custom banner button */}
            {currentUser.bannerUrl && (
              <button
                type="button"
                onClick={handleRemoveBanner}
                disabled={isUploadingBanner}
                className="px-2.5 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-xs font-semibold text-rose-200 transition-colors flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                title={t('Remove Custom Banner', 'حذف الغلاف المخصص')}
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">{t('Remove', 'حذف')}</span>
              </button>
            )}

            {/* Hidden file input for banner */}
            <input 
              type="file" 
              ref={bannerInputRef} 
              onChange={handleBannerFileChange} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Help & Support button */}
            <button
              type="button"
              onClick={() => setProfileSubView('settings')}
              className="px-3 py-1.5 rounded-xl bg-slate-950/75 hover:bg-slate-950 border border-white/25 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={t('Help & Support', 'المساعدة والدعم')}
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#05BCD1]" />
              <span className="hidden sm:inline">{t('Help & Support', 'المساعدة والدعم')}</span>
            </button>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setProfileSubView('settings')}
              className="px-3 py-1.5 rounded-xl bg-slate-950/75 hover:bg-slate-950 border border-white/25 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title={t('Settings', 'الإعدادات')}
            >
              <Settings className="w-3.5 h-3.5 text-slate-200" />
              <span className="hidden sm:inline">{t('Settings', 'الإعدادات')}</span>
            </button>

            {/* Edit profile toggle */}
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1.5 rounded-xl bg-slate-950/75 hover:bg-slate-950 border border-white/25 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-200" />
              <span className="hidden sm:inline">{isEditing ? t('Close Editor', 'إغلاق التعديل') : t('Edit Profile & Bio', 'تعديل الملف الرياضي')}</span>
            </button>
          </div>
        </div>

        {/* Profile Details Bar */}
        <div className="px-4 sm:px-6 pb-6 pt-0 relative w-full">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14 mb-4 w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3.5 sm:gap-4 w-full min-w-0">
              <div className="relative group shrink-0">
                <img 
                  src={resolvePlayerAvatar(currentUser)} 
                  alt={currentUser.name}
                  className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl object-cover ring-4 ring-white dark:ring-[#06135B]"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  title={t('Upload Profile Photo', 'رفع صورة شخصية')}
                  className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin text-[#05BCD1]" />
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
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#05BCD1] border-2 border-white dark:border-[#06135B]" />
              </div>

              <div className="pb-0.5 flex-1 min-w-0 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-[#06135B] dark:text-[#B9C9E0] break-words">
                    {language === 'ar' ? (currentUser.nameAr || currentUser.name) : currentUser.name}
                  </h1>
                </div>

                {/* Compact Social Statistics: @username Following Followers Friends */}
                <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap mt-1 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-mono">@{currentUser.username}</span>
                  <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSocialModalTab('following');
                      setSocialModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-slate-600 dark:text-[#B9C9E0] hover:text-[#3A60AA] dark:hover:text-white transition-colors cursor-pointer"
                    title={t('View Following', 'عرض المتابَعين')}
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{safeFollowingList.length}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">{t('Following', 'تتابع')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSocialModalTab('followers');
                      setSocialModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-slate-600 dark:text-[#B9C9E0] hover:text-[#3A60AA] dark:hover:text-white transition-colors cursor-pointer"
                    title={t('View Followers', 'عرض المتابعين')}
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{safeFollowersList.length}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">{t('Followers', 'متابعون')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSocialModalTab('friends');
                      setSocialModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-slate-600 dark:text-[#B9C9E0] hover:text-[#3A60AA] dark:hover:text-white transition-colors cursor-pointer"
                    title={t('View Friends', 'عرض الأصدقاء')}
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{safeFriendsList.length}</span>
                    <span className="text-[11px] text-slate-500 dark:text-[#B9C9E0]/80">{t('Friends', 'أصدقاء')}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#B9C9E0]/80 mt-1.5 flex-wrap">
                  <MapPin className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0] shrink-0" />
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

            {/* Compact 5-Star Player Rating */}
            {(() => {
              const ratingInfo = formatPlayerRating(currentUser, language);
              return (
                <div 
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto shrink-0 mt-1 sm:mt-0 shadow-xs"
                  title={ratingInfo.fullLabel}
                >
                  <div className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="text-xs font-bold text-[#06135B] dark:text-[#B9C9E0]">
                      {ratingInfo.isRated ? `${ratingInfo.scoreText}/5` : (language === 'ar' ? 'لم يتم التقييم' : 'Not rated')}
                    </span>
                  </div>
                  {ratingInfo.isRated && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600">|</span>
                      <span className="text-[10px] font-semibold text-slate-600 dark:text-[#B9C9E0]/90">
                        {ratingInfo.countText}
                      </span>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Bio */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mt-3 break-words">
            {currentUser.bio}
          </p>

          {savedNotice && (
            <div className="mt-3 p-2.5 bg-blue-50 dark:bg-blue-950/40 text-[#1246DF] dark:text-[#05BCD1] text-xs rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2 font-bold">
              <Check className="w-4 h-4" />
              <span>{t('Profile & settings saved successfully!', 'تم حفظ التعديلات والبيانات بنجاح!')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Editing / Privacy Controls Box - Strict Flat */}
      {isEditing && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-4 transition-colors">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('Edit Athlete Profile', 'تعديل الملف الرياضي')}
            </h3>
            {authStatus === 'authenticated' && (
              <span className="text-[11px] text-[#1246DF] dark:text-[#05BCD1] bg-blue-50 dark:bg-[#1B253D] border border-blue-200 dark:border-[#2A3B5C] px-2 py-0.5 rounded-full font-bold">
                {t('Cloud Synced', 'مزامنة سحابية')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('Display Name', 'الاسم المعروض')}
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t('e.g. Faisal Al-Sabah', 'مثال: فيصل الصباح')}
                className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#1246DF] dark:focus:border-[#05BCD1]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {t('Unique Username', 'اسم المستخدم الفريد')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">@</span>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                    setUsernameInput(raw);
                  }}
                  placeholder="athlete_kw"
                  className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl pl-7 pr-3 py-2.5 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#1246DF] dark:focus:border-[#05BCD1]"
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                {t('3–25 chars (letters, numbers, underscores).', '٣ إلى ٢٥ حرفاً (أحرف، أرقام، وشرطة سفلية).')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t('Age', 'العمر')}
            </label>
            <input
              type="number"
              min="10"
              max="99"
              value={ageInput}
              onChange={(e) => setAgeInput(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl p-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#1246DF] dark:focus:border-[#05BCD1]"
            />
          </div>

          {/* Favorite Sports Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t('Favorite Sports', 'الرياضات المفضلة')}
              </label>
              <span className="text-[11px] text-slate-400">
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
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-xs font-semibold transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#EEF4FF] dark:bg-blue-950/60 border-[#1246DF] dark:border-[#05BCD1] text-[#1246DF] dark:text-[#05BCD1]'
                        : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                    }`}
                  >
                    <span>{sport}</span>
                    {isSelected && <Check className="w-3 h-3 text-[#1246DF] dark:text-[#05BCD1] ms-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sports Skills Editor */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                {t('Sports & Skill Levels', 'الرياضات والمستوى الرياضي')}
              </label>
              <span className="text-[11px] text-slate-400">
                {t('Rate your proficiency', 'حدد مستوى مهارتك')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {activeSkillsList.map(sport => {
                const currentLevel = skillsInput[sport] || 'Intermediate';
                return (
                  <div
                    key={sport}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{sport}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={currentLevel}
                        onChange={(e) => handleSkillChange(sport, e.target.value as SkillLevel)}
                        className="bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-[#1246DF] dark:text-[#05BCD1] text-xs font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:border-[#1246DF] cursor-pointer"
                      >
                        {SKILL_LEVEL_OPTIONS.map(lvl => (
                          <option key={lvl} value={lvl} className="text-slate-900 dark:text-white font-normal">
                            {getSkillLabel(lvl, language)}
                          </option>
                        ))}
                      </select>

                      {activeSkillsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSkill(sport)}
                          title={t('Remove skill', 'إزالة')}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
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
                <span className="text-[11px] text-slate-500 dark:text-slate-400">{t('+ Add skill for:', '+ إضافة مهارة لـ:')}</span>
                <select
                  value=""
                  onChange={(e) => {
                    const sportToAdd = e.target.value as SportType;
                    if (sportToAdd) {
                      handleSkillChange(sportToAdd, 'Intermediate');
                    }
                  }}
                  className="bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-[11px] text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:border-[#1246DF] cursor-pointer"
                >
                  <option value="">{t('Choose sport...', 'اختر الرياضة...')}</option>
                  {unratedSports.map(s => (
                    <option key={s} value={s}>{getSportLabel(s, language)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              {t('Sports Bio', 'النبذة الرياضية')}
            </label>
            <textarea
              rows={3}
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              placeholder={t('Tell other players about your playstyle, position, and schedule...', 'اكتب نبذة عن أسلوب لعبك، مركزك المفضل، ومواعيدك...')}
              className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#1246DF] dark:focus:border-[#05BCD1]"
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1B253D] text-xs">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B253D] hover:bg-slate-100 dark:hover:bg-[#253452] cursor-pointer transition-colors">
              <span className="text-slate-700 dark:text-slate-300">{t('Show Age on Public Profile', 'إظهار العمر في الملف العام')}</span>
              <input 
                type="checkbox"
                checked={showAge}
                onChange={(e) => setShowAge(e.target.checked)}
                className="accent-[#1246DF] dark:accent-[#05BCD1] w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-[#1B253D] hover:bg-slate-100 dark:hover:bg-[#253452] cursor-pointer transition-colors">
              <span className="text-slate-700 dark:text-slate-300">{t('Allow Direct Game Invites from Community', 'السماح بتلقي دعوات المباريات المباشرة')}</span>
              <input 
                type="checkbox"
                checked={allowDirectInvites}
                onChange={(e) => setAllowDirectInvites(e.target.checked)}
                className="accent-[#1246DF] dark:accent-[#05BCD1] w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {saveError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl font-medium">
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3">
            <button 
              type="button"
              onClick={handleCancelEdit} 
              className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button 
              type="button"
              onClick={handleSaveProfile} 
              disabled={isSaving}
              className="px-5 py-2 bg-[#1246DF] hover:bg-[#0E38B8] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{t('Save Changes', 'حفظ التعديلات')}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3 Key Metric Blocks - Strict Flat */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-center transition-colors">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            {t('Games Played', 'مباريات لعبها')}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 block">
            {myActivityStats !== null ? myActivityStats.gamesPlayed : (currentUser.gamesPlayed ?? 0)}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-center transition-colors">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            {t('Games Hosted', 'مباريات نظمها')}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-[#1246DF] dark:text-[#05BCD1] mt-1 block">
            {myActivityStats !== null ? myActivityStats.gamesHosted : (currentUser.gamesHosted ?? 0)}
          </span>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] text-center transition-colors">
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            {t('Upcoming Games', 'مباريات قادمة')}
          </span>
          <span className="text-2xl sm:text-3xl font-black text-amber-500 mt-1 block">
            {myActivityStats !== null ? myActivityStats.upcomingGames : 0}
          </span>
        </div>
      </div>

      {/* Recent Activity for Current User */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />
            <span>{t('Recent Activity', 'النشاط الأخير')}</span>
          </h3>
          {isMyActivityLoading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1246DF] dark:text-[#05BCD1]" />
              <span>{t('Updating...', 'تحديث...')}</span>
            </div>
          )}
        </div>

        {myActivityStats && myActivityStats.recentActivities.length > 0 ? (
          <div className="space-y-2 divide-y divide-slate-100 dark:divide-[#1B253D]">
            {myActivityStats.recentActivities.map((act) => (
              <div 
                key={act.gameId}
                className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[10px] font-bold text-[#1246DF] dark:text-[#05BCD1] bg-[#EEF4FF] dark:bg-[#1B253D] border border-[#BFDBFE] dark:border-[#2A3B5C] px-1.5 py-0.5 rounded-[4px] shrink-0">
                    {getSportLabel(act.sport, language)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white truncate">{act.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {act.courtName ? `${act.courtName} • ` : ''}{act.area || 'Kuwait'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
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
          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            {t('No recent match activity found yet.', 'لم يتم تسجيل نشاط مباريات بعد.')}
          </p>
        )}
      </div>

      {/* Favorite Sports & Skill Badges */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-4 transition-colors">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
          {t('Sports & Skill Levels', 'الرياضات والمستوى')}
        </h3>

        {currentUser.favoriteSports && currentUser.favoriteSports.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t('Favorite Sports:', 'الرياضات المفضلة:')}
            </span>
            {currentUser.favoriteSports.map(sport => (
              <span 
                key={sport}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#EEF4FF] dark:bg-[#1B253D] border border-[#BFDBFE] dark:border-[#2A3B5C] text-[#1246DF] dark:text-[#05BCD1] text-xs font-semibold"
              >
                <span>{sport}</span>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(currentUser.skills || {}).map(([sportName, level]) => (
            <div 
              key={sportName} 
              className="flex items-center justify-between p-3.5 rounded-xl bg-[#EEF4FF] dark:bg-[#1B253D] border border-[#BFDBFE] dark:border-[#2A3B5C]"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{sportName}</span>
              </div>
              <span className="text-xs font-bold text-[#1246DF] dark:text-[#05BCD1] bg-white dark:bg-[#131C31] border border-[#BFDBFE] dark:border-[#22304E] px-2.5 py-0.5 rounded-full">
                {level}
              </span>
            </div>
          ))}
          {Object.keys(currentUser.skills || {}).length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">
              {t('No sports skills listed yet. Click Edit Profile to add skills.', 'لا توجد رياضات مضافة بعد. اضغط على تعديل لإضافة المهارات.')}
            </p>
          )}
        </div>
      </div>

      {/* Blocked Players Management */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Blocked Players', 'قائمة المحظورين')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Manage players you have blocked from interacting with you in the community.', 'إدارة اللاعبين المحظورين من التفاعل معك في المجتمع.')}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-slate-600 dark:text-slate-400 font-mono">
            {blockedPlayersList.length}
          </span>
        </div>

        {blockedPlayersList.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-center text-xs text-slate-500 dark:text-slate-400 italic">
            {t('You have not blocked any players.', 'لا يوجد أي لاعبين في قائمة الحظر.')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#2A3B5C] rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] overflow-hidden">
            {blockedPlayersList.map(blockedPlayer => {
              const pid = blockedPlayer.id || blockedPlayer.uid || '';
              const isLoading = isBlockActionLoading(pid);
              return (
                <div key={pid} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-[#253452] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <img 
                      src={blockedPlayer.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80'} 
                      alt={blockedPlayer.name}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0" 
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{blockedPlayer.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">@{blockedPlayer.username}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => unblockPlayer(pid)}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#131C31] dark:hover:bg-[#1B253D] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-[#2A3B5C] text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                  >
                    {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserCheck className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />}
                    <span>{t('Unblock', 'إلغاء الحظر')}</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Account Security & Authentication Management */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-5 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {t('Account & Security Settings', 'إعدادات الحساب والأمان')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Manage your sign-in credentials, password recovery, and account lifecycle.', 'إدارة بيانات الاعتماد، استعادة كلمة المرور، ودورة حياة الحساب.')}
              </p>
            </div>
          </div>
        </div>

        {/* Email & Provider Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              {t('Registered Email', 'البريد الإلكتروني المسجل')}
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                {currentUser.email || firebaseUser?.email || (authStatus === 'demo' ? 'demo@la3ib.kw' : t('Not set', 'غير مسجل'))}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              {t('Sign-In Method', 'طريقة تسجيل الدخول')}
            </span>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
              {isGoogleUser ? (
                <>
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                  </svg>
                  <span className="text-[#1246DF] dark:text-[#05BCD1]">{t('Google Account OAuth', 'حساب Google')}</span>
                </>
              ) : authStatus === 'authenticated' ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-[#1246DF] dark:text-[#05BCD1]">{t('Email & Password', 'البريد الإلكتروني وكلمة المرور')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-amber-600 dark:text-amber-400">{t('Demo Simulation Profile', 'الملف التجريبي')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Password Reset Section */}
        {authStatus === 'authenticated' && !isGoogleUser && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />
                <span>{t('Password Recovery & Reset', 'استعادة وتغيير كلمة المرور')}</span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t('Need to change or reset your password? We will send a secure reset link to your email.', 'هل تحتاج إلى تغيير أو استعادة كلمة المرور؟ سنرسل رابطاً آمناً إلى بريدك الإلكتروني.')}
              </p>
            </div>
            <button
              type="button"
              disabled={isSendingReset}
              onClick={handleSendPasswordReset}
              className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-[#253452] dark:hover:bg-[#2F4166] text-xs font-bold text-slate-900 dark:text-white transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {isSendingReset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5 text-[#1246DF] dark:text-[#05BCD1]" />}
              <span>{t('Send Reset Link', 'إرسال رابط الاستعادة')}</span>
            </button>
          </div>
        )}

        {isGoogleUser && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1] shrink-0 mt-0.5" />
            <span>
              {t('Your account is secured directly via Google OAuth. Passwords, two-factor authentication, and security keys are managed in your Google Account.', 'حسابك مؤمن مباشرة عبر Google OAuth. تتم إدارة كلمات المرور والتحقق بخطوتين من خلال حساب Google.')}
            </span>
          </div>
        )}

        {resetNotice && (
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#1246DF] dark:text-[#05BCD1] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resetNotice}</span>
          </div>
        )}

        {/* Danger Zone: Account Deletion */}
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-3">
          <div>
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{t('Danger Zone: Account Deletion', 'منطقة الخطر: حذف الحساب')}</span>
            </h4>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
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
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t('Delete Account', 'حذف الحساب')}</span>
          </button>
        </div>
      </div>

      {/* Delete Account Confirmation Modal - Strict Flat */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-rose-300 dark:border-rose-900/60 rounded-3xl p-6 sm:p-7 overflow-hidden"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {t('Delete Account Permanently?', 'تأكيد حذف الحساب نهائياً')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('This action is irreversible and immediate.', 'هذا الإجراء نهائي ولا يمكن التراجع عنه.')}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-4">
              <p className="font-semibold text-slate-900 dark:text-white">
                {t('What will be deleted:', 'البيانات التي سيتم حذفها:')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>{t('Your athlete profile and bio (@username reservation will be released)', 'ملفك الرياضي ونبذتك (سيتم تحرير اسم المستخدم @)')}</li>
                <li>{t('Private contact details and preferences', 'بيانات الاتصال والتفضيلات الخاصة')}</li>
                <li>{t('Social friends, following/follower lists, and incoming invites', 'قوائم الأصدقاء والمتابعين والدعوات')}</li>
                <li>{t('Personal notifications and community blocks', 'الإشعارات وقائمة الحظر')}</li>
              </ul>
              <p className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-200 dark:border-[#2A3B5C]">
                {t('* Past games and match logs remain intact for community integrity without personal identity.', '* تبقى سجلات المباريات السابقة محافظة على تكامل المجتمع بدون هويتك الشخصية.')}
              </p>
            </div>

            {/* Re-authentication Input */}
            {authStatus === 'authenticated' && !isGoogleUser && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('Confirm with Your Password', 'أدخل كلمة المرور لتأكيد الهوية')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={deletePasswordInput}
                    onChange={(e) => setDeletePasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {isGoogleUser && (
              <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-[11px] text-slate-600 dark:text-slate-400">
                {t('When you click confirm, a Google popup will verify your credentials to authorize this permanent deletion.', 'عند الضغط على تأكيد، ستظهر نافذة Google للتحقق من هويتك لإتمام الحذف النهائي.')}
              </div>
            )}

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
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

      {/* Social Connections Modal - Strict Flat */}
      {socialModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 overflow-y-auto"
          onClick={() => setSocialModalOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-3xl overflow-hidden flex flex-col my-auto max-h-[85vh] transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#1B253D] bg-slate-50 dark:bg-[#1B253D]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1246DF] dark:text-[#05BCD1]" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('Connections & Network', 'شبكة العلاقات الرياضية')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSocialModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 dark:bg-[#253452] dark:hover:bg-[#2F4166] flex items-center justify-center text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                title={t('Close', 'إغلاق')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-Tabs: Friends | Followers | Following */}
            <div className="flex border-b border-slate-100 dark:border-[#1B253D] bg-slate-100 dark:bg-[#18233D] p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setSocialModalTab('friends')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  socialModalTab === 'friends'
                    ? 'bg-white dark:bg-[#131C31] text-[#1246DF] dark:text-[#05BCD1]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{t('Friends', 'الأصدقاء')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 font-mono">
                  {safeFriendsList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSocialModalTab('followers')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  socialModalTab === 'followers'
                    ? 'bg-white dark:bg-[#131C31] text-[#1246DF] dark:text-[#05BCD1]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{t('Followers', 'المتابعون')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 font-mono">
                  {safeFollowersList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSocialModalTab('following')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  socialModalTab === 'following'
                    ? 'bg-white dark:bg-[#131C31] text-[#1246DF] dark:text-[#05BCD1]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{t('Following', 'يتابع')}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-[#1B253D] text-slate-700 dark:text-slate-300 font-mono">
                  {safeFollowingList.length}
                </span>
              </button>
            </div>

            {/* List Content - Clean compact rows with subtle separators */}
            <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-[#E2E8F0] dark:divide-[#1F3590]/60 max-h-[60vh]">
              {(() => {
                const currentList = socialModalTab === 'friends'
                  ? safeFriendsList
                  : socialModalTab === 'followers'
                  ? safeFollowersList
                  : safeFollowingList;

                if (currentList.length === 0) {
                  return (
                    <div className="py-12 px-4 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1B253D] flex items-center justify-center mx-auto text-slate-400">
                        {socialModalTab === 'friends' && <UserCheck className="w-6 h-6" />}
                        {socialModalTab === 'followers' && <Users className="w-6 h-6" />}
                        {socialModalTab === 'following' && <Activity className="w-6 h-6" />}
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {socialModalTab === 'friends' && t('No friends yet', 'لا يوجد أصدقاء بعد')}
                        {socialModalTab === 'followers' && t('No followers yet', 'لا يوجد متابعون بعد')}
                        {socialModalTab === 'following' && t('Not following anyone yet', 'لا تتابع أي لاعبين حالياً')}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                        {socialModalTab === 'friends' && t('Connect with players in games to build your sports circle.', 'تواصل مع اللاعبين في المباريات لإضافتهم كأصدقاء.')}
                        {socialModalTab === 'followers' && t('When athletes follow you, they will appear here.', 'عندما يقوم اللاعبون بمتابعتك، سيظهرون هنا.')}
                        {socialModalTab === 'following' && t('Follow other players to stay updated on their matches.', 'تابع اللاعبين الآخرين للبقاء على اطلاع بمبارياتهم.')}
                      </p>
                    </div>
                  );
                }

                return currentList.map((player) => {
                  const targetId = player.id || player.uid || '';
                  const isFollowing = isFollowingUser(targetId);
                  const isLoading = isFollowActionLoading(targetId);
                  const ratingInfo = formatPlayerRating(player, language);

                  return (
                    <div
                      key={targetId}
                      className="flex items-center justify-between py-2.5 px-1 hover:bg-[#EEF3F9]/60 dark:hover:bg-[#142578]/30 transition-colors"
                    >
                      {/* Player info (clickable to open profile) */}
                      <div
                        onClick={() => {
                          setSelectedPlayerProfile(player);
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group"
                      >
                        <img
                          src={resolvePlayerAvatar(player)}
                          alt={player.name}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 group-hover:ring-[#3A60AA] transition-all shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[#3A60AA] dark:group-hover:text-[#B9C9E0] transition-colors truncate">
                            {player.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5 flex-wrap">
                            <span>@{player.username}</span>
                            {player.area && <span>• {player.area}</span>}
                            {ratingInfo.isRated && (
                              <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                                • ★ {ratingInfo.scoreText}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 rtl:mr-2 ltr:ml-2">
                        <button
                          type="button"
                          onClick={() => toggleFollowPlayer(targetId)}
                          disabled={isLoading}
                          className={`px-3 py-1 rounded-[5px] text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                            isFollowing
                              ? 'bg-slate-100 hover:bg-slate-200 dark:bg-[#142578] dark:hover:bg-[#1F3590] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-[#1F3590]'
                              : 'bg-[#3A60AA] hover:bg-[#2E4D8A] text-white'
                          }`}
                        >
                          {isLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isFollowing ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#3A60AA] dark:text-[#B9C9E0]" />
                              <span>{t('Following', 'متابع')}</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>{t('Follow', 'متابعة')}</span>
                            </>
                          )}
                        </button>
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
  );
};
