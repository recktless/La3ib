import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  ArrowRight,
  User, 
  Key, 
  Mail, 
  Lock, 
  LogOut, 
  Trash2, 
  Globe, 
  ShieldCheck, 
  Ban, 
  UserCheck, 
  Loader2, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  Edit3, 
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Bell,
  ChevronRight,
  HelpCircle,
  FileText,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { resolvePlayerAvatar, ThemePreference } from '../types';
import { mapFirebaseAuthError } from '../lib/firebase';
import { La3ibLogo } from './La3ibLogo';

interface SettingsViewProps {
  onBackToProfile: () => void;
  onOpenEditProfile: () => void;
}

interface SettingsRowProps {
  icon?: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  iconBg?: string;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick?: () => void;
  isLast?: boolean;
  destructive?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon: Icon,
  iconColor = 'text-slate-600 dark:text-slate-300',
  iconBg = 'bg-slate-100 dark:bg-[#162766]',
  label,
  description,
  trailing,
  onClick,
  isLast = false,
  destructive = false
}) => {
  const content = (
    <div className={`flex items-center justify-between py-3 px-4 gap-3 transition-colors ${
      onClick ? 'hover:bg-slate-50/70 dark:hover:bg-[#111F54]/50 cursor-pointer' : ''
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
        <div className="min-w-0">
          <p className={`text-xs font-semibold leading-tight truncate ${
            destructive 
              ? 'text-rose-600 dark:text-rose-400' 
              : 'text-slate-900 dark:text-white'
          }`}>
            {label}
          </p>
          {description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
              {description}
            </p>
          )}
        </div>
      </div>
      {trailing && <div className="shrink-0 flex items-center">{trailing}</div>}
    </div>
  );

  return (
    <div>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="w-full text-start block focus:outline-none"
        >
          {content}
        </button>
      ) : (
        content
      )}
      {!isLast && <div className="border-b border-slate-100 dark:border-[#162560]/50 ms-14" />}
    </div>
  );
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBackToProfile,
  onOpenEditProfile
}) => {
  const { 
    currentUser, 
    updateCurrentUserProfile,
    blockedPlayersList, 
    unblockPlayer, 
    isBlockActionLoading,
    authStatus, 
    firebaseUser, 
    logout, 
    setAuthModalOpen,
    setAuthModalMode,
    sendPasswordResetEmailAction, 
    deleteAccountAction, 
    language, 
    setLanguage, 
    themePreference,
    setThemePreference,
    setActiveTab,
    startTutorial,
    t 
  } = useApp();

  const isGoogleUser = Boolean(firebaseUser?.providerData?.some(p => p.providerId === 'google.com'));

  // Password reset state
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // Logout confirmation state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Delete account confirmation modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletePasswordInput, setDeletePasswordInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Profile Privacy state
  const isPrivate = Boolean(currentUser.privacy?.isPrivateProfile);
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);
  const [privacySuccessNotice, setPrivacySuccessNotice] = useState<string | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);

  // Blocked users expansion state
  const [showBlockedUsersList, setShowBlockedUsersList] = useState(false);

  // Notifications in-app toggle simulation (persisted in localStorage)
  const [inAppNotifsEnabled, setInAppNotifsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('la3ib_inapp_notifs') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleInAppNotifs = () => {
    setInAppNotifsEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('la3ib_inapp_notifs', String(next));
      } catch {}
      return next;
    });
  };

  // Handle password reset
  const handleSendPasswordReset = async () => {
    const targetEmail = currentUser.email || firebaseUser?.email;
    if (!targetEmail) {
      setResetError(t('No email address registered with this account.', 'لا يوجد بريد إلكتروني مسجل لهذا الحساب.'));
      return;
    }
    setIsSendingReset(true);
    setResetNotice(null);
    setResetError(null);
    try {
      await sendPasswordResetEmailAction(targetEmail);
      setResetNotice(t('Password reset link sent to your registered email!', 'تم إرسال رابط استعادة كلمة المرور إلى بريدك المسجل!'));
    } catch (err: any) {
      setResetError(mapFirebaseAuthError(err, language));
    } finally {
      setIsSendingReset(false);
    }
  };

  // Handle account deletion
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

  // Handle Profile Privacy change
  const handleSetProfilePrivacy = async (privateMode: boolean) => {
    if (isPrivate === privateMode) return;
    setIsUpdatingPrivacy(true);
    setPrivacySuccessNotice(null);
    setPrivacyError(null);
    try {
      await updateCurrentUserProfile({
        privacy: {
          ...currentUser.privacy,
          isPrivateProfile: privateMode
        }
      });
      setPrivacySuccessNotice(
        privateMode
          ? t('Profile set to Private. Only friends view full match history.', 'تم تعيين الملف إلى خاص. يمكن للأصدقاء فقط رؤية المباريات.')
          : t('Profile set to Public. Anyone on La3ib can view your sports stats.', 'تم تعيين الملف إلى عام. متاح لجميع الرياضيين.')
      );
      setTimeout(() => setPrivacySuccessNotice(null), 4000);
    } catch (err: any) {
      setPrivacyError(err?.message || t('Failed to update privacy settings.', 'فشل تحديث إعدادات الخصوصية.'));
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Top Header: Understated & Native-App Aligned */}
      <div className="flex items-center justify-between py-2 border-b border-slate-200/80 dark:border-[#1F3590]/50">
        <button
          type="button"
          onClick={onBackToProfile}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
          aria-label={t('Back to Profile', 'العودة للملف الرياضي')}
        >
          {language === 'ar' ? (
            <ArrowRight className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ArrowLeft className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0] group-hover:-translate-x-0.5 transition-transform" />
          )}
          <span>{t('Back', 'رجوع')}</span>
        </button>

        <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
          {t('Settings', 'الإعدادات')}
        </h1>

        <div className="w-12" /> {/* Spacer balance */}
      </div>

      {/* ========================================================================= */}
      {/* GROUP 1: ACCOUNT                                                          */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3">
          {t('Account', 'الحساب')}
        </h2>

        <div className="bg-white dark:bg-[#0B1536] border border-slate-200/80 dark:border-[#1F3590]/50 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#162560]/50 shadow-xs">
          {/* Athlete Profile Summary Row */}
          <div 
            onClick={onOpenEditProfile}
            className="flex items-center justify-between p-3.5 hover:bg-slate-50/70 dark:hover:bg-[#111F54]/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img 
                src={resolvePlayerAvatar(currentUser)} 
                alt={currentUser.name} 
                className="w-11 h-11 rounded-xl object-cover border border-slate-200 dark:border-[#223577] shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {language === 'ar' ? (currentUser.nameAr || currentUser.name) : currentUser.name}
                  </span>
                  <span className="text-[10px] font-mono text-[#3A60AA] dark:text-[#B9C9E0]">@{currentUser.username}</span>
                  {authStatus === 'authenticated' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-[#142366] text-[#3A60AA] dark:text-[#B9C9E0] text-[10px] font-semibold border border-blue-200/50 dark:border-[#1F3590]/50">
                      <Check className="w-2.5 h-2.5" />
                      <span>{t('Verified', 'موثق')}</span>
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentUser.email || firebaseUser?.email || (authStatus === 'demo' ? 'demo@la3ib.kw' : t('Guest Athlete', 'لاعب زائر'))}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400 shrink-0">
              <span className="text-[11px] font-medium text-[#3A60AA] dark:text-[#B9C9E0]">
                {t('Edit Profile', 'تعديل الملف')}
              </span>
              <ChevronRight className="w-4 h-4 rtl:rotate-180" />
            </div>
          </div>

          {/* Change Password Row */}
          {authStatus === 'authenticated' && !isGoogleUser && (
            <SettingsRow
              icon={Key}
              label={t('Change Password', 'تغيير كلمة المرور')}
              description={t('Send secure password reset link to your email', 'إرسال رابط استعادة كلمة المرور')}
              trailing={
                <button
                  type="button"
                  disabled={isSendingReset}
                  onClick={handleSendPasswordReset}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[#3A60AA] dark:text-[#B9C9E0] hover:bg-slate-100 dark:hover:bg-[#152355] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isSendingReset ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mail className="w-3 h-3" />
                  )}
                  <span>{t('Reset Link', 'إرسال الرابط')}</span>
                </button>
              }
            />
          )}

          {isGoogleUser && (
            <SettingsRow
              icon={ShieldCheck}
              label={t('Google Account Authentication', 'المصادقة عبر Google')}
              description={t('Your account is secured directly via Google OAuth', 'حسابك مؤمن مباشرة عبر Google OAuth')}
              trailing={
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-[#142366] text-[#3A60AA] dark:text-[#B9C9E0] border border-blue-200/60 dark:border-[#1F3590]">
                  Google
                </span>
              }
            />
          )}

          {authStatus === 'demo' && (
            <SettingsRow
              icon={Sparkles}
              label={t('Demo Account', 'حساب تجريبي')}
              description={t('You are exploring in Demo Mode. Register to persist records.', 'أنت تتصفح في الوضع التجريبي. سجّل لحفظ بياناتك.')}
              trailing={
                <button
                  type="button"
                  onClick={() => {
                    setAuthModalMode('register');
                    setAuthModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-[11px] font-bold transition-colors cursor-pointer"
                >
                  {t('Register', 'تسجيل')}
                </button>
              }
              isLast
            />
          )}
        </div>

        {resetNotice && (
          <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-[#0D1C68]/60 border border-blue-200/60 dark:border-[#1F3590] text-[#3A60AA] dark:text-[#B9C9E0] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{resetNotice}</span>
          </div>
        )}

        {resetError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{resetError}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GROUP 2: PREFERENCES (APPEARANCE & LANGUAGE)                              */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3">
          {t('Preferences', 'التفضيلات')}
        </h2>

        <div className="bg-white dark:bg-[#0B1536] border border-slate-200/80 dark:border-[#1F3590]/50 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#162560]/50 shadow-xs">
          {/* Appearance Row */}
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#162766] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Sun className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {t('Appearance', 'المظهر')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  {themePreference === 'light' 
                    ? t('Light mode active', 'الوضع الفاتح نشط') 
                    : themePreference === 'dark' 
                    ? t('Dark mode active', 'الوضع الداكن نشط') 
                    : t('Matches system appearance', 'يطابق مظهر النظام')}
                </p>
              </div>
            </div>

            {/* Apple-style segmented pill selector */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#142358] border border-slate-200/60 dark:border-[#1F3590]/60 self-start sm:self-center">
              {[
                { key: 'light', labelEn: 'Light', labelAr: 'فاتح', Icon: Sun },
                { key: 'dark', labelEn: 'Dark', labelAr: 'داكن', Icon: Moon },
                { key: 'system', labelEn: 'Auto', labelAr: 'تلقائي', Icon: Laptop }
              ].map(opt => {
                const isActive = themePreference === opt.key;
                const OptIcon = opt.Icon;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setThemePreference(opt.key as ThemePreference)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-white dark:bg-[#1E3278] text-[#3A60AA] dark:text-white shadow-xs' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <OptIcon className="w-3 h-3" />
                    <span>{language === 'ar' ? opt.labelAr : opt.labelEn}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Row */}
          <div className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#162766] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {t('Language', 'اللغة')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                  {language === 'ar' ? 'العربية (من اليمين لليسار)' : 'English (Left-to-Right)'}
                </p>
              </div>
            </div>

            {/* Language toggle buttons */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-[#142358] border border-slate-200/60 dark:border-[#1F3590]/60 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-white dark:bg-[#1E3278] text-[#3A60AA] dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ar')}
                className={`px-3 py-1 rounded-lg text-xs font-bold font-cairo transition-all cursor-pointer ${
                  language === 'ar'
                    ? 'bg-white dark:bg-[#1E3278] text-[#3A60AA] dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                العربية
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GROUP 3: PRIVACY & SAFETY                                                 */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('Privacy', 'الخصوصية')}
          </h2>
          <span className="text-[10px] text-slate-400 font-medium">
            {t('Privacy & Safety', 'الخصوصية والأمان')}
          </span>
        </div>

        <div className="bg-white dark:bg-[#0B1536] border border-slate-200/80 dark:border-[#1F3590]/50 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#162560]/50 shadow-xs">
          {/* Profile Privacy Toggle Row */}
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#162766] text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {t('Profile Privacy', 'خصوصية الحساب')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                  {isPrivate 
                    ? t('Private Profile active — switch to Public Profile anytime', 'الملف خاص — يمكنك التحويل إلى ملف عام') 
                    : t('Public Profile active — toggle switch for Private Profile mode', 'الملف عام — يمكنك تفعيل خيار ملف خاص')}
                </p>
              </div>
            </div>

            {/* Apple style toggle switch */}
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              disabled={isUpdatingPrivacy}
              onClick={() => handleSetProfilePrivacy(!isPrivate)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 disabled:opacity-50 ${
                isPrivate ? 'bg-[#3A60AA]' : 'bg-slate-200 dark:bg-[#162560]'
              }`}
            >
              <span 
                className={`w-5 h-5 rounded-full bg-white shadow-xs block transition-transform duration-150 absolute top-0.5 ${
                  language === 'ar'
                    ? (isPrivate ? 'translate-x-[-1.35rem]' : 'translate-x-[-0.15rem]')
                    : (isPrivate ? 'translate-x-5' : 'translate-x-0.5')
                }`} 
              />
            </button>
          </div>

          {/* Blocked Users Row */}
          <div>
            <div
              onClick={() => setShowBlockedUsersList(prev => !prev)}
              className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-[#111F54]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#162766] text-rose-500 flex items-center justify-center shrink-0">
                  <Ban className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                    {t('Blocked Users', 'اللاعبون المحظورون')}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {t('Manage players restricted from community contact', 'إدارة حسابات اللاعبين المحظورين')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-slate-400 shrink-0">
                <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                  {(blockedPlayersList || []).length}
                </span>
                <ChevronRight className={`w-4 h-4 transition-transform ${(showBlockedUsersList || (blockedPlayersList || []).length > 0) ? 'rotate-90' : 'rtl:rotate-180'}`} />
              </div>
            </div>

            {/* Blocked List (automatically present if blocked players exist or when expanded) */}
            {(showBlockedUsersList || (blockedPlayersList || []).length > 0) && (
              <div className="bg-slate-50/60 dark:bg-[#07102D] p-3 border-t border-slate-100 dark:border-[#162560]/50 space-y-2">
                {(blockedPlayersList || []).length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-3">
                    {t('You have not blocked any players.', 'لم تقم بحظر أي لاعب.')}
                  </p>
                ) : (
                  blockedPlayersList.map(player => {
                    const targetId = player.id || player.uid || '';
                    const isLoading = isBlockActionLoading(targetId);
                    return (
                      <div 
                        key={targetId}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-[#0B1536] border border-slate-200/60 dark:border-[#1F3590]/40 text-xs gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img 
                            src={resolvePlayerAvatar(player)} 
                            alt={player.name} 
                            className="w-8 h-8 rounded-lg object-cover shrink-0" 
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">{player.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">@{player.username}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => unblockPlayer(targetId)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#142358] border border-slate-200 dark:border-[#223577] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {isLoading ? t('Lifting...', 'جارٍ الإلغاء...') : t('Unblock', 'إلغاء الحظر')}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {privacySuccessNotice && (
          <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-[#0D1C68]/60 border border-blue-200/60 dark:border-[#1F3590] text-[#3A60AA] dark:text-[#B9C9E0] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{privacySuccessNotice}</span>
          </div>
        )}

        {privacyError && (
          <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{privacyError}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* GROUP 4: NOTIFICATIONS                                                    */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3">
          {t('Notifications', 'الإشعارات')}
        </h2>

        <div className="bg-white dark:bg-[#0B1536] border border-slate-200/80 dark:border-[#1F3590]/50 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#162560]/50 shadow-xs">
          <div className="p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#162766] text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center shrink-0">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                  {t('In-App Activity Notifications', 'إشعارات الأنشطة والتنبيهات')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                  {t('Game invitations, player joins, and booking confirmations', 'دعوات المباريات وتأكيدات الانضمام')}
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={inAppNotifsEnabled}
              onClick={handleToggleInAppNotifs}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                inAppNotifsEnabled ? 'bg-[#3A60AA]' : 'bg-slate-200 dark:bg-[#162560]'
              }`}
            >
              <span 
                className={`w-5 h-5 rounded-full bg-white shadow-xs block transition-transform duration-150 absolute top-0.5 ${
                  language === 'ar'
                    ? (inAppNotifsEnabled ? 'translate-x-[-1.35rem]' : 'translate-x-[-0.15rem]')
                    : (inAppNotifsEnabled ? 'translate-x-5' : 'translate-x-0.5')
                }`} 
              />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GROUP 5: HELP & ABOUT                                                     */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3">
          {t('Help & About', 'المساعدة والمعلومات')}
        </h2>

        <div className="bg-white dark:bg-[#0B1536] border border-slate-200/80 dark:border-[#1F3590]/50 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#162560]/50 shadow-xs">
          <SettingsRow
            icon={ShieldCheck}
            label={t('View Community & Safety Guidelines', 'عرض إرشادات المجتمع والسلامة')}
            description={t('Fair play standards and sportsmanship policy in Kuwait', 'قواعد الروح الرياضية والسلامة في الكويت')}
            onClick={() => setActiveTab('guidelines')}
            trailing={<ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />}
          />

          <SettingsRow
            icon={Sparkles}
            label={t('Replay Tutorial', 'إعادة الجولة التعريفية')}
            description={t('Walkthrough features and interface highlights', 'استعراض ميزات التطبيق وطريقة الاستخدام')}
            onClick={() => {
              setActiveTab('home');
              startTutorial();
            }}
            trailing={<ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />}
          />

          <div className="p-3.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#162766] flex items-center justify-center shrink-0">
                <La3ibLogo size="xs" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white leading-tight">La3ib / لاعب</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('Kuwait Pickup Sports Platform', 'منصة تنظيم الرياضة في الكويت')}</p>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-400">v1.2.0</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* GROUP 6: ACCOUNT ACTIONS                                                  */}
      {/* ========================================================================= */}
      <div className="space-y-1.5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-3">
          {t('Account Actions', 'إجراءات الحساب')}
        </h2>

        <div className="bg-white dark:bg-[#0B1536] border border-slate-200/80 dark:border-[#1F3590]/50 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-[#162560]/50 shadow-xs">
          {/* Sign Out Row */}
          {!showLogoutConfirm ? (
            <SettingsRow
              icon={LogOut}
              iconColor="text-slate-600 dark:text-slate-300"
              label={t('Log Out', 'تسجيل الخروج')}
              description={t('Sign out of your active session on this device', 'إنهاء جلستك الحالية على هذا الجهاز')}
              onClick={() => setShowLogoutConfirm(true)}
              trailing={<ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />}
            />
          ) : (
            <div className="p-3.5 flex items-center justify-between text-xs gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t('Are you sure you want to sign out?', 'هل أنت متأكد من تسجيل الخروج؟')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  {t('Cancel', 'إلغاء')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLogoutConfirm(false);
                    logout();
                  }}
                  className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  {t('Log Out', 'خروج')}
                </button>
              </div>
            </div>
          )}

          {/* Delete Account Row */}
          <SettingsRow
            icon={Trash2}
            iconColor="text-rose-500"
            iconBg="bg-rose-50 dark:bg-rose-950/40"
            label={t('Delete Account', 'حذف الحساب')}
            description={t('Permanently remove your athlete profile and data', 'حذف ملفك الرياضي وكافة البيانات نهائياً')}
            destructive
            onClick={() => {
              setDeleteError(null);
              setDeletePasswordInput('');
              setShowDeleteConfirmModal(true);
            }}
            trailing={<ChevronRight className="w-4 h-4 text-rose-400 rtl:rotate-180" />}
            isLast
          />
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 animate-fade-in">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 shadow-xl animate-scale-in"
            dir={language === 'ar' ? 'rtl' : 'ltr'}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
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

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-xs text-slate-700 dark:text-slate-300 space-y-2 mb-4">
              <p className="font-semibold text-slate-900 dark:text-slate-200">
                {t('What will be deleted:', 'البيانات التي سيتم حذفها:')}
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
                <li>{t('Your athlete profile and bio (@username reservation will be released)', 'ملفك الرياضي ونبذتك (سيتم تحرير اسم المستخدم @)')}</li>
                <li>{t('Private contact details and preferences', 'بيانات الاتصال والتفضيلات الخاصة')}</li>
                <li>{t('Social friends, following/follower lists, and incoming invites', 'قوائم الأصدقاء والمتابعين والدعوات')}</li>
                <li>{t('Personal notifications and community blocks', 'الإشعارات وقائمة الحظر')}</li>
              </ul>
            </div>

            {/* Re-authentication Input */}
            {authStatus === 'authenticated' && !isGoogleUser && (
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('Confirm with Your Password', 'أدخل كلمة المرور لتأكيد الهوية')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    value={deletePasswordInput}
                    onChange={(e) => setDeletePasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {isGoogleUser && (
              <div className="mb-4 p-3 rounded-xl bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-[11px] text-slate-600 dark:text-slate-400">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
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
    </div>
  );
};
