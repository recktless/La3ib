import React from 'react';
import { useApp } from '../context/AppContext';

export interface BrandedLoaderProps {
  mode?: 'fullscreen' | 'section' | 'inline';
  message?: string;
  className?: string;
}

/**
 * Standardized La3ib Branded Loading Experience
 * Displays the canonical 3:2 La3ib logo with a smooth, subtle breathing animation
 * Consistent with La3ib's Instagram x Strava clean aesthetic in light and dark modes.
 */
export const BrandedLoader: React.FC<BrandedLoaderProps> = ({
  mode = 'fullscreen',
  message,
  className = ''
}) => {
  let language = 'en';
  let t = (en: string, ar: string) => (language === 'ar' ? ar : en);
  try {
    const appContext = useApp();
    if (appContext) {
      language = appContext.language;
      t = appContext.t;
    }
  } catch {}

  if (mode === 'fullscreen') {
    return (
      <div 
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7F7F8] dark:bg-[#06135B] text-slate-900 dark:text-white transition-colors duration-200 select-none ${className}`}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
        role="status"
        aria-live="polite"
        aria-label={t('Loading La3ib...', 'جارٍ تحميل تطبيق لعيب...')}
      >
        <div className="flex flex-col items-center gap-4 animate-scale-in">
          {/* Logo with subtle GPU-accelerated breathing animation */}
          <div className="relative flex items-center justify-center">
            <img
              src="/assets/aistudio/Playful_LA3IB_Arabic-English_Logo_40596055.png"
              alt="La3ib"
              width={108}
              height={72}
              className="w-[108px] h-[72px] aspect-[3/2] object-contain animate-logo-breathe"
              loading="eager"
            />
          </div>

          {/* Minimal branded progress track */}
          <div className="w-20 h-1 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-[#3A60AA] to-[#2E4D8A] rounded-full animate-progress-indeterminate" />
          </div>

          {message && (
            <p className="text-xs font-medium text-slate-500 dark:text-[#B9C9E0] tracking-wide animate-fade-in">
              {message}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (mode === 'section') {
    return (
      <div 
        className={`py-12 sm:py-16 flex flex-col items-center justify-center gap-3 text-center rounded-2xl bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs select-none transition-colors duration-150 ${className}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-center">
          <img
            src="/assets/aistudio/Playful_LA3IB_Arabic-English_Logo_40596055.png"
            alt="La3ib"
            width={63}
            height={42}
            className="w-[54px] h-[36px] aspect-[3/2] object-contain animate-logo-breathe"
            loading="eager"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            {message || t('Loading...', 'جارٍ التحميل...')}
          </p>
          <div className="w-12 h-0.5 mx-auto bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#3A60AA] rounded-full animate-progress-indeterminate" />
          </div>
        </div>
      </div>
    );
  }

  // Inline mode (compact badge for headers or cards)
  return (
    <div 
      className={`inline-flex items-center gap-2 select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <img
        src="/assets/aistudio/Playful_LA3IB_Arabic-English_Logo_40596055.png"
        alt="La3ib"
        width={36}
        height={24}
        className="w-[30px] h-[20px] aspect-[3/2] object-contain animate-logo-breathe"
        loading="eager"
      />
      {message && (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {message}
        </span>
      )}
    </div>
  );
};
