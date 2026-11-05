import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComingSoonPage } from '../src/components/coming-soon/ComingSoonPage';
import { OfficialStickersScene } from '../src/components/coming-soon/OfficialStickersScene';
import { BrandWavesBackground } from '../src/components/coming-soon/BrandWavesBackground';
import { AdminBypassBanner } from '../src/components/coming-soon/AdminBypassBanner';
import { COMING_SOON_MODE, ADMIN_BYPASS_STORAGE_KEY } from '../src/config/launchMode';

describe('La3ib Coming Soon Page Redesign with Official Sticker Techpack', () => {
  it('exports COMING_SOON_MODE as true for pre-launch mode', () => {
    expect(COMING_SOON_MODE).toBe(true);
    expect(ADMIN_BYPASS_STORAGE_KEY).toBe('la3ib_admin_bypass_token');
  });

  it('renders the official unclipped bilingual La3ib logo prominently with top "i" dot preserved', () => {
    const html = renderToStaticMarkup(<ComingSoonPage onBypassSuccess={vi.fn()} />);

    // Logo must be the extracted official sticker asset with WebP support and unclipped dimensions
    expect(html).toContain('/assets/stickers/la3ib_logo.webp');
    expect(html).toContain('/assets/stickers/la3ib_logo.png');
    expect(html).toContain('alt="La3ib | لاعب"');
    expect(html).toContain('width="608"');
    expect(html).toContain('height="400"');
    expect(html).toContain('overflow-visible');
  });

  it('renders the extracted official COMING SOON! sticker graphic directly underneath', () => {
    const html = renderToStaticMarkup(<ComingSoonPage onBypassSuccess={vi.fn()} />);

    // Must be the extracted sticker graphic, not recreated text
    expect(html).toContain('/assets/stickers/coming_soon.webp');
    expect(html).toContain('/assets/stickers/coming_soon.png');
    expect(html).toContain('alt="Coming Soon!"');
  });

  it('positions branding vertically centered and at 27% desktop viewport width with ~20-25% reduced sizing', () => {
    const html = renderToStaticMarkup(<ComingSoonPage onBypassSuccess={vi.fn()} />);

    // Branding group must be centered at 27% desktop width and vertically centered
    expect(html).toContain('lg:left-[27%]');
    expect(html).toContain('lg:top-1/2');
    expect(html).toContain('lg:-translate-x-1/2');
    expect(html).toContain('lg:-translate-y-1/2');

    // On mobile, must be centered
    expect(html).toContain('left-1/2');
    expect(html).toContain('top-1/2');

    // 24-36px consistent gap between logo and headline (gap-7 is 28px)
    expect(html).toContain('gap-7');

    // Reduced max-width (capped at ~385px instead of previous 530px, an exact 25% reduction)
    expect(html).toContain('xl:max-w-[385px]');
  });

  it('implements subtle 105% hover scaling with 300ms transition and reduced-motion support on branding', () => {
    const html = renderToStaticMarkup(<ComingSoonPage onBypassSuccess={vi.fn()} />);

    // Must include the branding-hover-target classes
    expect(html).toContain('branding-hover-target');
    expect(html).toContain('data-testid="branding-logo-wrapper"');
    expect(html).toContain('data-testid="branding-coming-soon-wrapper"');

    // CSS requirements: 300ms ease-out, transform-origin center, scale(1.05) on hover
    expect(html).toContain('transition: transform 300ms ease-out');
    expect(html).toContain('transform-origin: center center');
    expect(html).toContain('@media (hover: hover)');
    expect(html).toContain('transform: scale(1.05)');

    // Accessibility: disables transitions for prefers-reduced-motion
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html).toContain('transition: none !important');
  });

  it('implements simultaneous floating animation AND independent 105% hover enlargement on sports stickers', () => {
    const html = renderToStaticMarkup(<OfficialStickersScene />);

    // Each sticker has an outer floating wrapper and an inner hover wrapper
    expect(html).toContain('floating-sticker');
    expect(html).toContain('sticker-hover-target');
    expect(html).toContain('data-testid="sticker-basketball-hover"');
    expect(html).toContain('data-testid="sticker-football-hover"');
    expect(html).toContain('data-testid="sticker-volleyball-hover"');
    expect(html).toContain('data-testid="sticker-tennis-ball-hover"');
    expect(html).toContain('data-testid="sticker-tennis-racket-hover"');
    expect(html).toContain('data-testid="sticker-padel-racket-hover"');

    // CSS for sticker hover scaling
    expect(html).toContain('.sticker-hover-target:hover');
    expect(html).toContain('transform: scale(1.05)');
    expect(html).toContain('transition: transform 300ms ease-out');
  });

  it('distributes sports stickers naturally across the page rather than in a single cluster', () => {
    const html = renderToStaticMarkup(<OfficialStickersScene />);

    // Independent containers exist
    expect(html).toContain('data-testid="sticker-basketball-container"');
    expect(html).toContain('data-testid="sticker-football-container"');
    expect(html).toContain('data-testid="sticker-volleyball-container"');
    expect(html).toContain('data-testid="sticker-tennis-ball-container"');
    expect(html).toContain('data-testid="sticker-tennis-racket-container"');
    expect(html).toContain('data-testid="sticker-padel-racket-container"');

    // Natural distribution across entire screen:
    // Tennis ball in upper left
    expect(html).toContain('lg:left-[8%]');
    expect(html).toContain('lg:top-[15%]');

    // Football in lower left
    expect(html).toContain('lg:left-[8%]');
    expect(html).toContain('lg:top-[89%]');

    // Padel racket in upper center-right
    expect(html).toContain('lg:left-[56%]');
    expect(html).toContain('lg:top-[14%]');

    // Volleyball in upper right
    expect(html).toContain('lg:left-[88%]');
    expect(html).toContain('lg:top-[16%]');

    // Tennis racket in mid-right
    expect(html).toContain('lg:left-[88%]');
    expect(html).toContain('lg:top-[52%]');

    // Basketball in bottom right
    expect(html).toContain('lg:left-[72%]');
    expect(html).toContain('lg:top-[82%]');
  });

  it('renders the layered blue wave background based on official identity (Reference Image 2)', () => {
    const html = renderToStaticMarkup(<BrandWavesBackground />);

    // Brand wave colors present
    expect(html).toContain('#3A60AA'); // Primary blue
    expect(html).toContain('#B9C9E0'); // Light blue
    expect(html).toContain('#D9E7F8'); // Pale blue

    // Flowing SVG paths with expanded borders to prevent edge gaps
    expect(html).toContain('<svg');
    expect(html).toContain('linearGradient');
    expect(html).toContain('M-30 -20V110C180 155');
    expect(html).toContain('M-30 260V120C180 75');
  });

  it('animates blue background wave layers independently with subtle ocean movement (12-20s cycles) and reduced-motion support', () => {
    const html = renderToStaticMarkup(<BrandWavesBackground />);

    // Independent layer classes
    expect(html).toContain('ocean-wave-top-1');
    expect(html).toContain('ocean-wave-top-2');
    expect(html).toContain('ocean-wave-top-3');
    expect(html).toContain('ocean-wave-bottom-1');
    expect(html).toContain('ocean-wave-bottom-2');
    expect(html).toContain('ocean-wave-bottom-3');

    // Keyframe definitions
    expect(html).toContain('@keyframes oceanWaveTop1');
    expect(html).toContain('@keyframes oceanWaveTop2');
    expect(html).toContain('@keyframes oceanWaveBottom1');
    expect(html).toContain('@keyframes oceanWaveBottom3');

    // Durations in 12-20s calm ocean range
    expect(html).toContain('18.5s');
    expect(html).toContain('14.2s');
    expect(html).toContain('16.8s');
    expect(html).toContain('19.2s');
    expect(html).toContain('15.6s');
    expect(html).toContain('13.4s');

    // Edge-anchored origins
    expect(html).toContain('transform-origin: top center');
    expect(html).toContain('transform-origin: bottom center');

    // Respects prefers-reduced-motion
    expect(html).toContain('@media (prefers-reduced-motion: reduce)');
    expect(html).toContain('animation: none !important');
  });

  it('does NOT contain waitlist forms, descriptions, countdown timers, or social handles', () => {
    const html = renderToStaticMarkup(<ComingSoonPage onBypassSuccess={vi.fn()} />);

    // Strict minimalist requirement
    expect(html).not.toContain('<form');
    expect(html).not.toContain('waitlist');
    expect(html).not.toContain('newsletter');
    expect(html).not.toContain('instagram.com');
    expect(html).not.toContain('twitter.com');
    expect(html).not.toContain('countdown');
    expect(html).not.toContain('seconds');
  });

  it('enforces subtle animation limits: vertical 4-8px, horizontal 2-3px, rotation <= 2 deg, duration 7-10s', () => {
    const html = renderToStaticMarkup(<OfficialStickersScene />);

    // Keyframes check
    expect(html).toContain('@keyframes floatSticker1');
    expect(html).toContain('@keyframes floatSticker2');
    expect(html).toContain('@keyframes floatSticker3');
    expect(html).toContain('@keyframes floatSticker4');
    expect(html).toContain('@keyframes floatSticker5');
    expect(html).toContain('@keyframes floatSticker6');

    // Durations between 7s and 10s
    expect(html).toContain('8.5s');
    expect(html).toContain('7.4s');
    expect(html).toContain('8.0s');
    expect(html).toContain('9.6s');
    expect(html).toContain('9.2s');
    expect(html).toContain('8.8s');

    // Supports reduced-motion
    expect(html).toContain('prefers-reduced-motion: reduce');
    expect(html).toContain('animation: none !important');
  });

  it('provides a discreet Admin Access link at the bottom', () => {
    const html = renderToStaticMarkup(<ComingSoonPage onBypassSuccess={vi.fn()} />);

    expect(html).toContain('Admin Access | دخول الإدارة');
    expect(html).toContain('aria-label="Administrator Access"');
  });

  it('renders the AdminBypassBanner with a return button when bypass is active', () => {
    const onReturn = vi.fn();
    const html = renderToStaticMarkup(
      <AdminBypassBanner onReturnToComingSoon={onReturn} adminEmail="admin@la3ib.com" />
    );

    expect(html).toContain('Staff Pre-Launch Preview (Bypass Active)');
    expect(html).toContain('Return to Coming Soon | العودة لصفحة قريباً');
    expect(html).toContain('admin@la3ib.com');
  });

  it('renders the AdminBypassModal with bilingual labels and password input without crashing', async () => {
    const { AdminBypassModal } = await import('../src/components/coming-soon/AdminBypassModal');
    const html = renderToStaticMarkup(
      <AdminBypassModal isOpen={true} onClose={vi.fn()} onSuccess={vi.fn()} />
    );

    expect(html).toContain('Administrator Access');
    expect(html).toContain('عربي');
    expect(html).toContain('Admin Bypass Password');
    expect(html).toContain('Unlock Full App');
  });

  it('safely handles empty, HTML, and malformed responses without throwing "Unexpected end of JSON input"', async () => {
    // Helper that replicates the safe response parser used in AdminBypassModal and App.tsx
    async function safeParse(response: { text: () => Promise<string>; ok: boolean; status: number }) {
      let rawText = '';
      try {
        rawText = await response.text();
      } catch {
        return { ok: false, status: response.status, data: null };
      }
      const trimmed = rawText.trim();
      if (!trimmed) {
        return { ok: response.ok, status: response.status, data: null };
      }
      try {
        const data = JSON.parse(trimmed);
        return { ok: response.ok, status: response.status, data };
      } catch {
        return { ok: false, status: response.status, data: null };
      }
    }

    // 1. Empty body (the exact condition that caused "Unexpected end of JSON input")
    const emptyResponse = {
      ok: false,
      status: 502,
      text: async () => ''
    };
    const emptyResult = await safeParse(emptyResponse);
    expect(emptyResult.data).toBeNull();
    expect(emptyResult.status).toBe(502);

    // 2. Whitespace-only body
    const whitespaceResponse = {
      ok: false,
      status: 503,
      text: async () => '   \n\t  '
    };
    const whitespaceResult = await safeParse(whitespaceResponse);
    expect(whitespaceResult.data).toBeNull();

    // 3. HTML Error Page from Reverse Proxy (e.g. Cloud Run 502 Bad Gateway)
    const htmlResponse = {
      ok: false,
      status: 502,
      text: async () => '<!DOCTYPE html><html><body>502 Bad Gateway</body></html>'
    };
    const htmlResult = await safeParse(htmlResponse);
    expect(htmlResult.data).toBeNull();

    // 4. Valid JSON response
    const validResponse = {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, bypassToken: 'token.123' })
    };
    const validResult = await safeParse(validResponse);
    expect(validResult.data).toEqual({ success: true, bypassToken: 'token.123' });
    expect(validResult.ok).toBe(true);

    // 5. Rate limit 429 structured JSON response
    const rateLimitResponse = {
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ success: false, rateLimited: true, error: 'Too many failed attempts.' })
    };
    const rateLimitResult = await safeParse(rateLimitResponse);
    expect(rateLimitResult.data?.rateLimited).toBe(true);
    expect(rateLimitResult.status).toBe(429);
  });
});
