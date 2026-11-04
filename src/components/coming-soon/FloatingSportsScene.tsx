import React from 'react';
import {
  Basketball,
  BadmintonShuttlecock,
  Volleyball,
  SoccerBall,
  TealPadelRacket,
  YellowPickleball,
  BluePadelRacket,
  LimeTennisBall,
  CoralTennisRacket,
  SparkleStar
} from './SportsEquipment';

/**
 * Background and Floating Sports Equipment Scene
 * 
 * Features:
 * - Soft layered blue and white cloud waves matching reference artwork
 * - Handcrafted sports equipment floating gently and independently
 * - GPU-friendly translate3d/rotate animations (5-12px vertical, 2-5px horizontal, 1-3deg rotate)
 * - Different animation durations (5.4s - 8.8s) and offset delays
 * - Completely avoids the main content area (left 25-30% zone)
 * - Respects `prefers-reduced-motion`
 */
export const FloatingSportsScene: React.FC = () => {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Base Gradient & Layered Wave Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#EBF4FF] via-[#F4F9FF] to-[#DDEEFF]" />

      {/* Top Flowing Cloud Wave SVG */}
      <svg
        className="absolute top-0 left-0 w-full h-[180px] sm:h-[240px] md:h-[280px] object-cover opacity-90"
        viewBox="0 0 1440 280"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0H1440V120C1320 180 1180 130 1020 160C860 190 760 140 600 170C440 200 320 150 180 180C80 200 0 160 0 160V0Z"
          fill="#D6E8FC"
        />
        <path
          d="M0 0H1440V90C1280 140 1140 100 980 130C820 160 700 110 540 140C380 170 240 120 120 140C50 150 0 120 0 120V0Z"
          fill="#C4DFFB"
          opacity="0.85"
        />
        <path
          d="M0 0H1440V50C1340 90 1200 70 1060 85C920 100 820 65 680 85C540 105 400 75 260 90C140 105 0 70 0 70V0Z"
          fill="#B1D5F8"
          opacity="0.6"
        />
      </svg>

      {/* Bottom Flowing Cloud Wave SVG */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[180px] sm:h-[240px] md:h-[290px] object-cover opacity-95"
        viewBox="0 0 1440 290"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M0 290H1440V170C1300 110 1160 160 1000 130C840 100 720 150 560 120C400 90 280 140 140 110C60 90 0 130 0 130V290Z"
          fill="#D6E8FC"
        />
        <path
          d="M0 290H1440V200C1260 150 1120 190 960 160C800 130 660 180 500 150C340 120 220 170 100 150C40 140 0 170 0 170V290Z"
          fill="#C4DFFB"
          opacity="0.85"
        />
        <path
          d="M0 290H1440V240C1320 200 1180 220 1040 205C900 190 780 225 640 205C500 185 360 215 220 200C100 185 0 220 0 220V290Z"
          fill="#B1D5F8"
          opacity="0.6"
        />
      </svg>

      {/* 2. Floating Sports Equipment - Left Perimeter (Away from main content) */}

      {/* Top-Left: Basketball (peeking from top edge) */}
      <div
        className="absolute -top-6 -left-6 sm:top-2 sm:left-3 md:top-4 md:left-6 floating-item-1"
        style={{
          animation: 'floatGentle1 6.8s ease-in-out infinite',
          animationDelay: '-1.4s'
        }}
      >
        <Basketball size={120} className="w-[85px] sm:w-[110px] md:w-[130px] lg:w-[145px]" />
      </div>

      {/* Top-Left: Badminton Shuttlecock */}
      <div
        className="absolute top-16 left-[20%] sm:top-20 sm:left-[17%] md:top-14 md:left-[15%] lg:top-16 lg:left-[13%] floating-item-2"
        style={{
          animation: 'floatGentle2 7.6s ease-in-out infinite',
          animationDelay: '-3.2s'
        }}
      >
        <BadmintonShuttlecock size={95} className="w-[65px] sm:w-[80px] md:w-[95px] -rotate-12" />
      </div>

      {/* Mid-Left: Volleyball (tucked against far left edge) */}
      <div
        className="hidden sm:block absolute top-[44%] -left-6 md:left-2 lg:left-4 floating-item-3"
        style={{
          animation: 'floatGentle3 6.2s ease-in-out infinite',
          animationDelay: '-0.8s'
        }}
      >
        <Volleyball size={105} className="w-[75px] md:w-[95px] lg:w-[110px]" />
      </div>

      {/* Bottom-Left: Soccer Ball */}
      <div
        className="absolute bottom-6 left-3 sm:bottom-8 sm:left-6 md:bottom-10 md:left-8 floating-item-4"
        style={{
          animation: 'floatGentle4 8.2s ease-in-out infinite',
          animationDelay: '-4.5s'
        }}
      >
        <SoccerBall size={115} className="w-[80px] sm:w-[100px] md:w-[115px] lg:w-[130px]" />
      </div>

      {/* Bottom-Left: Teal Tennis Racket & Yellow Pickleball */}
      <div
        className="hidden md:block absolute bottom-4 left-[14%] lg:left-[16%] floating-item-5"
        style={{
          animation: 'floatGentle5 7.1s ease-in-out infinite',
          animationDelay: '-2.1s'
        }}
      >
        <div className="relative">
          <TealPadelRacket size={135} className="rotate-25 w-[110px] lg:w-[135px]" />
          <div className="absolute -top-3 -right-2">
            <YellowPickleball size={46} className="w-[38px] lg:w-[46px]" />
          </div>
        </div>
      </div>

      {/* 3. Floating Sports Equipment - Right Half & Outer Edges (Open Canvas) */}

      {/* Top-Right: Blue Padel Racket & Lime Tennis Ball */}
      <div
        className="absolute top-4 right-4 sm:top-6 sm:right-8 md:top-8 md:right-12 lg:right-20 floating-item-6"
        style={{
          animation: 'floatGentle6 8.5s ease-in-out infinite',
          animationDelay: '-5.2s'
        }}
      >
        <div className="relative">
          <BluePadelRacket size={150} className="-rotate-15 w-[100px] sm:w-[130px] md:w-[150px] lg:w-[165px]" />
          <div className="absolute -top-2 right-2">
            <LimeTennisBall size={52} className="w-[38px] sm:w-[46px] md:w-[52px]" />
          </div>
        </div>
      </div>

      {/* Mid-Top Right: Soccer Ball */}
      <div
        className="hidden sm:block absolute top-[28%] right-[8%] sm:right-[14%] md:right-[18%] lg:right-[22%] floating-item-7"
        style={{
          animation: 'floatGentle7 6.5s ease-in-out infinite',
          animationDelay: '-1.8s'
        }}
      >
        <SoccerBall size={105} className="w-[70px] sm:w-[85px] md:w-[100px]" />
      </div>

      {/* Mid-Right: Volleyball */}
      <div
        className="absolute top-[48%] right-2 sm:right-6 md:right-10 lg:right-14 floating-item-8"
        style={{
          animation: 'floatGentle8 7.9s ease-in-out infinite',
          animationDelay: '-3.7s'
        }}
      >
        <Volleyball size={115} className="w-[80px] sm:w-[95px] md:w-[115px] lg:w-[125px]" />
      </div>

      {/* Bottom-Right: Basketball */}
      <div
        className="absolute bottom-4 right-3 sm:bottom-6 sm:right-6 md:bottom-8 md:right-10 lg:right-16 floating-item-1"
        style={{
          animation: 'floatGentle1 7.4s ease-in-out infinite',
          animationDelay: '-2.9s'
        }}
      >
        <Basketball size={125} className="w-[85px] sm:w-[105px] md:w-[125px] lg:w-[140px]" />
      </div>

      {/* Bottom-Right: Coral Tennis Racket */}
      <div
        className="hidden md:block absolute bottom-8 right-[20%] lg:right-[24%] floating-item-2"
        style={{
          animation: 'floatGentle2 8.1s ease-in-out infinite',
          animationDelay: '-4.1s'
        }}
      >
        <CoralTennisRacket size={135} className="rotate-35 w-[110px] lg:w-[135px]" />
      </div>

      {/* 4. Golden and Blue Sparkle Stars Scattered in Negative Space */}
      <div className="absolute top-[18%] left-[7%] sm:left-[10%]">
        <SparkleStar size={26} color="yellow" className="animate-pulse duration-1000" />
      </div>
      <div className="absolute top-[68%] left-[4%] sm:left-[8%]">
        <SparkleStar size={22} color="yellow" />
      </div>
      <div className="absolute top-[16%] right-[32%] lg:right-[38%]">
        <SparkleStar size={24} color="yellow" />
      </div>
      <div className="absolute top-[38%] right-[5%] sm:right-[7%]">
        <SparkleStar size={26} color="yellow" />
      </div>
      <div className="absolute top-[72%] right-[16%] sm:right-[18%]">
        <SparkleStar size={22} color="yellow" />
      </div>
      <div className="absolute bottom-[22%] right-[36%]">
        <SparkleStar size={20} color="blue" />
      </div>
      <div className="absolute top-[28%] left-[2%]">
        <SparkleStar size={18} color="blue" />
      </div>

      {/* CSS Keyframes injected cleanly for GPU acceleration & reduced-motion */}
      <style>{`
        @keyframes floatGentle1 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(3px, -9px, 0) rotate(1.5deg); }
        }
        @keyframes floatGentle2 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-4px, 10px, 0) rotate(-2deg); }
        }
        @keyframes floatGentle3 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(3px, -7px, 0) rotate(1deg); }
        }
        @keyframes floatGentle4 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-3px, 8px, 0) rotate(-1.5deg); }
        }
        @keyframes floatGentle5 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(4px, -11px, 0) rotate(2deg); }
        }
        @keyframes floatGentle6 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-3px, 9px, 0) rotate(-1.5deg); }
        }
        @keyframes floatGentle7 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(3px, -8px, 0) rotate(1.5deg); }
        }
        @keyframes floatGentle8 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-4px, 7px, 0) rotate(-1.5deg); }
        }

        .floating-item-1, .floating-item-2, .floating-item-3, .floating-item-4,
        .floating-item-5, .floating-item-6, .floating-item-7, .floating-item-8 {
          will-change: transform;
          backface-visibility: hidden;
        }

        @media (prefers-reduced-motion: reduce) {
          .floating-item-1, .floating-item-2, .floating-item-3, .floating-item-4,
          .floating-item-5, .floating-item-6, .floating-item-7, .floating-item-8 {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
