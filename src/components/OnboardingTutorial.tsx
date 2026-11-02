import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  Compass, 
  Users, 
  MapPin, 
  PlusCircle, 
  Trophy, 
  User 
} from 'lucide-react';

interface StepConfig {
  id: string;
  selector: string;
  icon: React.ComponentType<{ className?: string }>;
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  requiresDrawerOnMobile?: boolean;
}

const TUTORIAL_STEPS: StepConfig[] = [
  {
    id: 'welcome',
    selector: '[data-tutorial="welcome"]',
    icon: Compass,
    titleEn: 'Welcome to La3ib!',
    titleAr: 'مرحباً بك في لعيب!',
    descEn: 'Find games, meet players, and organize matches across Kuwait.',
    descAr: 'اعثر على مباريات، تعرف على لاعبين، ونظم ألعابك في مختلف مناطق الكويت.'
  },
  {
    id: 'community',
    selector: '[data-tutorial="nav-community"]',
    icon: Users,
    titleEn: 'Find your next game',
    titleAr: 'اعثر على مباراتك القادمة',
    descEn: 'Browse available games and discover other players.',
    descAr: 'تصفح الألعاب المتاحة واكتشف لاعبين جدد في مجتمعك الرياضي.'
  },
  {
    id: 'map',
    selector: '[data-tutorial="nav-map"]',
    icon: MapPin,
    titleEn: 'Explore nearby games',
    titleAr: 'استكشف المباريات القريبة',
    descEn: 'See available games across Kuwait on the map.',
    descAr: 'شاهد المباريات المتاحة في مختلف مناطق الكويت مباشرة على الخريطة.'
  },
  {
    id: 'create',
    selector: '[data-tutorial="nav-create"]',
    icon: PlusCircle,
    titleEn: 'Organize a game',
    titleAr: 'نظّم مباراة',
    descEn: 'Create a match, choose a location, and invite players.',
    descAr: 'أنشئ مباراة، اختر الملعب والوقت، وادعُ اللاعبين للانضمام.'
  },
  {
    id: 'my-games',
    selector: '[data-tutorial="nav-my-games"]',
    icon: Trophy,
    titleEn: 'Keep track of your games',
    titleAr: 'تابع مبارياتك',
    descEn: 'Manage games you\'re hosting or joining.',
    descAr: 'أدر المباريات التي تنظمها أو انضممت إليها بسهولة.',
    requiresDrawerOnMobile: true
  },
  {
    id: 'profile',
    selector: '[data-tutorial="nav-profile"]',
    icon: User,
    titleEn: 'Make it yours',
    titleAr: 'خصّص ملفك',
    descEn: 'Add your favorite sports, skills, and profile details.',
    descAr: 'أضف رياضاتك المفضلة، مستواك، وبياناتك الرياضية.'
  }
];

export const OnboardingTutorial: React.FC = () => {
  const { 
    isTutorialOpen, 
    tutorialStep, 
    setTutorialStep, 
    completeTutorial, 
    skipTutorial, 
    language, 
    t, 
    setIsSidebarOpen,
    isTutorialPreview
  } = useApp();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardPosition, setCardPosition] = useState<{ top: number; left: number }>({ top: 100, left: 20 });
  const cardRef = useRef<HTMLDivElement>(null);
  const openedDrawerForStepRef = useRef(false);

  const isRtl = language === 'ar';
  const currentStepConfig = TUTORIAL_STEPS[tutorialStep] || TUTORIAL_STEPS[0];
  const isLastStep = tutorialStep === TUTORIAL_STEPS.length - 1;

  // Helper to locate visible target element on desktop vs mobile
  const findVisibleTarget = useCallback((selector: string): HTMLElement | null => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (elements.length === 0) return null;

    // Pick first element that is currently visible (non-zero width & height)
    const visible = elements.find(el => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });

    return visible || elements[0] || null;
  }, []);

  // Update target rect and position floating card
  const updateSpotlightPosition = useCallback(() => {
    if (!isTutorialOpen) return;

    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step) return;

    const element = findVisibleTarget(step.selector);

    if (element) {
      // Scroll into view if outside viewport
      const rect = element.getBoundingClientRect();
      const isOutOfView = (
        rect.top < 0 || 
        rect.bottom > window.innerHeight || 
        rect.left < 0 || 
        rect.right > window.innerWidth
      );

      if (isOutOfView) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }

      // Re-read rect after slight frame
      const currentRect = element.getBoundingClientRect();
      setTargetRect(currentRect);

      // Compute card position
      const cardEl = cardRef.current;
      const cardWidth = cardEl ? cardEl.offsetWidth : Math.min(360, window.innerWidth - 32);
      const cardHeight = cardEl ? cardEl.offsetHeight : 210;
      const margin = 16;

      let top = 100;
      let left = Math.max(margin, (window.innerWidth - cardWidth) / 2);

      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // Mobile layout: place above target if target is in bottom nav, or below target if near top
        if (currentRect.top > window.innerHeight - 150) {
          // Near bottom navigation
          top = Math.max(margin, currentRect.top - cardHeight - margin);
        } else if (currentRect.bottom < 200) {
          // Near top header
          top = Math.min(window.innerHeight - cardHeight - margin, currentRect.bottom + margin);
        } else {
          // In the middle
          top = Math.min(window.innerHeight - cardHeight - margin, currentRect.bottom + margin);
        }
        left = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, (window.innerWidth - cardWidth) / 2));
      } else {
        // Desktop layout
        const isSidebarTarget = (
          (!isRtl && currentRect.right < 340) || 
          (isRtl && currentRect.left > window.innerWidth - 340)
        );

        if (isSidebarTarget) {
          if (!isRtl) {
            left = Math.min(window.innerWidth - cardWidth - margin, currentRect.right + 20);
          } else {
            left = Math.max(margin, currentRect.left - cardWidth - 20);
          }
          top = Math.max(margin, Math.min(window.innerHeight - cardHeight - margin, currentRect.top - 10));
        } else {
          // Main content or modal target
          if (currentRect.bottom + cardHeight + margin <= window.innerHeight) {
            top = currentRect.bottom + margin;
          } else {
            top = Math.max(margin, currentRect.top - cardHeight - margin);
          }
          left = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, currentRect.left + (currentRect.width - cardWidth) / 2));
        }
      }

      // Hard clamp within viewport boundaries
      top = Math.max(margin, Math.min(window.innerHeight - cardHeight - margin, top));
      left = Math.max(margin, Math.min(window.innerWidth - cardWidth - margin, left));

      setCardPosition({ top, left });
    } else {
      // Fallback: center on screen if element not found
      setTargetRect(null);
      const cardEl = cardRef.current;
      const cardWidth = cardEl ? cardEl.offsetWidth : Math.min(360, window.innerWidth - 32);
      const cardHeight = cardEl ? cardEl.offsetHeight : 210;
      setCardPosition({
        top: Math.max(16, (window.innerHeight - cardHeight) / 2),
        left: Math.max(16, (window.innerWidth - cardWidth) / 2)
      });
    }
  }, [findVisibleTarget, isRtl, isTutorialOpen, tutorialStep]);

  // Handle drawer opening for steps requiring drawer on mobile (e.g. My Games)
  useEffect(() => {
    if (!isTutorialOpen) return;

    const step = TUTORIAL_STEPS[tutorialStep];
    const isMobile = window.innerWidth < 1024;

    if (step?.requiresDrawerOnMobile && isMobile) {
      setIsSidebarOpen(true);
      openedDrawerForStepRef.current = true;
    } else if (openedDrawerForStepRef.current) {
      setIsSidebarOpen(false);
      openedDrawerForStepRef.current = false;
    }

    // Schedule position calculation after DOM layout / drawer animation
    const timer = setTimeout(() => {
      updateSpotlightPosition();
    }, 120);

    return () => clearTimeout(timer);
  }, [isTutorialOpen, tutorialStep, setIsSidebarOpen, updateSpotlightPosition]);

  // Listen to window resize and scroll to keep spotlight aligned
  useEffect(() => {
    if (!isTutorialOpen) return;

    const handleResizeOrScroll = () => {
      updateSpotlightPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll, { passive: true });
    window.addEventListener('scroll', handleResizeOrScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isTutorialOpen, updateSpotlightPosition]);

  // Keyboard navigation & accessibility: Escape to skip, Enter / Arrow keys to navigate
  useEffect(() => {
    if (!isTutorialOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (openedDrawerForStepRef.current) {
          setIsSidebarOpen(false);
          openedDrawerForStepRef.current = false;
        }
        skipTutorial();
      } else if (e.key === 'ArrowRight') {
        if (!isRtl) {
          handleNext();
        } else {
          handleBack();
        }
      } else if (e.key === 'ArrowLeft') {
        if (!isRtl) {
          handleBack();
        } else {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTutorialOpen, isRtl, tutorialStep]);

  // Auto-focus card on step change for accessibility focus ring
  useEffect(() => {
    if (isTutorialOpen && cardRef.current) {
      cardRef.current.focus();
    }
  }, [isTutorialOpen, tutorialStep]);

  if (!isTutorialOpen) return null;

  const handleNext = () => {
    if (isLastStep) {
      if (openedDrawerForStepRef.current) {
        setIsSidebarOpen(false);
        openedDrawerForStepRef.current = false;
      }
      completeTutorial();
    } else {
      setTutorialStep(prev => Math.min(TUTORIAL_STEPS.length - 1, prev + 1));
    }
  };

  const handleBack = () => {
    if (tutorialStep > 0) {
      setTutorialStep(prev => Math.max(0, prev - 1));
    }
  };

  const handleSkip = () => {
    if (openedDrawerForStepRef.current) {
      setIsSidebarOpen(false);
      openedDrawerForStepRef.current = false;
    }
    skipTutorial();
  };

  const StepIcon = currentStepConfig.icon;
  const padding = 8;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-step-title"
      aria-describedby="tutorial-step-desc"
      className="fixed inset-0 z-[100] pointer-events-auto select-none"
    >
      {/* 1. Hardware-Accelerated SVG Spotlight Mask Cutout */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 101 }}>
        <defs>
          <mask id="la3ib-spotlight-mask">
            {/* White = shaded background */}
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {/* Black cutout = clear transparent spotlight hole */}
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx={16}
                ry={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(6, 19, 91, 0.70)"
          mask="url(#la3ib-spotlight-mask)"
        />
      </svg>

      {/* 2. Full transparent click-blocker to prevent accidental clicks on underlying UI */}
      <div 
        className="fixed inset-0 cursor-default" 
        style={{ zIndex: 102 }} 
        onClick={(e) => {
          e.stopPropagation();
        }} 
      />

      {/* 3. Glowing / pulsing focus ring around the highlighted target */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-200 rounded-2xl ring-2 sm:ring-4 ring-[#3A60AA] dark:ring-[#05BCD1] shadow-[0_0_24px_rgba(58,96,170,0.6)] animate-pulse"
          style={{
            zIndex: 103,
            left: `${targetRect.left - padding}px`,
            top: `${targetRect.top - padding}px`,
            width: `${targetRect.width + padding * 2}px`,
            height: `${targetRect.height + padding * 2}px`,
          }}
        />
      )}

      {/* 4. Floating Rounded Information Card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        className="fixed z-[104] w-[calc(100vw-32px)] sm:w-[360px] max-w-[360px] p-5 rounded-3xl bg-white dark:bg-[#06135B] border border-slate-200/90 dark:border-[#1F3590] shadow-2xl transition-all duration-200 animate-popover-in focus:outline-none"
        style={{
          top: `${cardPosition.top}px`,
          left: `${cardPosition.left}px`,
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Card Header: Step Counter & Close/Skip Button */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-[#1F3590]/50 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-[#142578] text-[#3A60AA] dark:text-[#B9C9E0] flex items-center justify-center shrink-0">
              <StepIcon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-[#3A60AA] dark:text-[#B9C9E0]">
              {language === 'ar' 
                ? `${tutorialStep + 1} من ${TUTORIAL_STEPS.length}` 
                : `${tutorialStep + 1} of ${TUTORIAL_STEPS.length}`}
            </span>
            {isTutorialPreview && (
              <span className="text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {language === 'ar' ? 'معاينة' : 'Demo'}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0D1C68] transition-colors cursor-pointer"
            title={t('Skip tutorial', 'تخطي الجولة')}
            aria-label={t('Skip tutorial', 'تخطي الجولة')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Title & Friendly Description */}
        <div className="space-y-1.5 mb-4">
          <h3 
            id="tutorial-step-title" 
            className="text-base font-bold text-[#06135B] dark:text-white tracking-tight"
          >
            {language === 'ar' ? currentStepConfig.titleAr : currentStepConfig.titleEn}
          </h3>
          <p 
            id="tutorial-step-desc" 
            className="text-xs text-slate-600 dark:text-[#B9C9E0] leading-relaxed"
          >
            {language === 'ar' ? currentStepConfig.descAr : currentStepConfig.descEn}
          </p>
        </div>

        {/* Step Progress Dots Indicator */}
        <div className="flex items-center gap-1.5 mb-4" aria-hidden="true">
          {TUTORIAL_STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                idx === tutorialStep
                  ? 'w-6 bg-[#3A60AA] dark:bg-[#05BCD1]'
                  : idx < tutorialStep
                  ? 'w-2 bg-[#3A60AA]/40 dark:bg-[#05BCD1]/40'
                  : 'w-1.5 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Action Controls: Back, Skip, Next / Get Started */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-[#1F3590]/50">
          <div>
            {tutorialStep > 0 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0D1C68] transition-colors cursor-pointer flex items-center gap-1"
              >
                {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                <span>{t('Back', 'السابق')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSkip}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0D1C68] transition-colors cursor-pointer"
              >
                <span>{t('Skip', 'تخطي')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {tutorialStep > 0 && !isLastStep && (
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer px-1.5"
              >
                {t('Skip', 'تخطي')}
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-2 rounded-xl bg-[#3A60AA] hover:bg-[#2E4D8A] text-white text-xs font-bold transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md flex items-center gap-1.5 interactive-tap"
            >
              {isLastStep ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('Get Started', 'ابدأ الآن')}</span>
                </>
              ) : (
                <>
                  <span>{t('Next', 'التالي')}</span>
                  {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
