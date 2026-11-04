import React, { useState } from 'react';
import { Lock, Shield, X, Loader2, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface AdminBypassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export const AdminBypassModal: React.FC<AdminBypassModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('khalidalami5555@gmail.com');
  const [adminPassword, setAdminPassword] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  if (!isOpen) return null;

  const t = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(t('Please enter the administrator bypass code.', 'يرجى إدخال رمز دخول الإدارة.'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let idToken: string | null = null;
      const currentAuth = auth?.currentUser;

      if (currentAuth) {
        idToken = await currentAuth.getIdToken(true);
      } else if (requiresAuth || adminPassword) {
        // Authenticate with Firebase if credentials provided
        if (!auth) {
          throw new Error('Firebase Auth is not available.');
        }
        const userCred = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
        idToken = await userCred.user.getIdToken(true);
      }

      // Call secure server verification endpoint
      const response = await fetch('/api/admin/verify-coming-soon-bypass', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
        body: JSON.stringify({
          password: password.trim(),
          idToken
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.requiresAuth) {
          setRequiresAuth(true);
          setError(
            language === 'ar'
              ? data.errorAr || 'مطلوب تسجيل الدخول بحساب مسؤول معتمد.'
              : data.error || 'Administrator credentials required to verify bypass authorization.'
          );
        } else {
          setError(
            language === 'ar'
              ? data.errorAr || 'رمز الدخول الخاص بالإدارة غير صحيح.'
              : data.error || 'Incorrect administrator bypass code.'
          );
        }
        return;
      }

      // Success
      if (data.bypassToken) {
        onSuccess(data.bypassToken);
        onClose();
      }
    } catch (err: any) {
      console.error('[AdminBypassModal] Verification error:', err);
      setError(err?.message || t('Failed to verify administrator bypass. Please try again.', 'فشل التحقق من دخول الإدارة. يرجى المحاولة مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bypass-modal-title"
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#EEF4FF] dark:bg-[#15254A] text-[#1E40AF] dark:text-[#60A5FA] flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="bypass-modal-title" className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t('Administrator Access', 'دخول الإدارة')}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {t('Authorized staff pre-launch bypass', 'تخطي مرحلة الإطلاق للمسؤولين المعتمدين')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLanguage(l => (l === 'en' ? 'ar' : 'en'))}
              className="text-[11px] font-bold px-2 py-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {language === 'en' ? 'عربي' : 'EN'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
              aria-label={t('Close', 'إغلاق')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* Bypass Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('Admin Bypass Password', 'رمز دخول الإدارة')}
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                maxLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-mono tracking-widest focus:ring-2 focus:ring-[#1E40AF] focus:border-transparent outline-none transition-all"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 end-3 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {t('Enter your 4-digit administrator pre-launch key.', 'أدخل الرمز الرباعي المعتمد للإدارة.')}
            </p>
          </div>

          {/* If Firebase Admin Authentication is required */}
          {requiresAuth && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
              <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#1E40AF]" />
                <span>{t('Admin Identity Verification', 'التحقق من هوية المسؤول')}</span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Admin Email', 'البريد الإلكتروني للإدارة')}
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {t('Firebase Password', 'كلمة مرور الحساب')}
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  required
                />
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('Cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t('Verifying...', 'جارٍ التحقق...')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('Unlock Full App', 'دخول التطبيق')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
