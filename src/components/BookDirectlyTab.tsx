import React from 'react';
import { useApp } from '../context/AppContext';
import { CalendarPlus, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export const BookDirectlyTab: React.FC = () => {
  const { setActiveTab, language, t } = useApp();
  const isRtl = language === 'ar';

  return (
    <div className="w-full max-w-lg mx-auto py-10 sm:py-16 px-4">
      {/* Soft rounded presentation card */}
      <div className="bg-white dark:bg-[#0D1629] border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-xs text-center">
        {/* Subtle Coming Soon Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEF3F9] dark:bg-[#142578] text-[#3A60AA] dark:text-[#B9C9E0] text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('Coming Soon', 'قريبًا')}</span>
        </div>

        {/* Soft Icon Presentation */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#EEF3F9] dark:bg-[#111E42] border border-[#B9C9E0]/40 dark:border-[#1F3590]/50 text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center mx-auto mb-6 shadow-xs">
          <CalendarPlus className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl font-bold text-[#06135B] dark:text-white tracking-tight mb-3">
          {t('Book Directly', 'احجز مباشرة')}
        </h1>

        {/* Description */}
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto mb-8">
          {t(
            "We're working on a simpler way to book sports venues directly through La3ib. Soon, you'll be able to find and book courts without leaving the app.",
            "نعمل على توفير طريقة أسهل لحجز الملاعب والمنشآت الرياضية مباشرة عبر لعّيب. قريبًا، ستتمكن من استكشاف وحجز الملاعب دون مغادرة التطبيق."
          )}
        </p>

        {/* Back to Home Action Button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-sm font-bold transition-all cursor-pointer shadow-xs hover:shadow-sm"
          >
            {isRtl ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span>{t('Back to Home', 'العودة للرئيسية')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
