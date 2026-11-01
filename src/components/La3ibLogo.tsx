import React from 'react';

export type LogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'header';

interface La3ibLogoProps {
  className?: string;
  size?: LogoSize;
  showText?: boolean;
  textClassName?: string;
}

/**
 * Standardized Canonical La3ib Logo Component
 * Enforces one canonical 3:2 aspect ratio asset across all pages and viewports.
 * Prevents horizontal or vertical distortion and maintains consistent visual proportions.
 */
export const La3ibLogo: React.FC<La3ibLogoProps> = ({
  className = '',
  size = 'md',
  showText = false,
  textClassName = ''
}) => {
  // Sizing variants preserving the exact 3:2 intrinsic aspect ratio (1536x1024)
  const sizeClasses: Record<LogoSize, string> = {
    xs: 'h-5 w-[30px]',
    sm: 'h-7 w-[42px]',
    md: 'h-9 w-[54px]',
    // Header size reduced by ~25-30% to fit comfortably inside 56px/64px header without looming
    header: 'h-8 sm:h-9 lg:h-10 w-[48px] sm:w-[54px] lg:w-[60px]',
    lg: 'h-12 sm:h-14 w-[72px] sm:w-[84px]',
    xl: 'h-16 sm:h-20 w-[96px] sm:w-[120px]'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 select-none shrink-0 ${className}`}>
      <img
        src="/assets/aistudio/Playful_LA3IB_Arabic-English_Logo_40596055.png"
        alt="La3ib"
        width={1536}
        height={1024}
        className={`${sizeClasses[size]} aspect-[3/2] object-contain shrink-0`}
        loading="eager"
        onError={(e) => {
          const target = e.currentTarget;
          if (target.src.includes('Playful_LA3IB_Arabic-English_Logo_40596055.png')) {
            target.src = '/assets/aistudio/LA3IB_Arabic-Latin_Bubble_Logo_546d167b.png';
          }
        }}
      />
      {showText && (
        <div className={`flex items-baseline gap-1.5 ${textClassName}`}>
          <span className="font-extrabold text-lg tracking-tight text-[#06135B] dark:text-white">
            La3ib
          </span>
          <span className="text-[#B9C9E0] font-normal">/</span>
          <span className="font-bold text-lg text-[#3A60AA] dark:text-[#B9C9E0] font-['Cairo']">
            لاعب
          </span>
        </div>
      )}
    </div>
  );
};
