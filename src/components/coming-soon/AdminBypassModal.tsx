import React, { useState } from 'react';
import { Shield, X, Loader2, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';

interface AdminBypassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string, email?: string) => void;
}

import { setStoredAdminToken, validateAdminSessionWithServer } from '../../config/launchMode';

/**
 * Safely parse HTTP response to prevent 'Unexpected end of JSON input' syntax errors.
 * Inspects content-type, body text, and status before attempting JSON deserialization.
 */
async function safeParseJsonResponse<T = any>(response: Response): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  rawText: string;
  isHtml: boolean;
}> {
  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    return { ok: false, status: response.status, data: null, rawText: '', isHtml: false };
  }

  const trimmed = rawText.trim();
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const isHtml = contentType.includes('text/html') || trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype');

  if (!trimmed || isHtml) {
    return { ok: response.ok, status: response.status, data: null, rawText: trimmed, isHtml };
  }

  try {
    const data = JSON.parse(trimmed) as T;
    return { ok: response.ok, status: response.status, data, rawText: trimmed, isHtml: false };
  } catch {
    return { ok: false, status: response.status, data: null, rawText: trimmed, isHtml: false };
  }
}

export const AdminBypassModal: React.FC<AdminBypassModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<'en' | 'ar'>('en');

  if (!isOpen) return null;

  const t = (en: string, ar: string) => (language === 'ar' ? ar : en);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(t('Please enter the administrator access password.', 'يرجى إدخال رمز دخول الإدارة.'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Safe, cross-origin and mobile-compatible fetch call to verify bypass password
      let response: Response;
      try {
        response = await fetch('/api/admin/verify-coming-soon-bypass', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            password: password.trim()
          })
        });
      } catch (netErr: any) {
        throw new Error(
          t(
            'Network error: unable to reach the administrator verification server. Please verify your connection.',
            'خطأ في الاتصال: تعذر الوصول إلى خادم التحقق من الإدارة. يرجى التحقق من اتصالك بالإنترنت.'
          )
        );
      }

      // Safe JSON parsing without raw response.json() crashes
      const parsed = await safeParseJsonResponse<any>(response);

      if (!parsed.data) {
        if (response.status === 429) {
          setError(
            t(
              'Too many failed attempts. Please wait 15 minutes before trying again.',
              'محاولات خاطئة متكررة. يرجى الانتظار لمدة 15 دقيقة قبل المحاولة مرة أخرى.'
            )
          );
          return;
        }

        if (response.status >= 500) {
          setError(
            t(
              `The verification service returned an empty or invalid response (HTTP ${response.status}). The server may be restarting. Please retry in a moment.`,
              `أعاد خادم التحقق استجابة غير صالحة (${response.status}). قد يكون الخادم قيد إعادة التشغيل، يرجى المحاولة بعد قليل.`
            )
          );
          return;
        }

        if (parsed.isHtml || response.status === 404) {
          setError(
            t(
              `The verification service returned an HTML response instead of JSON (HTTP ${response.status}). Check server deployment routing.`,
              `أعاد خادم التحقق استجابة HTML بدلاً من JSON (${response.status}). يرجى التحقق من إعدادات الخادم.`
            )
          );
          return;
        }

        setError(
          t(
            'Invalid response from administrator verification server. Please try again.',
            'استجابة غير متوقعة من خادم التحقق. يرجى المحاولة مرة أخرى.'
          )
        );
        return;
      }

      const data = parsed.data;

      if (!response.ok || !data.success) {
        if (data.rateLimited || response.status === 429) {
          setError(
            language === 'ar'
              ? data.errorAr || 'محاولات خاطئة متكررة. يرجى الانتظار قبل المحاولة مرة أخرى.'
              : data.error || 'Too many failed attempts. Please wait before trying again.'
          );
          return;
        }

        setError(
          language === 'ar'
            ? data.errorAr || 'رمز الدخول الخاص بالإدارة غير صحيح.'
            : data.error || 'Incorrect administrator password.'
        );
        return;
      }

      // Success: Website access session token returned
      if (data.bypassToken) {
        // 1. Establish session in client storage & cookies
        setStoredAdminToken(data.bypassToken);
        
        // 2. Confirm session validity with server before unlocking application
        const validation = await validateAdminSessionWithServer(data.bypassToken);
        if (validation.status === 'invalid') {
          setError(
            t(
              'Session confirmation failed. Please re-enter the password.',
              'فشل تأكيد جلسة الدخول. يرجى إعادة إدخال الرمز.'
            )
          );
          return;
        }

        // 3. Session established & confirmed: unlock application directly
        onSuccess(data.bypassToken);
        onClose();
      } else {
        setError(t('Verification passed but access token was not returned.', 'تم التحقق بنجاح لكن لم يتم استلام رمز الدخول.'));
      }
    } catch (err: any) {
      console.error('[AdminBypassModal] Verification error:', err);
      setError(
        err?.message ||
          t('Failed to verify administrator access. Please try again.', 'فشل التحقق من دخول الإدارة. يرجى المحاولة مرة أخرى.')
      );
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
        className="relative w-full max-w-sm bg-white dark:bg-[#0D1629] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-2xl transition-all"
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
                {t('Enter access code to unlock website', 'أدخل رمز الدخول لفتح الموقع')}
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
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer"
              aria-label={t('Close', 'إغلاق')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Form: One password field and one Enter button */}
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

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('Admin Bypass Password', 'رمز دخول الإدارة')}
            </label>
            <div className="relative">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="current-password"
                enterKeyHint="go"
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
              {t('Enter the 4-digit administrator password.', 'أدخل رمز الإدارة المكون من 4 أرقام.')}
            </p>
          </div>

          {/* Single Enter Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#1E40AF] hover:bg-[#1E3A8A] text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 interactive-tap"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('Verifying...', 'جارٍ التحقق...')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('Enter', 'دخول')}</span>
                  <span className="sr-only">Unlock Full App</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
