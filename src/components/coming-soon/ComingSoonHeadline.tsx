import React from 'react';

/**
 * Custom bold bubbly "COMING SOON!" headline matching the reference image typography:
 * 'Coming_Soon_Sports_Celebration_e8ec21e4.png'
 * 
 * Features:
 * - Stacked "COMING" and "SOON!" in bubbly athletic lettering
 * - Rich royal blue fill with crisp clean white stroke and 3D navy depth
 * - Playful golden celebration rays flanking "SOON!"
 * - Completely stationary (zero animation per strict guidelines)
 */
export const ComingSoonHeadline: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`relative inline-flex flex-col items-center select-none pointer-events-none ${className}`}
      aria-label="Coming Soon!"
      role="heading"
      aria-level={1}
    >
      <svg
        viewBox="0 0 540 280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] lg:max-w-[510px] h-auto overflow-visible"
      >
        <defs>
          {/* Depth shadow filter */}
          <filter id="csDepth" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="8" stdDeviation="0" floodColor="#0E2863" floodOpacity="1" />
            <feDropShadow dx="0" dy="16" stdDeviation="12" floodColor="#153B82" floodOpacity="0.25" />
          </filter>

          {/* Text fill gradient */}
          <linearGradient id="csFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="25%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#15429B" />
          </linearGradient>

          {/* Yellow celebration rays gradient */}
          <linearGradient id="rayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD233" />
            <stop offset="100%" stopColor="#FFAA00" />
          </linearGradient>
        </defs>

        {/* Group with slight playful tilt (-2.5deg) matching reference artwork */}
        <g transform="rotate(-2.5 270 140)" filter="url(#csDepth)">
          {/* Yellow celebration rays - Left side */}
          <g>
            <path
              d="M65 140L40 130"
              stroke="url(#rayGrad)"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M58 170L32 176"
              stroke="url(#rayGrad)"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M68 200L45 214"
              stroke="url(#rayGrad)"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>

          {/* Yellow celebration rays - Right side */}
          <g>
            <path
              d="M475 140L500 130"
              stroke="url(#rayGrad)"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M482 170L508 176"
              stroke="url(#rayGrad)"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <path
              d="M472 200L495 214"
              stroke="url(#rayGrad)"
              strokeWidth="9"
              strokeLinecap="round"
            />
          </g>

          {/* White outline backdrop layer */}
          <text
            x="270"
            y="115"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Cairo, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="92"
            letterSpacing="2"
            stroke="#FFFFFF"
            strokeWidth="20"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="#FFFFFF"
          >
            COMING
          </text>
          <text
            x="270"
            y="215"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Cairo, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="106"
            letterSpacing="3"
            stroke="#FFFFFF"
            strokeWidth="22"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="#FFFFFF"
          >
            SOON!
          </text>

          {/* Foreground colored text layer */}
          <text
            x="270"
            y="115"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Cairo, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="92"
            letterSpacing="2"
            fill="url(#csFill)"
          >
            COMING
          </text>
          <text
            x="270"
            y="215"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, Cairo, 'Arial Black', sans-serif"
            fontWeight="900"
            fontSize="106"
            letterSpacing="3"
            fill="url(#csFill)"
          >
            SOON!
          </text>
        </g>
      </svg>
    </div>
  );
};
