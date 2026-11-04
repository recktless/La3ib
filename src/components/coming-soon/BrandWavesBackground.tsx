import React from 'react';

/**
 * Brand Waves Background for La3ib Coming Soon Page
 * 
 * Features:
 * - Subtle, continuous ocean-like movement on layered blue background waves
 * - Independent organic motion for each wave layer:
 *   - Horizontal drift: 3–6px
 *   - Vertical undulation: 2–4px
 *   - Durations: 13.4s to 19.2s (calm ocean cadence)
 *   - Offset phase timing to prevent synchronized motion
 * - Anchored cleanly to viewport top/bottom edges with expanded path borders (-30px to 1470px)
 *   so no empty gaps are ever exposed during motion
 * - Preserves exact La3ib brand colors (#3A60AA, #B9C9E0, #D9E7F8, white highlights)
 * - Central branding area remains predominantly pure white
 * - Full `prefers-reduced-motion: reduce` compliance (returns to stationary waves)
 */
export const BrandWavesBackground: React.FC = () => {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* 1. Base Ambient Glows near edges with gentle 20s breathing */}
      <div
        className="absolute top-0 right-0 w-[45vw] h-[35vh] opacity-60 pointer-events-none ocean-ambient-glow-1"
        style={{
          background: 'radial-gradient(ellipse at 100% 0%, rgba(185, 201, 224, 0.45) 0%, rgba(220, 232, 248, 0.2) 50%, rgba(255, 255, 255, 0) 75%)'
        }}
      />
      <div
        className="absolute bottom-0 right-0 w-[55vw] h-[40vh] opacity-70 pointer-events-none ocean-ambient-glow-2"
        style={{
          background: 'radial-gradient(ellipse at 90% 100%, rgba(185, 201, 224, 0.4) 0%, rgba(220, 232, 248, 0.2) 55%, rgba(255, 255, 255, 0) 75%)'
        }}
      />
      <div
        className="absolute top-0 left-0 w-[40vw] h-[30vh] opacity-50 pointer-events-none ocean-ambient-glow-3"
        style={{
          background: 'radial-gradient(ellipse at 0% 0%, rgba(220, 232, 248, 0.4) 0%, rgba(255, 255, 255, 0) 70%)'
        }}
      />

      {/* 2. Top Flowing Blue Waves Ribbon SVG */}
      <svg
        className="absolute top-0 left-0 w-full h-[22vh] min-h-[120px] max-h-[220px] object-cover pointer-events-none"
        viewBox="0 0 1440 220"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Pale Blue Gradient */}
          <linearGradient id="topPaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D9E7F8" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#E9F2FD" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#C9DCF4" stopOpacity="0.7" />
          </linearGradient>

          {/* Light Blue Gradient */}
          <linearGradient id="topLightGradient" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#B9C9E0" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#C9DBF2" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#9FB7DB" stopOpacity="0.6" />
          </linearGradient>

          {/* Primary Brand Blue Gradient */}
          <linearGradient id="topPrimaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3A60AA" stopOpacity="0.32" />
            <stop offset="45%" stopColor="#3A60AA" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3A60AA" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        {/* Top Layer 1: Broadest Pale Blue Backdrop Wave (18.5s slow swell) */}
        <g className="ocean-wave-top-1">
          <path
            d="M-30 -20V110C180 155 380 90 620 125C860 160 1080 80 1260 105C1360 118 1410 135 1470 145V-20H-30Z"
            fill="url(#topPaleGradient)"
          />
        </g>

        {/* Top Layer 2: Medium Light Blue Flowing Ribbon + Highlight (14.2s drift) */}
        <g className="ocean-wave-top-2">
          <path
            d="M-30 -20V75C140 115 320 60 520 85C740 112 960 45 1180 70C1320 86 1390 100 1470 108V-20H-30Z"
            fill="url(#topLightGradient)"
          />
          <path
            d="M-30 76C140 116 320 61 520 86C740 113 960 46 1180 71C1320 87 1390 101 1470 109"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Top Layer 3: Dynamic Primary Blue Crest Ribbon (16.8s undulation) */}
        <g className="ocean-wave-top-3">
          <path
            d="M-30 -20V42C120 78 280 32 440 50C640 72 820 20 1040 38C1220 54 1350 35 1470 58V-20H-30Z"
            fill="url(#topPrimaryGradient)"
          />
        </g>
      </svg>

      {/* 3. Bottom Billowing Waves and Dunes SVG */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[24vh] min-h-[140px] max-h-[240px] object-cover pointer-events-none"
        viewBox="0 0 1440 240"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Bottom Pale Blue Gradient */}
          <linearGradient id="bottomPaleGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C9DBF2" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#E2EDFC" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#BED2EE" stopOpacity="0.8" />
          </linearGradient>

          {/* Bottom Light Blue Gradient */}
          <linearGradient id="bottomLightGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A8C1E4" stopOpacity="0.6" />
            <stop offset="55%" stopColor="#B9C9E0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#96B4DC" stopOpacity="0.7" />
          </linearGradient>

          {/* Bottom Primary Blue Wave */}
          <linearGradient id="bottomPrimaryGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3A60AA" stopOpacity="0.32" />
            <stop offset="50%" stopColor="#3A60AA" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#3A60AA" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Bottom Layer 1: Deepest Rising Wave from Corners (19.2s slow swell) */}
        <g className="ocean-wave-bottom-1">
          <path
            d="M-30 260V120C180 75 360 145 580 115C820 80 1040 155 1240 105C1340 80 1400 65 1470 55V260H-30Z"
            fill="url(#bottomPaleGradient)"
          />
        </g>

        {/* Bottom Layer 2: Intermediate Billowy Wave Ribbon + Highlight (15.6s drift) */}
        <g className="ocean-wave-bottom-2">
          <path
            d="M-30 260V155C160 115 340 175 540 150C760 120 980 185 1180 145C1310 120 1385 105 1470 95V260H-30Z"
            fill="url(#bottomLightGradient)"
          />
          <path
            d="M-30 156C160 116 340 176 540 151C760 121 980 186 1180 146C1310 121 1385 106 1470 96"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </g>

        {/* Bottom Layer 3: Foreground Crest Wave (13.4s undulation) */}
        <g className="ocean-wave-bottom-3">
          <path
            d="M-30 260V195C140 165 300 205 480 185C680 162 880 215 1080 185C1220 165 1350 150 1470 138V260H-30Z"
            fill="url(#bottomPrimaryGradient)"
          />
        </g>
      </svg>

      {/* Embedded CSS Keyframes for Calm Ocean Wave Movement:
          - Horizontal drift: 3-6px
          - Vertical undulation: 2-4px
          - Durations: 13.4s - 19.2s
          - Anchored to edges (transform-origin: top / bottom)
          - Seamless ease-in-out loops
          - Disabled under prefers-reduced-motion
      */}
      <style>{`
        /* Top Waves Keyframes (Anchored to top edge) */
        @keyframes oceanWaveTop1 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(4px, 3px, 0) scaleY(1.02);
          }
        }

        @keyframes oceanWaveTop2 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(-5px, 2.5px, 0) scaleY(0.985);
          }
        }

        @keyframes oceanWaveTop3 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(3.5px, 3.5px, 0) scaleY(1.025);
          }
        }

        /* Bottom Waves Keyframes (Anchored to bottom edge) */
        @keyframes oceanWaveBottom1 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(-4px, -3px, 0) scaleY(1.02);
          }
        }

        @keyframes oceanWaveBottom2 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(5px, -2.5px, 0) scaleY(0.985);
          }
        }

        @keyframes oceanWaveBottom3 {
          0%, 100% {
            transform: translate3d(0, 0, 0) scaleY(1);
          }
          50% {
            transform: translate3d(-3.5px, -3.5px, 0) scaleY(1.025);
          }
        }

        /* Ambient Glow Gentle Breathing */
        @keyframes oceanAmbientGlow {
          0%, 100% {
            opacity: 0.6;
          }
          50% {
            opacity: 0.72;
          }
        }

        .ocean-wave-top-1 {
          transform-origin: top center;
          animation: oceanWaveTop1 18.5s ease-in-out infinite;
          will-change: transform;
        }

        .ocean-wave-top-2 {
          transform-origin: top center;
          animation: oceanWaveTop2 14.2s ease-in-out infinite;
          animation-delay: -4.5s;
          will-change: transform;
        }

        .ocean-wave-top-3 {
          transform-origin: top center;
          animation: oceanWaveTop3 16.8s ease-in-out infinite;
          animation-delay: -8.2s;
          will-change: transform;
        }

        .ocean-wave-bottom-1 {
          transform-origin: bottom center;
          animation: oceanWaveBottom1 19.2s ease-in-out infinite;
          animation-delay: -3.1s;
          will-change: transform;
        }

        .ocean-wave-bottom-2 {
          transform-origin: bottom center;
          animation: oceanWaveBottom2 15.6s ease-in-out infinite;
          animation-delay: -7.4s;
          will-change: transform;
        }

        .ocean-wave-bottom-3 {
          transform-origin: bottom center;
          animation: oceanWaveBottom3 13.4s ease-in-out infinite;
          animation-delay: -1.8s;
          will-change: transform;
        }

        .ocean-ambient-glow-1 {
          animation: oceanAmbientGlow 20s ease-in-out infinite;
        }
        .ocean-ambient-glow-2 {
          animation: oceanAmbientGlow 17s ease-in-out infinite;
          animation-delay: -6s;
        }
        .ocean-ambient-glow-3 {
          animation: oceanAmbientGlow 22s ease-in-out infinite;
          animation-delay: -11s;
        }

        @media (prefers-reduced-motion: reduce) {
          .ocean-wave-top-1,
          .ocean-wave-top-2,
          .ocean-wave-top-3,
          .ocean-wave-bottom-1,
          .ocean-wave-bottom-2,
          .ocean-wave-bottom-3,
          .ocean-ambient-glow-1,
          .ocean-ambient-glow-2,
          .ocean-ambient-glow-3 {
            animation: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
