const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const dir = path.resolve(__dirname, '../public/assets/stickers');
const files = [
  'la3ib_logo.png',
  'coming_soon.png',
  'basketball.png',
  'football.png',
  'volleyball.png',
  'tennis_ball.png',
  'tennis_racket.png',
  'padel_racket.png'
];

async function check() {
  for (const f of files) {
    const p = path.join(dir, f);
    const { data, info } = await sharp(p).raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
    let nonZero = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const a = data[(y * info.width + x) * 4 + 3];
        if (a > 0) {
          nonZero++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    console.log(`${f}: ${info.width}x${info.height} (nonZero: ${nonZero}), content bounds: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);
  }
}
check().catch(console.error);
