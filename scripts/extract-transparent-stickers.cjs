const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.resolve(__dirname, '../public/assets/stickers');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function extractAll() {
  const inputPath = path.resolve(__dirname, '../public/assets/aistudio/La3ib_Sports_Sticker_Sheet_bff0899a.png');
  const { data, info } = await sharp(inputPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // 1. COMING SOON!
  // Letters are royal blue. NO white inside.
  // Every white pixel (including inside the three 'O's) must be 100% transparent!
  {
    const x1 = 876, x2 = 1511, y1 = 133, y2 = 419;
    const pad = 4;
    const cropX1 = Math.max(0, x1 - pad);
    const cropY1 = Math.max(0, y1 - pad);
    const cropX2 = Math.min(width - 1, x2 + pad);
    const cropY2 = Math.min(height - 1, y2 + pad);
    const cropW = cropX2 - cropX1 + 1;
    const cropH = cropY2 - cropY1 + 1;

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const srcIdx = ((cropY1 + cy) * width + (cropX1 + cx)) * channels;
        const dstIdx = (cy * cropW + cx) * 4;
        const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
        const minVal = Math.min(r, g, b);

        buf[dstIdx] = r;
        buf[dstIdx + 1] = g;
        buf[dstIdx + 2] = b;

        if (minVal >= 238) {
          buf[dstIdx + 3] = 0; // Pure transparent background & letter holes
        } else if (minVal > 200) {
          // Smooth anti-aliased edge
          buf[dstIdx + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - (minVal - 200) / 38))));
        } else {
          buf[dstIdx + 3] = 255;
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'coming_soon.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'coming_soon.webp'));
    console.log('✓ Extracted coming_soon (clean transparent letter holes)');
  }

  // 2. BASKETBALL
  // Orange & navy. NO white inside.
  {
    const x1 = 36, x2 = 301, y1 = 571, y2 = 842;
    const pad = 4;
    const cropX1 = Math.max(0, x1 - pad);
    const cropY1 = Math.max(0, y1 - pad);
    const cropX2 = Math.min(width - 1, x2 + pad);
    const cropY2 = Math.min(height - 1, y2 + pad);
    const cropW = cropX2 - cropX1 + 1;
    const cropH = cropY2 - cropY1 + 1;

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const srcIdx = ((cropY1 + cy) * width + (cropX1 + cx)) * channels;
        const dstIdx = (cy * cropW + cx) * 4;
        const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
        const minVal = Math.min(r, g, b);

        buf[dstIdx] = r;
        buf[dstIdx + 1] = g;
        buf[dstIdx + 2] = b;

        if (minVal >= 238) {
          buf[dstIdx + 3] = 0;
        } else if (minVal > 200) {
          buf[dstIdx + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - (minVal - 200) / 38))));
        } else {
          buf[dstIdx + 3] = 255;
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'basketball.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'basketball.webp'));
    console.log('✓ Extracted basketball (100% transparent background)');
  }

  // 3. PADEL RACKET
  // Royal blue & navy with throat hole. NO white inside.
  {
    const x1 = 1361, x2 = 1620, y1 = 516, y2 = 874;
    const pad = 4;
    const cropX1 = Math.max(0, x1 - pad);
    const cropY1 = Math.max(0, y1 - pad);
    const cropX2 = Math.min(width - 1, x2 + pad);
    const cropY2 = Math.min(height - 1, y2 + pad);
    const cropW = cropX2 - cropX1 + 1;
    const cropH = cropY2 - cropY1 + 1;

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const srcIdx = ((cropY1 + cy) * width + (cropX1 + cx)) * channels;
        const dstIdx = (cy * cropW + cx) * 4;
        const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
        const minVal = Math.min(r, g, b);

        buf[dstIdx] = r;
        buf[dstIdx + 1] = g;
        buf[dstIdx + 2] = b;

        if (minVal >= 238) {
          buf[dstIdx + 3] = 0; // Throat hole and exterior are transparent!
        } else if (minVal > 200) {
          buf[dstIdx + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - (minVal - 200) / 38))));
        } else {
          buf[dstIdx + 3] = 255;
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'padel_racket.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'padel_racket.webp'));
    console.log('✓ Extracted padel_racket (throat hole transparent)');
  }

  // 4. FOOTBALL (SOCCER BALL)
  // Circular ball. Outside circle is transparent; inside white patches are solid white.
  {
    const x1 = 337, x2 = 585, y1 = 582, y2 = 834;
    const cropW = x2 - x1 + 1;
    const cropH = y2 - y1 + 1;
    const cx = (cropW - 1) / 2;
    const cy = (cropH - 1) / 2;
    const rOuter = Math.min(cx, cy);

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cyPos = 0; cyPos < cropH; cyPos++) {
      for (let cxPos = 0; cxPos < cropW; cxPos++) {
        const srcIdx = ((y1 + cyPos) * width + (x1 + cxPos)) * channels;
        const dstIdx = (cyPos * cropW + cxPos) * 4;
        const dist = Math.hypot(cxPos - cx, cyPos - cy);

        buf[dstIdx] = data[srcIdx];
        buf[dstIdx + 1] = data[srcIdx + 1];
        buf[dstIdx + 2] = data[srcIdx + 2];

        if (dist > rOuter + 0.5) {
          buf[dstIdx + 3] = 0;
        } else if (dist > rOuter - 1.5) {
          buf[dstIdx + 3] = Math.max(0, Math.min(255, Math.round(255 * (rOuter + 0.5 - dist) / 2)));
        } else {
          buf[dstIdx + 3] = 255;
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'football.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'football.webp'));
    console.log('✓ Extracted football (solid white patches inside, transparent outside)');
  }

  // 5. VOLLEYBALL
  // Circular ball. Outside circle is transparent; inside white panels are solid white.
  {
    const x1 = 625, x2 = 880, y1 = 579, y2 = 840;
    const cropW = x2 - x1 + 1;
    const cropH = y2 - y1 + 1;
    const cx = (cropW - 1) / 2;
    const cy = (cropH - 1) / 2;
    const rOuter = Math.min(cx, cy);

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cyPos = 0; cyPos < cropH; cyPos++) {
      for (let cxPos = 0; cxPos < cropW; cxPos++) {
        const srcIdx = ((y1 + cyPos) * width + (x1 + cxPos)) * channels;
        const dstIdx = (cyPos * cropW + cxPos) * 4;
        const dist = Math.hypot(cxPos - cx, cyPos - cy);

        buf[dstIdx] = data[srcIdx];
        buf[dstIdx + 1] = data[srcIdx + 1];
        buf[dstIdx + 2] = data[srcIdx + 2];

        if (dist > rOuter + 0.5) {
          buf[dstIdx + 3] = 0;
        } else if (dist > rOuter - 1.5) {
          buf[dstIdx + 3] = Math.max(0, Math.min(255, Math.round(255 * (rOuter + 0.5 - dist) / 2)));
        } else {
          buf[dstIdx + 3] = 255;
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'volleyball.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'volleyball.webp'));
    console.log('✓ Extracted volleyball (solid white panels inside, transparent outside)');
  }

  // 6. TENNIS BALL
  // Circular ball. Lime green with white seam.
  {
    const x1 = 923, x2 = 1074, y1 = 641, y2 = 796;
    const cropW = x2 - x1 + 1;
    const cropH = y2 - y1 + 1;
    const cx = (cropW - 1) / 2;
    const cy = (cropH - 1) / 2;
    const rOuter = Math.min(cx, cy);

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cyPos = 0; cyPos < cropH; cyPos++) {
      for (let cxPos = 0; cxPos < cropW; cxPos++) {
        const srcIdx = ((y1 + cyPos) * width + (x1 + cxPos)) * channels;
        const dstIdx = (cyPos * cropW + cxPos) * 4;
        const dist = Math.hypot(cxPos - cx, cyPos - cy);

        buf[dstIdx] = data[srcIdx];
        buf[dstIdx + 1] = data[srcIdx + 1];
        buf[dstIdx + 2] = data[srcIdx + 2];

        if (dist > rOuter + 0.5) {
          buf[dstIdx + 3] = 0;
        } else if (dist > rOuter - 1.5) {
          buf[dstIdx + 3] = Math.max(0, Math.min(255, Math.round(255 * (rOuter + 0.5 - dist) / 2)));
        } else {
          buf[dstIdx + 3] = 255;
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'tennis_ball.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'tennis_ball.webp'));
    console.log('✓ Extracted tennis_ball (solid white seam, transparent outside)');
  }

  // 7. TENNIS RACKET
  // Teal frame, grip, and string grid. Throat cutout and exterior transparent.
  {
    const x1 = 1123, x2 = 1322, y1 = 516, y2 = 874;
    const pad = 4;
    const cropX1 = Math.max(0, x1 - pad);
    const cropY1 = Math.max(0, y1 - pad);
    const cropX2 = Math.min(width - 1, x2 + pad);
    const cropY2 = Math.min(height - 1, y2 + pad);
    const cropW = cropX2 - cropX1 + 1;
    const cropH = cropY2 - cropY1 + 1;

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const srcIdx = ((cropY1 + cy) * width + (cropX1 + cx)) * channels;
        const dstIdx = (cy * cropW + cx) * 4;
        const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
        const minVal = Math.min(r, g, b);

        buf[dstIdx] = r;
        buf[dstIdx + 1] = g;
        buf[dstIdx + 2] = b;

        // Throat hole and outer space are pure white
        if (minVal >= 238) {
          buf[dstIdx + 3] = 0;
        } else if (minVal > 200) {
          buf[dstIdx + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - (minVal - 200) / 38))));
        } else {
          buf[dstIdx + 3] = 255;
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'tennis_racket.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'tennis_racket.webp'));
    console.log('✓ Extracted tennis_racket (throat hole transparent)');
  }

  // 8. LA3IB LOGO
  // Multi-component flood fill: exterior background transparent;
  // inner gloss highlights preserved.
  {
    const x1 = 194, x2 = 771, y1 = 90, y2 = 420;
    const pad = 4;
    const cropX1 = Math.max(0, x1 - pad);
    const cropY1 = Math.max(0, y1 - pad);
    const cropX2 = Math.min(width - 1, x2 + pad);
    const cropY2 = Math.min(height - 1, y2 + pad);
    const cropW = cropX2 - cropX1 + 1;
    const cropH = cropY2 - cropY1 + 1;

    const buf = Buffer.alloc(cropW * cropH * 4);
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const srcIdx = ((cropY1 + cy) * width + (cropX1 + cx)) * channels;
        const dstIdx = (cy * cropW + cx) * 4;
        buf[dstIdx] = data[srcIdx];
        buf[dstIdx + 1] = data[srcIdx + 1];
        buf[dstIdx + 2] = data[srcIdx + 2];
        buf[dstIdx + 3] = 255;
      }
    }

    // Flood fill from borders for exterior background
    const visited = new Uint8Array(cropW * cropH);
    const queue = [];

    function isBgWhite(x, y) {
      const idx = (y * cropW + x) * 4;
      const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
      return r >= 238 && g >= 238 && b >= 238;
    }

    // Seed borders
    for (let x = 0; x < cropW; x++) {
      if (isBgWhite(x, 0) && !visited[0 * cropW + x]) { queue.push(x, 0); visited[0 * cropW + x] = 1; }
      if (isBgWhite(x, cropH - 1) && !visited[(cropH - 1) * cropW + x]) { queue.push(x, cropH - 1); visited[(cropH - 1) * cropW + x] = 1; }
    }
    for (let y = 0; y < cropH; y++) {
      if (isBgWhite(0, y) && !visited[y * cropW + 0]) { queue.push(0, y); visited[y * cropW + 0] = 1; }
      if (isBgWhite(cropW - 1, y) && !visited[y * cropW + (cropW - 1)]) { queue.push(cropW - 1, y); visited[y * cropW + (cropW - 1)] = 1; }
    }

    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      buf[(y * cropW + x) * 4 + 3] = 0;

      const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < cropW && ny >= 0 && ny < cropH) {
          const nIdx = ny * cropW + nx;
          if (!visited[nIdx] && isBgWhite(nx, ny)) {
            visited[nIdx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }

    // Anti-alias exterior edges
    for (let y = 1; y < cropH - 1; y++) {
      for (let x = 1; x < cropW - 1; x++) {
        const pos = y * cropW + x;
        if (visited[pos]) continue;
        const idx = pos * 4;
        const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
        const minVal = Math.min(r, g, b);
        if (minVal > 215) {
          const hasTransNeighbor =
            buf[((y - 1) * cropW + x) * 4 + 3] === 0 ||
            buf[((y + 1) * cropW + x) * 4 + 3] === 0 ||
            buf[(y * cropW + x - 1) * 4 + 3] === 0 ||
            buf[(y * cropW + x + 1) * 4 + 3] === 0;
          if (hasTransNeighbor) {
            buf[idx + 3] = Math.max(0, Math.min(255, Math.round(255 * (1 - (minVal - 215) / 40))));
          }
        }
      }
    }

    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).png().toFile(path.join(outDir, 'la3ib_logo.png'));
    await sharp(buf, { raw: { width: cropW, height: cropH, channels: 4 } }).webp({ quality: 95 }).toFile(path.join(outDir, 'la3ib_logo.webp'));
    console.log('✓ Extracted la3ib_logo (gloss highlights preserved, background transparent)');
  }

  console.log('\nAll 8 transparent sticker assets successfully extracted!');
}

extractAll().catch(err => {
  console.error(err);
  process.exit(1);
});
