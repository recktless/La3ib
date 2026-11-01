import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { clearAuthActionParams } from '../lib/firebase';

export const ResetPasswordModal: React.FC = () => {
  const {
    resetPasswordModalOpen,
    setResetPasswordModalOpen,
    resetPasswordActionCode,
    setResetPasswordActionCode,
    verifyResetCodeAction,
    confirmResetPasswordAction,
    setAuthModalOpen,
    setAuthModalMode,
    t,
    language
  } = useApp();

  const [stage, setStage] = useState<'verifying' | 'ready' | 'success' | 'error'>('verifying');
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!resetPasswordModalOpen) {
      return;
    }

    if (!resetPasswordActionCode) {
      setStage('error');
      setErrorMessage(
        t(
          'This password reset link is invalid or missing required parameters.',
          'رابط استعادة كلمة المرور غير صالح أو ينقصه معرّف التحقق.'
        )
      );
      return;
    }

    let isMounted = true;
    setStage('verifying');
    setErrorMessage(null);

    verifyResetCodeAction(resetPasswordActionCode)
      .then((email) => {
        if (!isMounted) return;
        setAccountEmail(email || '');
        setStage('ready');
      })
      .catch((err: any) => {
        if (!isMounted) return;
        const msg = err?.message || '';
        const isExpired = msg.toLowerCase().includes('expired');
        setErrorMessage(
          isExpired
            ? t(
                'This password reset link has expired. Please request a new one.',
                'انتهت صلاحية رابط استعادة كلمة المرور. يرجى طلب رابط جديد.'
              )
            : t(
                'This password reset link is invalid or has already been used. Please request a new one.',
                'هذا الرابط غير صالح أو تم استخدامه بالفعل. يرجى طلب رابط جديد.'
              )
        );
        setStage('error');
        clearAuthActionParams();
      });

    return () => {
      isMounted = false;
    };
  }, [resetPasswordModalOpen, resetPasswordActionCode]);

  if (!resetPasswordModalOpen) return null;

  const handleClose = () => {
    clearAuthActionParams();
    setResetPasswordActionCode(null);
    setResetPasswordModalOpen(false);
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!resetPasswordActionCode) {
      setErrorMessage(
        t('Reset code is missing. Please request a new link.', 'رمز إعادة التعيين مفقود. يرجى طلب رابط جديد.')
      );
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage(
        t('Password must be at least 6 characters long.', 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.')
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(
        t('Passwords do not match. Please re-enter them.', 'كلمتا المرور غير متطابقتين. يرجى إعادة إدخالهما.')
      );
      return;
    }

    setSubmitting(true);
    try {
      await confirmResetPasswordAction(resetPasswordActionCode, newPassword);
      clearAuthActionParams();
      setResetPasswordActionCode(null);
      setStage('success');
    } catch (err: any) {
      const msg = err?.message || '';
      const isExpired = msg.toLowerCase().includes('expired');
      const isUsedOrInvalid = msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('already');

      if (isExpired || isUsedOrInvalid) {
        setStage('error');
        clearAuthActionParams();
        setErrorMessage(
          isExpired
            ? t(
                'This password reset link has expired. Please request a new one.',
                'انتهت صلاحية رابط استعادة كلمة المرور. يرجى طلب رابط جديد.'
              )
            : t(
                'This password reset link is invalid or has already been used. Please request a new one.',
                'هذا الرابط غير صالح أو تم استخدامه بالفعل. يرجى طلب رابط جديد.'
              )
        );
      } else {
        setErrorMessage(msg || t('Failed to update password. Please try again.', 'فشل تحديث كلمة المرور. يرجى المحاولة مرة أخرى.'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenLogin = () => {
    handleClose();
    setAuthModalMode('login');
    setAuthModalOpen(true);
  };

  const handleRequestNewReset = () => {
    handleClose();
    setAuthModalMode('forgot_password');
    setAuthModalOpen(true);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 overflow-y-auto animate-fade-in"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#131C31] border border-slate-200 dark:border-[#22304E] rounded-2xl p-5 sm:p-7 max-h-[92dvh] overflow-y-auto transition-colors animate-scale-in">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1B253D] transition-colors cursor-pointer"
          aria-label={t('Close', 'إغلاق')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. VERIFYING STAGE */}
        {stage === 'verifying' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 dark:bg-[#1B253D] border border-blue-200 dark:border-[#2A3B5C] text-[#1246DF] dark:text-[#05BCD1] mb-4">
              <KeyRound className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('Verifying Password Reset Link', 'التحقق من رابط استعادة كلمة المرور')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
              {t(
                'Please wait a moment while we validate your secure action code...',
                'يرجى الانتظار بينما نتحقق من أمان وصلاحية الرابط...'
              )}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-[#1246DF] dark:text-[#05BCD1] font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Validating code...', 'جارٍ التحقق...')}</span>
            </div>
          </div>
        )}

        {/* 2. READY / INPUT STAGE */}
        {stage === 'ready' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center text-[#1246DF] dark:text-[#05BCD1]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {t('Set New Password', 'إنشاء كلمة مرور جديدة')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {accountEmail ? (
                    <>
                      {t('For account: ', 'للحساب: ')}
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{accountEmail}</span>
                    </>
                  ) : (
                    t('Enter and confirm your new secure password.', 'أدخل كلمة المرور الجديدة وأكدها.')
                  )}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('New Password', 'كلمة المرور الجديدة')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:left-auto rtl:right-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('Minimum 6 characters', '6 أحرف على الأقل')}
                    className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl pl-9 pr-10 rtl:pl-10 rtl:pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF] dark:focus:border-[#05BCD1] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rtl:right-auto rtl:left-3"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {t('Confirm New Password', 'تأكيد كلمة المرور الجديدة')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 rtl:left-auto rtl:right-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-[#1B253D] border border-slate-200 dark:border-[#2A3B5C] rounded-xl pl-9 pr-10 rtl:pl-10 rtl:pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#1246DF] dark:focus:border-[#05BCD1] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rtl:right-auto rtl:left-3"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || newPassword.length < 6 || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white font-bold text-xs sm:text-sm transition-colors disabled:opacity-50 cursor-pointer mt-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('Updating Password...', 'جارٍ تحديث كلمة المرور...')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('Save New Password', 'حفظ كلمة المرور الجديدة')}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* 3. SUCCESS STAGE */}
        {stage === 'success' && (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('Password Successfully Reset!', 'تمت إعادة تعيين كلمة المرور بنجاح!')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto mb-6 leading-relaxed">
              {t(
                'Your account password has been updated. You can now sign in using your new credentials.',
                'تم تحديث كلمة المرور لحسابك بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
              )}
            </p>
            <button
              onClick={handleOpenLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              {t('Sign In to Your Account', 'تسجيل الدخول إلى حسابك')}
            </button>
          </div>
        )}

        {/* 4. ERROR STAGE */}
        {stage === 'error' && (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              {t('Invalid or Expired Link', 'رابط غير صالح أو منتهي الصلاحية')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-sm mx-auto mb-6 leading-relaxed">
              {errorMessage ||
                t(
                  'This password reset link is invalid or has already been used. Please request a fresh reset link.',
                  'هذا الرابط غير صالح أو تم استخدامه بالفعل. يرجى طلب رابط استعادة جديد.'
                )}
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleRequestNewReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1246DF] hover:bg-[#0E38B8] text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('Request New Reset Link', 'طلب رابط استعادة جديد')}</span>
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#1B253D] dark:hover:bg-[#253452] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-200 dark:border-[#2A3B5C]"
              >
                {t('Return to App', 'العودة إلى التطبيق')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
