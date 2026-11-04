const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.resolve(__dirname, '../public/assets/stickers');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function extractItems() {
  const inputPath = path.resolve(__dirname, '../public/assets/aistudio/La3ib_Sports_Sticker_Sheet_bff0899a.png');
  const { data, info } = await sharp(inputPath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  const items = [
    { name: 'la3ib_logo', x1: 194, y1: 90, x2: 772, y2: 420 },
    { name: 'coming_soon', x1: 876, y1: 90, x2: 1512, y2: 420 },
    { name: 'basketball', x1: 36, y1: 516, x2: 302, y2: 874 },
    { name: 'football', x1: 337, y1: 516, x2: 587, y2: 874 },
    { name: 'volleyball', x1: 625, y1: 516, x2: 881, y2: 874 },
    { name: 'tennis_ball', x1: 923, y1: 516, x2: 1075, y2: 874 },
    { name: 'tennis_racket', x1: 1123, y1: 516, x2: 1323, y2: 874 },
    { name: 'padel_racket', x1: 1361, y1: 516, x2: 1621, y2: 874 },
  ];

  for (const item of items) {
    // 1. Refine exact Y bounds for this specific X range
    let minY = height, maxY = 0;
    for (let y = item.y1; y <= item.y2; y++) {
      for (let x = item.x1; x <= item.x2; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r < 240 || g < 240 || b < 240) {
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Refine exact X bounds
    let minX = width, maxX = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = item.x1; x <= item.x2; x++) {
        const idx = (y * width + x) * channels;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        if (r < 240 || g < 240 || b < 240) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }

    // Pad by 6px
    const pad = 6;
    const cropX1 = Math.max(0, minX - pad);
    const cropY1 = Math.max(0, minY - pad);
    const cropX2 = Math.min(width - 1, maxX + pad);
    const cropY2 = Math.min(height - 1, maxY + pad);
    const cropW = cropX2 - cropX1 + 1;
    const cropH = cropY2 - cropY1 + 1;

    console.log(`Processing: ${item.name} (${cropW}x${cropH})`);

    // Extract crop buffer with RGBA
    const cropBuf = Buffer.alloc(cropW * cropH * 4);
    for (let cy = 0; cy < cropH; cy++) {
      for (let cx = 0; cx < cropW; cx++) {
        const srcX = cropX1 + cx;
        const srcY = cropY1 + cy;
        const srcIdx = (srcY * width + srcX) * channels;
        const dstIdx = (cy * cropW + cx) * 4;
        cropBuf[dstIdx] = data[srcIdx];
        cropBuf[dstIdx + 1] = data[srcIdx + 1];
        cropBuf[dstIdx + 2] = data[srcIdx + 2];
        cropBuf[dstIdx + 3] = 255;
      }
    }

    // Flood fill from all perimeter pixels that are near white
    const visited = new Uint8Array(cropW * cropH);
    const queue = [];

    function isWhite(x, y) {
      const idx = (y * cropW + x) * 4;
      const r = cropBuf[idx], g = cropBuf[idx + 1], b = cropBuf[idx + 2];
      return r >= 240 && g >= 240 && b >= 240;
    }

    // Seed borders
    for (let x = 0; x < cropW; x++) {
      if (isWhite(x, 0) && !visited[0 * cropW + x]) {
        queue.push(x, 0);
        visited[0 * cropW + x] = 1;
      }
      if (isWhite(x, cropH - 1) && !visited[(cropH - 1) * cropW + x]) {
        queue.push(x, cropH - 1);
        visited[(cropH - 1) * cropW + x] = 1;
      }
    }
    for (let y = 0; y < cropH; y++) {
      if (isWhite(0, y) && !visited[y * cropW + 0]) {
        queue.push(0, y);
        visited[y * cropW + 0] = 1;
      }
      if (isWhite(cropW - 1, y) && !visited[y * cropW + (cropW - 1)]) {
        queue.push(cropW - 1, y);
        visited[y * cropW + (cropW - 1)] = 1;
      }
    }

    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];

      // Make transparent
      const idx = (y * cropW + x) * 4;
      cropBuf[idx + 3] = 0;

      // 4-way neighbors
      const neighbors = [
        [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < cropW && ny >= 0 && ny < cropH) {
          const nPos = ny * cropW + nx;
          if (!visited[nPos] && isWhite(nx, ny)) {
            visited[nPos] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }

    // Edge anti-aliasing: smooth semi-white fringe touching transparent outer pixels
    for (let y = 1; y < cropH - 1; y++) {
      for (let x = 1; x < cropW - 1; x++) {
        const pos = y * cropW + x;
        if (visited[pos]) continue;
        const idx = pos * 4;
        const r = cropBuf[idx], g = cropBuf[idx + 1], b = cropBuf[idx + 2];
        const minVal = Math.min(r, g, b);
        if (minVal > 225) {
          // Check if any neighbor is transparent
          const hasTransNeighbor =
            cropBuf[((y - 1) * cropW + x) * 4 + 3] === 0 ||
            cropBuf[((y + 1) * cropW + x) * 4 + 3] === 0 ||
            cropBuf[(y * cropW + x - 1) * 4 + 3] === 0 ||
            cropBuf[(y * cropW + x + 1) * 4 + 3] === 0;
          if (hasTransNeighbor) {
            const alpha = Math.max(0, Math.min(255, Math.round(255 * (1 - (minVal - 225) / 30))));
            cropBuf[idx + 3] = alpha;
          }
        }
      }
    }

    // Save PNG and WebP
    const outPng = path.join(outDir, `${item.name}.png`);
    const outWebp = path.join(outDir, `${item.name}.webp`);

    await sharp(cropBuf, { raw: { width: cropW, height: cropH, channels: 4 } })
      .png()
      .toFile(outPng);

    await sharp(cropBuf, { raw: { width: cropW, height: cropH, channels: 4 } })
      .webp({ quality: 95 })
      .toFile(outWebp);

    console.log(`Saved: ${item.name}.png and ${item.name}.webp`);
  }
  console.log('All 8 sticker assets successfully extracted with clean transparency!');
}

extractItems().catch(err => {
  console.error(err);
  process.exit(1);
});
