import React from 'react';

/**
 * High-fidelity vector sports equipment matching the reference illustration:
 * 'Coming_Soon_Sports_Celebration_e8ec21e4.png'
 * 
 * Styled with bold navy outlines, rich authentic sports colors,
 * and soft highlights for a joyful, premium aesthetic.
 */

interface SportIllustrationProps {
  className?: string;
  size?: number;
}

export const Basketball: React.FC<SportIllustrationProps> = ({ className = '', size = 130 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 140 140"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md ${className}`}
    aria-hidden="true"
  >
    {/* Base ball sphere */}
    <circle cx="70" cy="70" r="62" fill="url(#bballGradient)" stroke="#152B58" strokeWidth="5.5" />
    
    {/* Soft inner lighting highlight */}
    <ellipse cx="52" cy="40" rx="30" ry="16" fill="#FFA566" opacity="0.45" />

    {/* Seam lines */}
    {/* Horizontal seam */}
    <path d="M9 70H131" stroke="#152B58" strokeWidth="5.5" strokeLinecap="round" />
    {/* Vertical seam */}
    <path d="M70 9V131" stroke="#152B58" strokeWidth="5.5" strokeLinecap="round" />
    {/* Left curved seam */}
    <path d="M26 26C48 45 48 95 26 114" stroke="#152B58" strokeWidth="5" strokeLinecap="round" />
    {/* Right curved seam */}
    <path d="M114 26C92 45 92 95 114 114" stroke="#152B58" strokeWidth="5" strokeLinecap="round" />

    <defs>
      <radialGradient id="bballGradient" cx="45%" cy="38%" r="65%">
        <stop offset="0%" stopColor="#FF9B4E" />
        <stop offset="70%" stopColor="#FF7020" />
        <stop offset="100%" stopColor="#E95408" />
      </radialGradient>
    </defs>
  </svg>
);

export const BadmintonShuttlecock: React.FC<SportIllustrationProps> = ({ className = '', size = 100 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md ${className}`}
    aria-hidden="true"
  >
    {/* Flared white feathers */}
    <path
      d="M34 32C34 32 44 14 60 14C76 14 86 32 86 32L78 72H42L34 32Z"
      fill="#FFFFFF"
      stroke="#152B58"
      strokeWidth="5"
      strokeLinejoin="round"
    />
    {/* Feather ribs */}
    <path d="M48 20L48 72" stroke="#D1E4FA" strokeWidth="3" strokeLinecap="round" />
    <path d="M60 14L60 72" stroke="#D1E4FA" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M72 20L72 72" stroke="#D1E4FA" strokeWidth="3" strokeLinecap="round" />
    <path d="M38 48C46 52 74 52 82 48" stroke="#152B58" strokeWidth="4" strokeLinecap="round" />

    {/* Red/coral collar band */}
    <rect x="40" y="72" width="40" height="9" rx="3" fill="#FF5662" stroke="#152B58" strokeWidth="4" />

    {/* Blue rounded cork base */}
    <path
      d="M44 81C44 81 44 104 60 104C76 104 76 81 76 81H44Z"
      fill="#1A4796"
      stroke="#152B58"
      strokeWidth="5"
      strokeLinejoin="round"
    />
    {/* Cork highlight */}
    <ellipse cx="54" cy="90" rx="5" ry="3" fill="#60A5FA" opacity="0.6" />
  </svg>
);

export const Volleyball: React.FC<SportIllustrationProps> = ({ className = '', size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 130 130"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md ${className}`}
    aria-hidden="true"
  >
    <circle cx="65" cy="65" r="58" fill="#FFFFFF" stroke="#152B58" strokeWidth="5.5" />
    
    {/* Tri-color panels: Blue, Yellow, White */}
    {/* Panel Group 1 (Top Left) */}
    <path d="M65 65C50 40 30 20 18 35C8 48 25 70 65 65Z" fill="#2561C7" stroke="#152B58" strokeWidth="4.5" />
    <path d="M65 65C58 35 48 10 32 15C18 20 38 48 65 65Z" fill="#FFD13B" stroke="#152B58" strokeWidth="4.5" />
    
    {/* Panel Group 2 (Right) */}
    <path d="M65 65C85 45 110 35 118 52C124 68 95 80 65 65Z" fill="#2561C7" stroke="#152B58" strokeWidth="4.5" />
    <path d="M65 65C92 60 120 72 116 88C110 104 82 85 65 65Z" fill="#FFD13B" stroke="#152B58" strokeWidth="4.5" />
    
    {/* Panel Group 3 (Bottom Left) */}
    <path d="M65 65C50 85 35 112 48 120C62 126 78 95 65 65Z" fill="#2561C7" stroke="#152B58" strokeWidth="4.5" />
    <path d="M65 65C38 78 12 90 20 106C28 120 52 98 65 65Z" fill="#FFD13B" stroke="#152B58" strokeWidth="4.5" />
    
    {/* Ball outer rim re-stroke for crispness */}
    <circle cx="65" cy="65" r="58" stroke="#152B58" strokeWidth="5.5" fill="none" />
  </svg>
);

export const SoccerBall: React.FC<SportIllustrationProps> = ({ className = '', size = 120 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 130 130"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md ${className}`}
    aria-hidden="true"
  >
    <circle cx="65" cy="65" r="58" fill="#FFFFFF" stroke="#152B58" strokeWidth="5.5" />
    
    {/* Center pentagon */}
    <polygon points="65,46 81,58 75,76 55,76 49,58" fill="#182E56" stroke="#152B58" strokeWidth="4" />

    {/* Connecting seams & perimeter patches */}
    {/* Top patch */}
    <path d="M65 46L65 18" stroke="#152B58" strokeWidth="4" />
    <polygon points="52,7 65,18 78,7 65,7" fill="#182E56" stroke="#152B58" strokeWidth="4" />

    {/* Top-right patch */}
    <path d="M81 58L106 48" stroke="#152B58" strokeWidth="4" />
    <polygon points="106,48 122,54 116,36 102,32" fill="#182E56" stroke="#152B58" strokeWidth="4" />

    {/* Bottom-right patch */}
    <path d="M75 76L95 98" stroke="#152B58" strokeWidth="4" />
    <polygon points="95,98 102,116 118,102 110,88" fill="#182E56" stroke="#152B58" strokeWidth="4" />

    {/* Bottom-left patch */}
    <path d="M55 76L35 98" stroke="#152B58" strokeWidth="4" />
    <polygon points="35,98 28,116 12,102 20,88" fill="#182E56" stroke="#152B58" strokeWidth="4" />

    {/* Top-left patch */}
    <path d="M49 58L24 48" stroke="#152B58" strokeWidth="4" />
    <polygon points="24,48 8,54 14,36 28,32" fill="#182E56" stroke="#152B58" strokeWidth="4" />

    {/* Edge border re-stroke */}
    <circle cx="65" cy="65" r="58" stroke="#152B58" strokeWidth="5.5" fill="none" />
  </svg>
);

export const TealPadelRacket: React.FC<SportIllustrationProps> = ({ className = '', size = 150 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 150 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md ${className}`}
    aria-hidden="true"
  >
    {/* Racket Head */}
    <ellipse
      cx="75"
      cy="55"
      rx="44"
      ry="46"
      fill="#29D2C0"
      stroke="#152B58"
      strokeWidth="6"
    />
    {/* Inner string bed / surface */}
    <ellipse cx="75" cy="55" rx="33" ry="35" fill="#E6FAF8" stroke="#152B58" strokeWidth="4" />

    {/* String grid lines */}
    <path d="M52 40H98M50 50H100M50 60H100M52 70H98" stroke="#1EB5A5" strokeWidth="2.5" />
    <path d="M62 28V82M75 24V86M88 28V82" stroke="#1EB5A5" strokeWidth="2.5" />

    {/* Neck */}
    <path d="M64 96L68 112H82L86 96" fill="#29D2C0" stroke="#152B58" strokeWidth="5" strokeLinejoin="round" />

    {/* Handle with dark navy grip wrap */}
    <rect x="68" y="110" width="14" height="34" rx="4" fill="#152B58" stroke="#152B58" strokeWidth="2" />
    <line x1="68" y1="118" x2="82" y2="122" stroke="#38BDF8" strokeWidth="2" />
    <line x1="68" y1="126" x2="82" y2="130" stroke="#38BDF8" strokeWidth="2" />
    <line x1="68" y1="134" x2="82" y2="138" stroke="#38BDF8" strokeWidth="2" />
  </svg>
);

export const YellowPickleball: React.FC<SportIllustrationProps> = ({ className = '', size = 65 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 70 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-sm ${className}`}
    aria-hidden="true"
  >
    <circle cx="35" cy="35" r="30" fill="#FFD536" stroke="#152B58" strokeWidth="4.5" />
    {/* Perforated holes */}
    <circle cx="35" cy="20" r="4" fill="#E5B210" stroke="#152B58" strokeWidth="2" />
    <circle cx="23" cy="32" r="4" fill="#E5B210" stroke="#152B58" strokeWidth="2" />
    <circle cx="47" cy="32" r="4" fill="#E5B210" stroke="#152B58" strokeWidth="2" />
    <circle cx="35" cy="46" r="4" fill="#E5B210" stroke="#152B58" strokeWidth="2" />
    <circle cx="25" cy="48" r="3" fill="#E5B210" stroke="#152B58" strokeWidth="1.8" />
    <circle cx="45" cy="48" r="3" fill="#E5B210" stroke="#152B58" strokeWidth="1.8" />
  </svg>
);

export const BluePadelRacket: React.FC<SportIllustrationProps> = ({ className = '', size = 160 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 160 160"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-lg ${className}`}
    aria-hidden="true"
  >
    {/* Racket teardrop head */}
    <path
      d="M48 60C48 30 62 14 80 14C98 14 112 30 112 60C112 84 96 98 90 108H70C64 98 48 84 48 60Z"
      fill="#296BE3"
      stroke="#152B58"
      strokeWidth="6"
      strokeLinejoin="round"
    />
    {/* Inner face plate */}
    <path
      d="M56 60C56 36 67 22 80 22C93 22 104 36 104 60C104 78 92 90 86 98H74C68 90 56 78 56 60Z"
      fill="#3B82F6"
    />

    {/* Perforated Padel Drill Holes */}
    <g fill="#152B58">
      <circle cx="70" cy="44" r="3.2" />
      <circle cx="80" cy="44" r="3.2" />
      <circle cx="90" cy="44" r="3.2" />
      
      <circle cx="65" cy="56" r="3.2" />
      <circle cx="75" cy="56" r="3.2" />
      <circle cx="85" cy="56" r="3.2" />
      <circle cx="95" cy="56" r="3.2" />

      <circle cx="65" cy="68" r="3.2" />
      <circle cx="75" cy="68" r="3.2" />
      <circle cx="85" cy="68" r="3.2" />
      <circle cx="95" cy="68" r="3.2" />

      <circle cx="70" cy="80" r="3.2" />
      <circle cx="80" cy="80" r="3.2" />
      <circle cx="90" cy="80" r="3.2" />
    </g>

    {/* Throat hole */}
    <ellipse cx="80" cy="98" rx="5" ry="3.5" fill="#152B58" />

    {/* Handle with wrapped dark navy grip */}
    <rect x="72" y="108" width="16" height="38" rx="4" fill="#152B58" stroke="#152B58" strokeWidth="2" />
    <line x1="72" y1="118" x2="88" y2="122" stroke="#60A5FA" strokeWidth="2.5" />
    <line x1="72" y1="128" x2="88" y2="132" stroke="#60A5FA" strokeWidth="2.5" />
    <line x1="72" y1="138" x2="88" y2="142" stroke="#60A5FA" strokeWidth="2.5" />
  </svg>
);

export const LimeTennisBall: React.FC<SportIllustrationProps> = ({ className = '', size = 65 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 70 70"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-sm ${className}`}
    aria-hidden="true"
  >
    <circle cx="35" cy="35" r="30" fill="#D3F82C" stroke="#152B58" strokeWidth="4.5" />
    {/* Curved white tennis seam */}
    <path
      d="M14 22C28 26 28 44 14 48"
      stroke="#FFFFFF"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
    <path
      d="M56 22C42 26 42 44 56 48"
      stroke="#FFFFFF"
      strokeWidth="4.5"
      strokeLinecap="round"
    />
  </svg>
);

export const CoralTennisRacket: React.FC<SportIllustrationProps> = ({ className = '', size = 150 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 150 150"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`drop-shadow-md ${className}`}
    aria-hidden="true"
  >
    {/* Oval racket head */}
    <ellipse cx="75" cy="55" rx="44" ry="48" fill="#FF6955" stroke="#152B58" strokeWidth="6" />
    {/* String bed */}
    <ellipse cx="75" cy="55" rx="34" ry="38" fill="#FFF2F0" stroke="#152B58" strokeWidth="4" />

    {/* String mesh */}
    <path d="M52 42H98M48 52H102M48 62H102M52 72H98" stroke="#38BDF8" strokeWidth="2.5" />
    <path d="M62 26V84M75 22V88M88 26V84" stroke="#38BDF8" strokeWidth="2.5" />

    {/* Neck */}
    <path d="M64 98L68 114H82L86 98" fill="#FF6955" stroke="#152B58" strokeWidth="5" strokeLinejoin="round" />

    {/* Blue Grip Handle */}
    <rect x="68" y="112" width="14" height="34" rx="4" fill="#2563EB" stroke="#152B58" strokeWidth="3" />
    <line x1="68" y1="120" x2="82" y2="124" stroke="#FFFFFF" strokeWidth="2" />
    <line x1="68" y1="128" x2="82" y2="132" stroke="#FFFFFF" strokeWidth="2" />
    <line x1="68" y1="136" x2="82" y2="140" stroke="#FFFFFF" strokeWidth="2" />
  </svg>
);

export const SparkleStar: React.FC<{ size?: number; color?: 'yellow' | 'blue'; className?: string }> = ({
  size = 28,
  color = 'yellow',
  className = ''
}) => {
  const fill = color === 'yellow' ? '#FFC000' : '#4FA2F8';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-xs ${className}`}
      aria-hidden="true"
    >
      <path
        d="M16 2C16 10 22 16 30 16C22 16 16 22 16 30C16 22 10 16 2 16C10 16 16 10 16 2Z"
        fill={fill}
      />
    </svg>
  );
};
