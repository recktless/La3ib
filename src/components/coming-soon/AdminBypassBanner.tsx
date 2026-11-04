import React from 'react';
import { Shield, ArrowLeft, LogOut } from 'lucide-react';

interface AdminBypassBannerProps {
  onReturnToComingSoon: () => void;
  adminEmail?: string;
}

export const AdminBypassBanner: React.FC<AdminBypassBannerProps> = ({
  onReturnToComingSoon,
  adminEmail
}) => {
  return (
    <div
      role="banner"
      aria-label="Staff Pre-Launch Preview Active"
      className="sticky top-0 z-50 w-full bg-slate-900 text-white px-4 py-2 border-b border-slate-800 shadow-md flex items-center justify-between text-xs"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-bold flex items-center gap-1.5 text-slate-100">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Staff Pre-Launch Preview (Bypass Active)</span>
          <span className="text-slate-400 font-normal hidden sm:inline">|</span>
          <span className="text-slate-300 font-normal hidden sm:inline" dir="rtl">معاينة الإدارة (التخطي مفعل)</span>
        </span>
        {adminEmail && (
          <span className="hidden md:inline px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
            {adminEmail}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onReturnToComingSoon}
        className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer active:scale-95"
      >
        <LogOut className="w-3 h-3" />
        <span>Return to Coming Soon | العودة لصفحة قريباً</span>
      </button>
    </div>
  );
};
