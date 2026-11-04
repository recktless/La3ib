/**
 * Layout and Spacing Verification Script for La3ib Coming Soon Page
 * 
 * Verifies geometry at:
 * - 1440px x 900px
 * - 1024px x 768px
 * - 768px x 1024px
 * - 390px x 844px
 * - 320px x 568px
 * 
 * Checks:
 * 1. Branding vertical centering
 * 2. Branding horizontal position (27% on desktop, 50% on mobile/tablet)
 * 3. Individual sticker positions & bounding boxes
 * 4. Clearance between all pairs of elements (strict > 24px requirement including 8px vertical / 3px horizontal animation range)
 * 5. Viewport containment (no overflow / clipping)
 */

const viewports = [
  { name: 'Desktop 1440', width: 1440, height: 900, isLg: true },
  { name: 'Landscape Tablet / Laptop 1024', width: 1024, height: 768, isLg: true },
  { name: 'Portrait Tablet 768', width: 768, height: 1024, isLg: false },
  { name: 'Mobile 390', width: 390, height: 844, isLg: false },
  { name: 'Small Mobile 320', width: 320, height: 568, isLg: false }
];

// Animation maximum excursion
const ANIM_EXTRA_X = 2.0; // +-2px (total range 4px)
const ANIM_EXTRA_Y = 4.0; // +-4px (total range 8px)

function computeLayout(vp) {
  const { width: W, height: H, isLg } = vp;

  // 1. Branding
  // Desktop: center at (27% * W, 50% * H)
  // Mobile/Tablet: center at (50% * W, 50% * H)
  const brandingCenterX = isLg ? 0.27 * W : 0.5 * W;
  const brandingCenterY = 0.5 * H;

  // Max width rules
  let brandingW;
  if (W >= 1280) brandingW = Math.min(385, 0.9 * W);
  else if (W >= 1024) brandingW = Math.min(350, 0.9 * W);
  else if (W >= 768) brandingW = Math.min(290, 0.9 * W);
  else if (W >= 640) brandingW = Math.min(250, 0.9 * W);
  else brandingW = Math.min(210, 0.9 * W);

  // Logo: 608x400 (aspect ratio 1.52)
  const logoH = brandingW * (400 / 608);
  // Coming Soon: 674x322 (aspect ratio 2.093)
  const csH = brandingW * (322 / 674);
  const gap = 28; // gap-7
  const brandingTotalH = logoH + gap + csH;

  const brandingBox = {
    name: 'Branding Group',
    cx: brandingCenterX,
    cy: brandingCenterY,
    left: brandingCenterX - brandingW / 2,
    right: brandingCenterX + brandingW / 2,
    top: brandingCenterY - brandingTotalH / 2,
    bottom: brandingCenterY + brandingTotalH / 2,
    w: brandingW,
    h: brandingTotalH
  };

  // 2. Stickers: Naturally distributed across the entire page
  const stickers = [];

  if (isLg) {
    // Desktop positions:
    // 1. Tennis Ball: Upper Left Sky (left: 8%, top: 15%)
    const tbW = Math.max(48, Math.min(72, 0.048 * W));
    stickers.push({
      name: 'Tennis Ball (Upper-Left)',
      cx: 0.08 * W,
      cy: 0.15 * H,
      w: tbW,
      h: tbW * (156 / 152)
    });

    // 2. Football: Lower Left Edge (left: 8%, top: 89%)
    const fbW = Math.max(75, Math.min(110, 0.072 * W));
    stickers.push({
      name: 'Football (Lower-Left)',
      cx: 0.08 * W,
      cy: 0.89 * H,
      w: fbW,
      h: fbW * (253 / 249)
    });

    // 3. Padel Racket: Top Center-Right (left: 56%, top: 14%)
    const prW = Math.max(75, Math.min(120, 0.078 * W));
    stickers.push({
      name: 'Padel Racket (Upper-Mid)',
      cx: 0.56 * W,
      cy: 0.14 * H,
      w: prW,
      h: prW * (367 / 268)
    });

    // 4. Volleyball: Upper-Right Corner (left: 88%, top: 16%)
    const vbW = Math.max(85, Math.min(130, 0.085 * W));
    stickers.push({
      name: 'Volleyball (Upper-Right)',
      cx: 0.88 * W,
      cy: 0.16 * H,
      w: vbW,
      h: vbW * (262 / 256)
    });

    // 5. Tennis Racket: Mid-Right Flank (left: 88%, top: 52%)
    const trW = Math.max(75, Math.min(125, 0.082 * W));
    stickers.push({
      name: 'Tennis Racket (Mid-Right)',
      cx: 0.88 * W,
      cy: 0.52 * H,
      w: trW,
      h: trW * (367 / 208)
    });

    // 6. Basketball: Bottom-Right Area (left: 72%, top: 82%)
    const bbW = Math.max(95, Math.min(160, 0.105 * W));
    stickers.push({
      name: 'Basketball (Lower-Right)',
      cx: 0.72 * W,
      cy: 0.82 * H,
      w: bbW,
      h: bbW * (280 / 274)
    });
  } else {
    // Mobile / Tablet layout
    // 4 Corner balls framing the centered branding:
    // Tennis ball: (12%, 9%)
    const tbW = W < 640 ? 42 : (W < 768 ? 50 : 58);
    stickers.push({
      name: 'Tennis Ball (Top-Left)',
      cx: 0.12 * W,
      cy: 0.09 * H,
      w: tbW,
      h: tbW * (156 / 152)
    });

    // Football: (12%, 88%)
    const fbW = W < 640 ? 56 : (W < 768 ? 70 : 82);
    stickers.push({
      name: 'Football (Bottom-Left)',
      cx: 0.12 * W,
      cy: 0.88 * H,
      w: fbW,
      h: fbW * (253 / 249)
    });

    // Volleyball: (88%, 9%)
    const vbW = W < 640 ? 50 : (W < 768 ? 65 : 78);
    stickers.push({
      name: 'Volleyball (Top-Right)',
      cx: 0.88 * W,
      cy: 0.09 * H,
      w: vbW,
      h: vbW * (262 / 256)
    });

    // Basketball: (86%, 86%)
    const bbW = W < 640 ? 66 : (W < 768 ? 80 : 94);
    stickers.push({
      name: 'Basketball (Bottom-Right)',
      cx: 0.86 * W,
      cy: 0.86 * H,
      w: bbW,
      h: bbW * (280 / 274)
    });
  }

  // Compute bounding boxes with animation excursion
  const boxes = [brandingBox];
  for (const s of stickers) {
    boxes.push({
      name: s.name,
      cx: s.cx,
      cy: s.cy,
      w: s.w,
      h: s.h,
      left: s.cx - s.w / 2 - ANIM_EXTRA_X,
      right: s.cx + s.w / 2 + ANIM_EXTRA_X,
      top: s.cy - s.h / 2 - ANIM_EXTRA_Y,
      bottom: s.cy + s.h / 2 + ANIM_EXTRA_Y
    });
  }

  // Check clearances between all pairs
  const collisions = [];
  const clearances = [];

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];

      // Distance between box boundaries
      const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
      const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
      const distance = Math.hypot(dx, dy);

      clearances.push({
        pair: `${a.name} <-> ${b.name}`,
        distance: Math.round(distance),
        dx: Math.round(dx),
        dy: Math.round(dy)
      });

      if (distance < 24) {
        collisions.push({
          pair: `${a.name} <-> ${b.name}`,
          distance: Math.round(distance)
        });
      }
    }
  }

  // Check viewport overflow
  const overflows = [];
  for (const b of boxes) {
    if (b.left < 0 || b.right > W || b.top < 0 || b.bottom > H) {
      overflows.push({
        name: b.name,
        bounds: { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), W, H }
      });
    }
  }

  return {
    vp,
    brandingBox,
    stickersCount: stickers.length,
    collisions,
    clearances,
    overflows
  };
}

let allOk = true;

console.log('=== LA3IB COMING SOON LAYOUT GEOMETRY VERIFICATION ===\n');

for (const vp of viewports) {
  const result = computeLayout(vp);
  console.log(`--- Viewport: ${result.vp.name} (${result.vp.width}x${result.vp.height}) ---`);
  console.log(`Branding Center: X=${Math.round(result.brandingBox.cx)}px (${((result.brandingBox.cx / result.vp.width) * 100).toFixed(1)}%), Y=${Math.round(result.brandingBox.cy)}px (${((result.brandingBox.cy / result.vp.height) * 100).toFixed(1)}%)`);
  console.log(`Branding Size: ${Math.round(result.brandingBox.w)}px x ${Math.round(result.brandingBox.h)}px`);
  console.log(`Stickers Rendered: ${result.stickersCount}`);
  
  if (result.overflows.length > 0) {
    console.error(`  [FAIL] Viewport Overflows:`, result.overflows);
    allOk = false;
  } else {
    console.log(`  [PASS] Zero viewport clipping or overflow`);
  }

  if (result.collisions.length > 0) {
    console.error(`  [FAIL] Collision / Clearance Violations (< 24px):`, result.collisions);
    allOk = false;
  } else {
    const minClearance = Math.min(...result.clearances.map(c => c.distance));
    console.log(`  [PASS] Zero collisions. Minimum clearance between any two elements: ${minClearance}px (required >= 24px)`);
  }
  console.log('');
}

if (!allOk) {
  process.exit(1);
} else {
  console.log('ALL 5 VIEWPORTS PASSED VERIFICATION WITH ZERO COLLISIONS & PROPER CLEARANCES!');
}
