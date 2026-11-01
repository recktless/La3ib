import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ArrowLeft, 
  ArrowRight,
  Settings, 
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
  Laptop
} from 'lucide-react';
import { resolvePlayerAvatar, ThemePreference } from '../types';
import { mapFirebaseAuthError } from '../lib/firebase';
import { La3ibLogo } from './La3ibLogo';

interface SettingsViewProps {
  onBackToProfile: () => void;
  onOpenEditProfile: () => void;
}

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
          ? t('Profile privacy set to Private. Only friends can view full match history.', 'تم تعيين خصوصية الملف إلى خاص. يمكن فقط للأصدقاء مشاهدة سجل المباريات.')
          : t('Profile privacy set to Public. Anyone on La3ib can view your sports stats.', 'تم تعيين خصوصية الملف إلى عام. يمكن لجميع الرياضيين مشاهدة إحصائياتك.')
      );
      setTimeout(() => setPrivacySuccessNotice(null), 4000);
    } catch (err: any) {
      setPrivacyError(err?.message || t('Failed to update privacy settings. Please try again.', 'فشل تحديث إعدادات الخصوصية. يرجى المحاولة مجدداً.'));
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Navigation Bar with Back Button */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] transition-colors">
        <button
          type="button"
          onClick={onBackToProfile}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253352] text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors cursor-pointer group border border-slate-200 dark:border-[#2A3B5C]"
          aria-label={t('Back to Profile', 'العودة للملف الرياضي')}
        >
          {language === 'ar' ? (
            <ArrowRight className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1] group-hover:translate-x-0.5 transition-transform" />
          ) : (
            <ArrowLeft className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1] group-hover:-translate-x-0.5 transition-transform" />
          )}
          <span>{t('Back to Profile', 'العودة للملف الرياضي')}</span>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-[#1246DF]/20 border border-blue-200 dark:border-[#1246DF]/30 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center">
            <Settings className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {t('Profile Settings', 'إعدادات الملف الشخصي')}
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {t('Account, preferences, privacy, and community controls', 'إدارة الحساب، التفضيلات، الخصوصية، ومجتمع الرياضة')}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: ACCOUNT                                                        */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-5 transition-colors">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1B253D]">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-[#1246DF]/20 border border-blue-200 dark:border-[#1246DF]/30 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('Account', 'الحساب')}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('Manage your personal details, credentials, and account lifecycle.', 'إدارة بياناتك الشخصية، بيانات الاعتماد، ودورة حياة الحساب.')}
            </p>
          </div>
        </div>

        {/* Current Account Summary Banner */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img 
              src={resolvePlayerAvatar(currentUser)} 
              alt={currentUser.name} 
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-[#2A3B5C] shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 dark:text-white text-sm truncate">{currentUser.name}</span>
                <span className="text-[11px] font-mono text-[#1246DF] dark:text-[#05BCD1]">@{currentUser.username}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  authStatus === 'authenticated'
                    ? 'bg-blue-100 text-[#1246DF] dark:bg-[#1246DF]/20 dark:text-[#05BCD1] border border-blue-200 dark:border-[#1246DF]/40'
                    : authStatus === 'demo'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-slate-200 text-slate-600 dark:bg-[#24324F] dark:text-slate-400'
                }`}>
                  {authStatus === 'authenticated'
                    ? t('Verified', 'موثق')
                    : authStatus === 'demo'
                    ? t('Demo Account', 'حساب تجريبي')
                    : t('Guest', 'زائر')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {currentUser.email || firebaseUser?.email || (authStatus === 'demo' ? 'ahmed.kandari@demo.la3ib.kw' : t('No email registered', 'لا يوجد بريد مسجل'))}
              </p>
            </div>
          </div>

          {/* Edit Profile Action */}
          <button
            type="button"
            onClick={onOpenEditProfile}
            className="px-3.5 py-2 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('Edit Profile', 'تعديل الملف الرياضي')}</span>
          </button>
        </div>

        {/* Change Password Card */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#1246DF] dark:text-[#05BCD1]" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('Change Password', 'تغيير كلمة المرور')}
              </h3>
            </div>
          </div>

          {authStatus === 'authenticated' && !isGoogleUser && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
              <div>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {t('Send a secure password recovery link to your registered email address.', 'إرسال رابط آمن لاستعادة كلمة المرور إلى بريدك المسجل.')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {currentUser.email || firebaseUser?.email}
                </p>
              </div>

              <button
                type="button"
                disabled={isSendingReset}
                onClick={handleSendPasswordReset}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#131C31] dark:hover:bg-[#18233D] text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-[#2E4166] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSendingReset ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5 text-[#05BCD1]" />
                )}
                <span>{t('Send Password Reset Link', 'إرسال رابط التغيير')}</span>
              </button>
            </div>
          )}

          {isGoogleUser && (
            <div className="p-3 rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#2A3B5C] flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-[#05BCD1] shrink-0 mt-0.5" />
              <span>
                {t(
                  'Your account is secured directly via Google OAuth. Passwords and security are managed in your Google Account.',
                  'حسابك مؤمن مباشرة عبر Google OAuth. تتم إدارة كلمات المرور والأمان من خلال حساب Google.'
                )}
              </span>
            </div>
          )}

          {authStatus === 'demo' && (
            <div className="p-3 rounded-xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#2A3B5C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  {t(
                    'You are exploring in Demo Mode. Password changes are disabled for the demo simulation account.',
                    'تتصفح حالياً بالحساب التجريبي. تغيير كلمة المرور غير متاح لهذا الحساب.'
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthModalMode('register');
                  setAuthModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white font-bold text-xs shrink-0 cursor-pointer"
              >
                {t('Register Real Account', 'إنشاء حساب جديد')}
              </button>
            </div>
          )}

          {resetNotice && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#1246DF] dark:text-[#05BCD1] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{resetNotice}</span>
            </div>
          )}

          {resetError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}
        </div>

        {/* Log Out Row */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <LogOut className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span>{t('Log Out', 'تسجيل الخروج')}</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {t('Sign out of your active session on this device.', 'تسجيل الخروج من جلستك النشطة على هذا الجهاز.')}
            </p>
          </div>

          {!showLogoutConfirm ? (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#131C31] dark:hover:bg-[#18233D] text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#2E4166] transition-colors cursor-pointer shrink-0"
            >
              {t('Log Out', 'تسجيل الخروج')}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                {t('Confirm sign out?', 'تأكيد الخروج؟')}
              </span>
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
              >
                {t('Cancel', 'إلغاء')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {t('Yes, Sign Out', 'نعم، خروج')}
              </button>
            </div>
          )}
        </div>

        {/* Danger Zone: Account Deletion */}
        <div className="p-4 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('Delete Account', 'حذف الحساب')}</span>
            </h3>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-200/70 mt-0.5">
              {t('Permanently remove your athlete profile, private settings, and social data.', 'حذف ملفك الرياضي، إعداداتك الخاصة، وبيانات حسابك بشكل نهائي.')}
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

      {/* ========================================================================= */}
      {/* SECTION 2: PREFERENCES (APPEARANCE & LANGUAGE)                           */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-6 transition-colors">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1B253D]">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-[#1246DF]/20 border border-blue-200 dark:border-[#1246DF]/30 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('Preferences', 'التفضيلات')}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('Customize appearance, interface theme, and language experience.', 'تخصيص المظهر، سمة الواجهة، وتجربة اللغة.')}
            </p>
          </div>
        </div>

        {/* 1. Appearance / Dark Mode Selector (NEW REQUIREMENT) */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
              {t('Appearance', 'المظهر')}
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                'Switch between Light, Dark, or System mode. Changes apply instantly and persist across sessions.',
                'التبديل بين الوضع الفاتح، الداكن، أو التلقائي مع النظام. يتم حفظ اختيارك فوراً.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {/* Light Option */}
            <div
              onClick={() => setThemePreference('light')}
              className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex items-center justify-between ${
                themePreference === 'light'
                  ? 'bg-blue-50 border-[#1246DF] dark:border-[#05BCD1] dark:bg-[#1B253D]'
                  : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  themePreference === 'light'
                    ? 'bg-[#1246DF] text-white'
                    : 'bg-slate-200 dark:bg-[#24324F] text-slate-700 dark:text-slate-300'
                }`}>
                  <Sun className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{t('Light', 'فاتح')}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('Clean & bright', 'ساطع ونقي')}</p>
                </div>
              </div>
              {themePreference === 'light' && (
                <div className="w-4 h-4 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Dark Option */}
            <div
              onClick={() => setThemePreference('dark')}
              className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex items-center justify-between ${
                themePreference === 'dark'
                  ? 'bg-blue-50 border-[#1246DF] dark:border-[#05BCD1] dark:bg-[#1B253D]'
                  : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  themePreference === 'dark'
                    ? 'bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950'
                    : 'bg-slate-200 dark:bg-[#24324F] text-slate-700 dark:text-slate-300'
                }`}>
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{t('Dark', 'داكن')}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('Deep charcoal', 'ليلي مريح')}</p>
                </div>
              </div>
              {themePreference === 'dark' && (
                <div className="w-4 h-4 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>

            {/* System Option */}
            <div
              onClick={() => setThemePreference('system')}
              className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex items-center justify-between ${
                themePreference === 'system'
                  ? 'bg-blue-50 border-[#1246DF] dark:border-[#05BCD1] dark:bg-[#1B253D]'
                  : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  themePreference === 'system'
                    ? 'bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950'
                    : 'bg-slate-200 dark:bg-[#24324F] text-slate-700 dark:text-slate-300'
                }`}>
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{t('System', 'تلقائي')}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">{t('Follows device', 'حسب جهازك')}</p>
                </div>
              </div>
              {themePreference === 'system' && (
                <div className="w-4 h-4 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Language Selection */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#1B253D]">
          <div>
            <label className="block text-xs font-bold text-slate-900 dark:text-white mb-1">
              {t('Language', 'اللغة')}
            </label>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t(
                'Switch between English and Arabic immediately. Your choice is automatically saved.',
                'التبديل بين الإنجليزية والعربية فوراً. يتم حفظ اختيارك تلقائياً عبر الجلسات.'
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* English Option */}
            <div
              onClick={() => setLanguage('en')}
              className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex items-center justify-between ${
                language === 'en'
                  ? 'bg-blue-50 border-[#1246DF] dark:border-[#05BCD1] dark:bg-[#1B253D]'
                  : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-[#1246DF] dark:text-[#05BCD1]">EN</span>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">English</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Left-to-Right (LTR)</p>
                </div>
              </div>
              {language === 'en' && (
                <div className="w-4 h-4 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>

            {/* Arabic Option */}
            <div
              onClick={() => setLanguage('ar')}
              className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex items-center justify-between ${
                language === 'ar'
                  ? 'bg-blue-50 border-[#1246DF] dark:border-[#05BCD1] dark:bg-[#1B253D]'
                  : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center gap-3">
                <span className="text-base font-bold text-[#1246DF] dark:text-[#05BCD1] font-['Cairo']">عربي</span>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white font-['Cairo']">العربية</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">من اليمين إلى اليسار (RTL)</p>
                </div>
              </div>
              {language === 'ar' && (
                <div className="w-4 h-4 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: PRIVACY & SAFETY                                               */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-5 transition-colors">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1B253D]">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-[#1246DF]/20 border border-blue-200 dark:border-[#1246DF]/30 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('Privacy & Safety', 'الخصوصية والأمان')}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('Control your profile visibility and manage community boundaries.', 'التحكم في ظهور ملفك وإدارة حدود التواصل الرياضي.')}
            </p>
          </div>
        </div>

        {/* Profile Privacy Setting */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                {t('Profile Privacy', 'خصوصية الملف الشخصي')}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {t(
                  'Choose whether your full match history and stats are visible to everyone or only confirmed friends.',
                  'اختر ما إذا كان سجل مبارياتك وإحصائياتك مرئياً للجميع أو فقط للأصدقاء المؤكدين.'
                )}
              </p>
            </div>
            {isUpdatingPrivacy && (
              <div className="flex items-center gap-1.5 text-xs text-[#05BCD1]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{t('Saving...', 'جارٍ الحفظ...')}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Public Option */}
            <div
              onClick={() => handleSetProfilePrivacy(false)}
              className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex flex-col justify-between space-y-2 ${
                !isPrivate
                  ? 'bg-blue-50 border-[#1246DF] dark:border-[#05BCD1] dark:bg-[#1B253D]'
                  : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>🌍</span> {t('Public Profile', 'ملف عام')}
                </span>
                {!isPrivate && (
                  <div className="w-4 h-4 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  'Anyone on La3ib can view your profile, sport history, and athlete statistics.',
                  'يمكن لأي رياضي على منصة لاعب استعراض ملفك وسجل مبارياتك وإحصائياتك.'
                )}
              </p>
            </div>

            {/* Private Option */}
            <div
              onClick={() => handleSetProfilePrivacy(true)}
              className={`p-3.5 rounded-xl border transition-colors cursor-pointer select-none flex flex-col justify-between space-y-2 ${
                isPrivate
                  ? 'bg-blue-50 border-[#1246DF] dark:border-[#05BCD1] dark:bg-[#1B253D]'
                  : 'bg-slate-50 dark:bg-[#1B253D] border-slate-200 dark:border-[#2A3B5C] hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              role="button"
              tabIndex={0}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#05BCD1]" /> {t('Private Profile', 'ملف خاص')}
                </span>
                {isPrivate && (
                  <div className="w-4 h-4 rounded-full bg-[#1246DF] dark:bg-[#05BCD1] text-white dark:text-slate-950 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                {t(
                  'Only confirmed friends can view your activity history, upcoming matches, and match stats.',
                  'فقط الأصدقاء المؤكدون يمكنهم مشاهدة سجل أنشطتك، مبارياتك القادمة، وإحصائياتك.'
                )}
              </p>
            </div>
          </div>

          {privacySuccessNotice && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-[#1246DF] dark:text-[#05BCD1] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{privacySuccessNotice}</span>
            </div>
          )}

          {privacyError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{privacyError}</span>
            </div>
          )}
        </div>

        {/* Blocked Users Sub-Section */}
        <div className="pt-4 border-t border-slate-100 dark:border-[#1B253D] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-500" />
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('Blocked Users', 'اللاعبون المحظورون')}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t(
                    'Manage players you have blocked from interacting with you in the community.',
                    'إدارة قائمة اللاعبين الذين تم حظرهم من التفاعل معك.'
                  )}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-slate-600 dark:text-slate-400 font-mono">
              {blockedPlayersList.length}
            </span>
          </div>

          {blockedPlayersList.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] text-center text-xs text-slate-500 dark:text-slate-400">
              {t('You have not blocked any players.', 'لم تقم بحظر أي لاعب.')}
            </div>
          ) : (
            <div className="space-y-2">
              {blockedPlayersList.map((player) => {
                const targetId = player.id || player.uid || '';
                const isLoading = isBlockActionLoading(targetId);

                return (
                  <div
                    key={targetId}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img 
                        src={resolvePlayerAvatar(player)} 
                        alt={player.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-[#2A3B5C] shrink-0" 
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{player.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">@{player.username}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => unblockPlayer(targetId)}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-[#131C31] dark:hover:bg-[#18233D] text-xs font-bold text-slate-800 dark:text-white border border-slate-200 dark:border-[#2E4166] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#05BCD1]" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-[#05BCD1]" />
                      )}
                      <span>{t('Unblock', 'إلغاء الحظر')}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: ABOUT LA3IB — STRICT OFFICIAL BRANDING                         */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] space-y-4 transition-colors">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-[#1B253D]">
          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-[#1246DF]/20 border border-blue-200 dark:border-[#1246DF]/30 text-[#1246DF] dark:text-[#05BCD1] flex items-center justify-center">
            <La3ibLogo size="xs" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('About La3ib', 'حول منصة لاعب')}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('Kuwait Pickup Sports & Court Booking Community', 'مجتمع تنظيم المباريات وحجز الملاعب في الكويت')}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] space-y-3">
          <div className="flex items-center gap-3">
            <La3ibLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-black text-slate-900 dark:text-white">La3ib</span>
                <span className="text-slate-400 font-normal">/</span>
                <span className="text-base sm:text-lg font-black text-[#1246DF] dark:text-[#05BCD1] font-['Cairo']">لاعب</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                {t('Kuwait Sports & Pickup Community', 'مجتمع الرياضة والحجوزات في الكويت')}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {t(
              'La3ib connects athletes across Kuwait for casual and competitive football, padel, basketball, and more. Featuring real-time court availability, fair cost-sharing with WAMD, and verified player rosters.',
              'منصة لاعب تجمع الرياضيين في الكويت لمباريات كرة القدم، البادل، السلة والمزيد. مع تكامل مباشر لحجز الملاعب، وتقاسم شفاف للتكاليف عبر ومض، وقوائم لاعبين موثقة.'
            )}
          </p>

          <div className="pt-2 border-t border-slate-200/60 dark:border-[#2A3B5C]">
            <button
              type="button"
              onClick={() => setActiveTab('guidelines')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#EEF3F9] hover:bg-[#DCE5F2] dark:bg-[#142578] dark:hover:bg-[#1B3088] text-[#06135B] dark:text-white text-xs font-bold transition-colors cursor-pointer border border-[#B9C9E0]/60 dark:border-[#1F3590]"
            >
              <ShieldCheck className="w-4 h-4 text-[#3A60AA] dark:text-[#B9C9E0]" />
              <span>{t('View Community & Safety Guidelines', 'عرض إرشادات المجتمع والسلامة')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 animate-in fade-in duration-150">
          <div 
            className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-rose-200 dark:border-rose-900/60 rounded-2xl p-6 shadow-xl"
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
