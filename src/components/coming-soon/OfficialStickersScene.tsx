import React from 'react';

/**
 * Official Stickers Scene for La3ib Coming Soon Page
 * 
 * Strict Layout Requirements:
 * - Distributed naturally across the entire page (not just clustered on the right):
 *   - Tennis ball:  Upper-left sky (left: 8%, top: 15%)
 *   - Football:     Lower-left edge (left: 10%, top: 85%)
 *   - Padel racket: Top center-right (left: 56%, top: 14%)
 *   - Volleyball:   Upper-right corner (left: 88%, top: 16%)
 *   - Tennis racket: Mid-right flank (left: 88%, top: 52%)
 *   - Basketball:   Bottom-right area (left: 72%, top: 82%)
 * - Zero overlap between any two stickers or the main branding.
 * - Nested Architecture for Simultaneous Floating + Hover Scaling:
 *   - Outer wrapper: handles continuous floating loop (4-8px vertical, 2-3px horizontal, <=2deg rotation).
 *   - Inner wrapper: handles independent 105% hover scaling (transform: scale(1.05), 300ms ease-out).
 * - Full prefers-reduced-motion and hover-media query support.
 */
export const OfficialStickersScene: React.FC = () => {
  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-10"
      aria-hidden="true"
    >
      {/* 1. Tennis Ball: Upper-Left Sky (framed comfortably above and left of the logo) */}
      <div
        className="sticker-container absolute -translate-x-1/2 -translate-y-1/2 left-[12%] top-[9%] w-[42px] sm:w-[50px] md:w-[58px] lg:left-[8%] lg:top-[15%] lg:w-[4.8vw] lg:max-w-[72px] lg:min-w-[48px] pointer-events-auto"
        data-testid="sticker-tennis-ball-container"
      >
        <div
          className="floating-sticker sticker-tennis-ball w-full"
          style={{
            animation: 'floatSticker2 7.4s ease-in-out infinite',
            animationDelay: '-2.1s'
          }}
        >
          <div
            className="sticker-hover-target w-full cursor-pointer flex justify-center"
            data-testid="sticker-tennis-ball-hover"
          >
            <picture className="w-full flex justify-center">
              <source srcSet="/assets/stickers/tennis_ball.webp" type="image/webp" />
              <img
                src="/assets/stickers/tennis_ball.png"
                alt=""
                width={152}
                height={156}
                className="w-full h-auto object-contain drop-shadow-sm -rotate-8"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
        </div>
      </div>

      {/* 2. Football: Lower-Left Area (anchors below and to the left of the branding) */}
      <div
        className="sticker-container absolute -translate-x-1/2 -translate-y-1/2 left-[12%] top-[88%] w-[56px] sm:w-[70px] md:w-[82px] lg:left-[8%] lg:top-[89%] lg:w-[7.2vw] lg:max-w-[110px] lg:min-w-[75px] pointer-events-auto"
        data-testid="sticker-football-container"
      >
        <div
          className="floating-sticker sticker-football w-full"
          style={{
            animation: 'floatSticker3 8.0s ease-in-out infinite',
            animationDelay: '-3.5s'
          }}
        >
          <div
            className="sticker-hover-target w-full cursor-pointer flex justify-center"
            data-testid="sticker-football-hover"
          >
            <picture className="w-full flex justify-center">
              <source srcSet="/assets/stickers/football.webp" type="image/webp" />
              <img
                src="/assets/stickers/football.png"
                alt=""
                width={249}
                height={253}
                className="w-full h-auto object-contain drop-shadow-md rotate-10"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
        </div>
      </div>

      {/* 3. Padel Racket: Top Center-Right (floating gracefully in the upper sky) */}
      <div
        className="sticker-container absolute -translate-x-1/2 -translate-y-1/2 hidden lg:block lg:left-[56%] lg:top-[14%] lg:w-[7.8vw] lg:max-w-[120px] lg:min-w-[75px] pointer-events-auto"
        data-testid="sticker-padel-racket-container"
      >
        <div
          className="floating-sticker sticker-padel-racket w-full"
          style={{
            animation: 'floatSticker6 8.8s ease-in-out infinite',
            animationDelay: '-5.8s'
          }}
        >
          <div
            className="sticker-hover-target w-full cursor-pointer flex justify-center"
            data-testid="sticker-padel-racket-hover"
          >
            <picture className="w-full flex justify-center">
              <source srcSet="/assets/stickers/padel_racket.webp" type="image/webp" />
              <img
                src="/assets/stickers/padel_racket.png"
                alt=""
                width={268}
                height={367}
                className="w-full h-auto object-contain drop-shadow-md -rotate-16"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
        </div>
      </div>

      {/* 4. Volleyball: Upper-Right Corner */}
      <div
        className="sticker-container absolute -translate-x-1/2 -translate-y-1/2 left-[88%] top-[9%] w-[50px] sm:w-[65px] md:w-[78px] lg:left-[88%] lg:top-[16%] lg:w-[8.5vw] lg:max-w-[130px] lg:min-w-[85px] pointer-events-auto"
        data-testid="sticker-volleyball-container"
      >
        <div
          className="floating-sticker sticker-volleyball w-full"
          style={{
            animation: 'floatSticker4 9.6s ease-in-out infinite',
            animationDelay: '-4.8s'
          }}
        >
          <div
            className="sticker-hover-target w-full cursor-pointer flex justify-center"
            data-testid="sticker-volleyball-hover"
          >
            <picture className="w-full flex justify-center">
              <source srcSet="/assets/stickers/volleyball.webp" type="image/webp" />
              <img
                src="/assets/stickers/volleyball.png"
                alt=""
                width={256}
                height={262}
                className="w-full h-auto object-contain drop-shadow-md rotate-12"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
        </div>
      </div>

      {/* 5. Tennis Racket: Mid-Right Flank */}
      <div
        className="sticker-container absolute -translate-x-1/2 -translate-y-1/2 hidden lg:block lg:left-[88%] lg:top-[52%] lg:w-[8.2vw] lg:max-w-[125px] lg:min-w-[75px] pointer-events-auto"
        data-testid="sticker-tennis-racket-container"
      >
        <div
          className="floating-sticker sticker-tennis-racket w-full"
          style={{
            animation: 'floatSticker5 9.2s ease-in-out infinite',
            animationDelay: '-3.7s'
          }}
        >
          <div
            className="sticker-hover-target w-full cursor-pointer flex justify-center"
            data-testid="sticker-tennis-racket-hover"
          >
            <picture className="w-full flex justify-center">
              <source srcSet="/assets/stickers/tennis_racket.webp" type="image/webp" />
              <img
                src="/assets/stickers/tennis_racket.png"
                alt=""
                width={208}
                height={367}
                className="w-full h-auto object-contain drop-shadow-md rotate-18"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
        </div>
      </div>

      {/* 6. Basketball: Bottom-Right Anchor */}
      <div
        className="sticker-container absolute -translate-x-1/2 -translate-y-1/2 left-[86%] top-[86%] w-[66px] sm:w-[80px] md:w-[94px] lg:left-[72%] lg:top-[82%] lg:w-[10.5vw] lg:max-w-[160px] lg:min-w-[95px] pointer-events-auto"
        data-testid="sticker-basketball-container"
      >
        <div
          className="floating-sticker sticker-basketball w-full"
          style={{
            animation: 'floatSticker1 8.5s ease-in-out infinite',
            animationDelay: '-1.4s'
          }}
        >
          <div
            className="sticker-hover-target w-full cursor-pointer flex justify-center"
            data-testid="sticker-basketball-hover"
          >
            <picture className="w-full flex justify-center">
              <source srcSet="/assets/stickers/basketball.webp" type="image/webp" />
              <img
                src="/assets/stickers/basketball.png"
                alt=""
                width={274}
                height={280}
                className="w-full h-auto object-contain drop-shadow-md -rotate-12"
                loading="eager"
                decoding="async"
                draggable={false}
              />
            </picture>
          </div>
        </div>
      </div>

      {/* Floating Keyframe Animations (4-8px vertical, 2-3px horizontal, max 2deg rotation) */}
      <style>{`
        @keyframes floatSticker1 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-2px, -5px, 0) rotate(1.2deg); }
        }
        @keyframes floatSticker2 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(2px, 5px, 0) rotate(-1.2deg); }
        }
        @keyframes floatSticker3 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(2px, -6px, 0) rotate(1.4deg); }
        }
        @keyframes floatSticker4 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-2.5px, 5px, 0) rotate(-1.2deg); }
        }
        @keyframes floatSticker5 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(2px, -7px, 0) rotate(1.5deg); }
        }
        @keyframes floatSticker6 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-2px, 6px, 0) rotate(-1.3deg); }
        }

        .floating-sticker {
          will-change: transform;
          backface-visibility: hidden;
        }

        /* Independent Hover Scale (105% with 300ms ease-out) */
        .sticker-hover-target {
          transform: scale(1);
          transform-origin: center center;
          transition: transform 300ms ease-out;
          will-change: transform;
        }

        @media (hover: hover) {
          .sticker-hover-target:hover {
            transform: scale(1.05);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .floating-sticker {
            animation: none !important;
            transform: none !important;
          }
          .sticker-hover-target {
            transition: none !important;
            transform: none !important;
          }
          .sticker-hover-target:hover {
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
};
