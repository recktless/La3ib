import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Mail, 
  Lock, 
  User, 
  MapPin, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2,
  Shield,
  ArrowLeft
} from 'lucide-react';
import { KuwaitArea } from '../types';
import { mapFirebaseAuthError } from '../lib/firebase';

export const AuthModal: React.FC = () => {
  const { 
    authModalOpen, 
    setAuthModalOpen, 
    authModalMode, 
    setAuthModalMode,
    loginWithEmail,
    registerWithEmail,
    loginWithGoogleAuth,
    sendPasswordResetEmailAction,
    continueAsDemo,
    t,
    language 
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [area, setArea] = useState<KuwaitArea>('Salmiya');
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!authModalOpen) return null;

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setError(null);
    setResetSent(false);
  };

  const handleClose = () => {
    resetForm();
    setAuthModalOpen(false);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authModalMode === 'forgot_password') {
      if (!email.trim()) {
        setError(t('Please enter your email address.', 'يرجى إدخال البريد الإلكتروني.'));
        return;
      }
      setLoading(true);
      try {
        await sendPasswordResetEmailAction(email.trim());
        setResetSent(true);
      } catch (err: any) {
        setError(mapFirebaseAuthError(err, language));
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password) {
      setError(t('Please enter both email and password.', 'يرجى إدخال البريد الإلكتروني وكلمة المرور.'));
      return;
    }

    if (authModalMode === 'register') {
      if (!name.trim()) {
        setError(t('Please enter your full name.', 'يرجى إدخال اسمك الكامل.'));
        return;
      }
      if (password.length < 6) {
        setError(t('Password must be at least 6 characters.', 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('Passwords do not match.', 'كلمتا المرور غير متطابقتين.'));
        return;
      }
    }

    setLoading(true);
    try {
      if (authModalMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name.trim(), area);
      }
      handleClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(mapFirebaseAuthError(err, language));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogleAuth();
      handleClose();
    } catch (err: any) {
      setError(mapFirebaseAuthError(err, language));
    } finally {
      setGoogleLoading(false);
    }
  };

  const kuwaitAreas: KuwaitArea[] = [
    'Salmiya', 'Shuwaikh', 'Mishref', 'Kuwait City', 'Hawalli', 'Yarmouk', 'Jabriya', 'Sabhan', 'Mahboula', 'Abu Hasaniya', 'Jahra', 'Ardhiya'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-neutral-800/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 font-bold text-xl shadow-inner">
            ⚽
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {authModalMode === 'forgot_password'
              ? t('Reset Password', 'استعادة كلمة المرور')
              : authModalMode === 'login'
              ? t('Welcome Back to La3ib', 'مرحباً بك مجدداً في لعيب')
              : t('Create Your Athlete Profile', 'أنشئ حسابك الرياضي')}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            {authModalMode === 'forgot_password'
              ? t('Enter your registered email and we will send a password reset link.', 'أدخل بريدك الإلكتروني المسجل وسنرسل لك رابط إعادة تعيين كلمة المرور.')
              : authModalMode === 'login'
              ? t('Sign in to access your bookings, ratings, and matches.', 'سجل دخولك لمتابعة مبارياتك وحجوزاتك وتقييمك.')
              : t('Join Kuwait’s premier pickup sports community.', 'انضم إلى أكبر مجتمع للمباريات الرياضية في الكويت.')}
          </p>
        </div>

        {/* Mode Switcher Tabs (Only in login / register modes) */}
        {authModalMode !== 'forgot_password' && (
          <div className="flex bg-neutral-950 p-1 rounded-2xl border border-neutral-800 mb-6">
            <button
              type="button"
              onClick={() => { setAuthModalMode('login'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                authModalMode === 'login'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('Sign In', 'تسجيل الدخول')}
            </button>
            <button
              type="button"
              onClick={() => { setAuthModalMode('register'); setError(null); }}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                authModalMode === 'register'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {t('Create Account', 'حساب جديد')}
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/80 text-red-200 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success Alert for Reset Link */}
        {resetSent && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {t('If an account exists for this email, password reset instructions have been sent. Please check your inbox.', 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني إذا كان مسجلاً.')}
            </span>
          </div>
        )}

        {/* Google Sign In Button (in login / register modes) */}
        {authModalMode !== 'forgot_password' && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 text-neutral-100 font-semibold text-xs sm:text-sm transition-all shadow-sm hover:border-neutral-600 disabled:opacity-50 mb-4 cursor-pointer"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              )}
              <span>{t('Continue with Google', 'المتابعة باستخدام Google')}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-neutral-800 w-full" />
              <span className="bg-neutral-900 px-3 text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
                {t('Or with email', 'أو بالبريد الإلكتروني')}
              </span>
              <div className="border-t border-neutral-800 w-full" />
            </div>
          </>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleEmailSubmit} className="space-y-3.5">
          {authModalMode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  {t('Full Name', 'الاسم الكامل')}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('e.g. Faisal Al-Sabah', 'مثال: فيصل الصباح')}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  {t('Primary Area in Kuwait', 'المنطقة السكنية')}
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                  <select
                    value={area}
                    onChange={(e) => setArea(e.target.value as KuwaitArea)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
                  >
                    {kuwaitAreas.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-300 mb-1">
              {t('Email Address', 'البريد الإلكتروني')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {authModalMode !== 'forgot_password' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-neutral-300">
                  {t('Password', 'كلمة المرور')}
                </label>
                {authModalMode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setAuthModalMode('forgot_password'); setError(null); }}
                    className="text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    {t('Forgot password?', 'نسيت كلمة المرور؟')}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          {authModalMode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-neutral-300 mb-1">
                {t('Confirm Password', 'تأكيد كلمة المرور')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {authModalMode === 'forgot_password'
                    ? t('Send Reset Link', 'إرسال رابط الاستعادة')
                    : authModalMode === 'login'
                    ? t('Sign In to Account', 'تسجيل الدخول')
                    : t('Create Athlete Profile', 'إنشاء الحساب')}
                </span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>

          {authModalMode === 'forgot_password' && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setAuthModalMode('login'); setError(null); setResetSent(false); }}
                className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" />
                <span>{t('Back to Sign In', 'العودة لتسجيل الدخول')}</span>
              </button>
            </div>
          )}
        </form>

        {/* Demo Mode Fallback Button */}
        {authModalMode !== 'forgot_password' && (
          <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
            <p className="text-[11px] text-neutral-400 mb-2">
              {t('Just exploring Kuwait games and venues?', 'هل ترغب في تصفح الملاعب والمباريات سريعاً؟')}
            </p>
            <button
              type="button"
              onClick={() => {
                continueAsDemo();
                handleClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t('Continue with Demo Mode (Ahmed)', 'المتابعة بالحساب التجريبي (أحمد)')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
