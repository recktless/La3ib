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

  // Validate the action code whenever the modal opens with a code
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
        // Clean URL params so subsequent page refreshes do not re-run the failed action code
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
      // Clean up URL parameters immediately upon success
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sm:p-7 shadow-2xl overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rtl:right-auto rtl:left-4 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          aria-label={t('Close', 'إغلاق')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. VERIFYING STAGE */}
        {stage === 'verifying' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 text-emerald-400 mb-4 animate-pulse">
              <KeyRound className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {t('Verifying Password Reset Link', 'التحقق من رابط استعادة كلمة المرور')}
            </h3>
            <p className="text-xs text-neutral-400 max-w-xs mx-auto mb-6">
              {t(
                'Please wait a moment while we validate your secure action code...',
                'يرجى الانتظار بينما نتحقق من أمان وصلاحية الرابط...'
              )}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('Validating code...', 'جارٍ التحقق...')}</span>
            </div>
          </div>
        )}

        {/* 2. READY / INPUT STAGE */}
        {stage === 'ready' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {t('Set New Password', 'إنشاء كلمة مرور جديدة')}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {accountEmail ? (
                    <>
                      {t('For account: ', 'للحساب: ')}
                      <span className="text-neutral-200 font-medium">{accountEmail}</span>
                    </>
                  ) : (
                    t('Enter and confirm your new secure password.', 'أدخل كلمة المرور الجديدة وأكدها.')
                  )}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {t('New Password', 'كلمة المرور الجديدة')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rtl:left-auto rtl:right-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('Minimum 6 characters', '6 أحرف على الأقل')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-10 rtl:pl-10 rtl:pr-9 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 rtl:right-auto rtl:left-3"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  {t('Confirm New Password', 'تأكيد كلمة المرور الجديدة')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 rtl:left-auto rtl:right-3" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-10 rtl:pl-10 rtl:pr-9 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 rtl:right-auto rtl:left-3"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || newPassword.length < 6 || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer mt-2"
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
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {t('Password Successfully Reset!', 'تمت إعادة تعيين كلمة المرور بنجاح!')}
            </h3>
            <p className="text-xs text-neutral-300 max-w-sm mx-auto mb-6 leading-relaxed">
              {t(
                'Your account password has been updated. You can now sign in using your new credentials.',
                'تم تحديث كلمة المرور لحسابك بنجاح. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.'
              )}
            </p>
            <button
              onClick={handleOpenLogin}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              {t('Sign In to Your Account', 'تسجيل الدخول إلى حسابك')}
            </button>
          </div>
        )}

        {/* 4. ERROR STAGE (Invalid or Expired Link) */}
        {stage === 'error' && (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/30 text-red-400 mb-4 shadow-lg shadow-red-500/10">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">
              {t('Invalid or Expired Link', 'رابط غير صالح أو منتهي الصلاحية')}
            </h3>
            <p className="text-xs text-neutral-300 max-w-sm mx-auto mb-6 leading-relaxed">
              {errorMessage ||
                t(
                  'This password reset link is invalid or has already been used. Please request a fresh reset link.',
                  'هذا الرابط غير صالح أو تم استخدامه بالفعل. يرجى طلب رابط استعادة جديد.'
                )}
            </p>

            <div className="space-y-2.5">
              <button
                onClick={handleRequestNewReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('Request New Reset Link', 'طلب رابط استعادة جديد')}</span>
              </button>
              <button
                onClick={handleClose}
                className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
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
