import React, { useState, useEffect } from 'react';
import { OfficialStickersScene } from './OfficialStickersScene';
import { BrandWavesBackground } from './BrandWavesBackground';
import { AdminBypassModal } from './AdminBypassModal';
import { Lock } from 'lucide-react';

interface ComingSoonPageProps {
  onBypassSuccess: (token: string) => void;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ onBypassSuccess }) => {
  const [isBypassModalOpen, setIsBypassModalOpen] = useState(false);

  // Set document title and meta per specifications
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'La3ib | لاعب — Coming Soon';
    }
  }, []);

  return (
    <main
      className="relative w-full h-screen min-h-[100dvh] bg-white overflow-hidden flex flex-col justify-between selection:bg-[#3A60AA] selection:text-white"
      dir="ltr"
    >
      {/* 1. Soft, flowing, layered blue waves along top & bottom edges (Reference Image 2) */}
      <BrandWavesBackground />

      {/* 2. Official Sports Stickers Scene: Page-wide natural distribution with independent hover & float */}
      <OfficialStickersScene />

      {/* 3. Branding Group:
          - Desktop (lg+): Center positioned at 27% of viewport width, 50% viewport height
          - Mobile / Tablet (<lg): Center positioned at 50% viewport width, 50% viewport height
          - Consistent 28px gap between logo and headline
          - Stationary base, smooth 105% hover scale transition
          - Completely unclipped logo container with ample breathing room
      */}
      <div
        className="branding-group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-[27%] lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 z-20 flex flex-col items-center justify-center gap-7 sm:gap-7 select-none pointer-events-auto w-[90%] max-w-[280px] sm:max-w-[320px] md:max-w-[350px] lg:max-w-[380px] xl:max-w-[410px] overflow-visible"
        data-testid="branding-group"
      >
        {/* Original Bilingual La3ib Logo: Fixed unclipped container preserving top dot of 'i' and dot of 'ب' */}
        <div
          className="branding-hover-target w-full flex justify-center overflow-visible p-1"
          data-testid="branding-logo-wrapper"
        >
          <picture className="w-full flex justify-center overflow-visible">
            <source
              srcSet="/assets/stickers/la3ib_logo.webp"
              type="image/webp"
            />
            <img
              src="/assets/stickers/la3ib_logo.png"
              alt="La3ib | لاعب"
              width={608}
              height={400}
              className="w-full max-w-[210px] sm:max-w-[250px] md:max-w-[290px] lg:max-w-[350px] xl:max-w-[385px] h-auto object-contain drop-shadow-sm pointer-events-auto select-none"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>

        {/* Official Extracted COMING SOON! Graphic */}
        <div
          className="branding-hover-target w-full flex justify-center overflow-visible p-1"
          data-testid="branding-coming-soon-wrapper"
        >
          <picture className="w-full flex justify-center overflow-visible">
            <source
              srcSet="/assets/stickers/coming_soon.webp"
              type="image/webp"
            />
            <img
              src="/assets/stickers/coming_soon.png"
              alt="Coming Soon!"
              width={674}
              height={322}
              className="w-full max-w-[210px] sm:max-w-[250px] md:max-w-[290px] lg:max-w-[350px] xl:max-w-[385px] h-auto object-contain drop-shadow-sm pointer-events-auto select-none"
              loading="eager"
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>
      </div>

      {/* 4. Bottom Strip: Discreet Admin Access Link */}
      <footer className="relative z-30 w-full py-4 px-6 sm:px-10 mt-auto flex items-center justify-center sm:justify-end">
        <button
          type="button"
          onClick={() => setIsBypassModalOpen(true)}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 backdrop-blur-xs transition-all cursor-pointer opacity-75 hover:opacity-100"
          title="Administrator Access"
          aria-label="Administrator Access"
        >
          <Lock className="w-3 h-3 text-slate-400 group-hover:text-slate-600 transition-colors" />
          <span>Admin Access | دخول الإدارة</span>
        </button>
      </footer>

      {/* 5. Secure Admin Bypass Modal */}
      <AdminBypassModal
        isOpen={isBypassModalOpen}
        onClose={() => setIsBypassModalOpen(false)}
        onSuccess={onBypassSuccess}
      />

      {/* 6. Hover Transition Styles for Branding:
          - 105% smooth enlargement on hover
          - 300ms ease-out transition
          - transform-origin: center
          - No layout shift
          - Enabled only on hover-capable devices
          - Reduced motion compliant
      */}
      <style>{`
        .branding-hover-target {
          transform: scale(1);
          transform-origin: center center;
          transition: transform 300ms ease-out;
          will-change: transform;
          cursor: default;
        }

        @media (hover: hover) {
          .branding-hover-target:hover {
            transform: scale(1.05);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .branding-hover-target {
            transition: none !important;
            transform: none !important;
          }
          .branding-hover-target:hover {
            transform: none !important;
          }
        }
      `}</style>
    </main>
  );
};
