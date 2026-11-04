const path = require('path');
const sharp = require('sharp');

async function analyze() {
  const inputPath = path.resolve(__dirname, '../public/assets/aistudio/Bubbly_Sports_Sticker_Sheet_0d209ad9.png');
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  // For basketball (x roughly 35..302, y roughly 500..900)
  // Let's print row alpha count for basketball column
  console.log('Basketball row counts:');
  for (let y = 450; y < 920; y += 10) {
    let count = 0;
    for (let x = 35; x <= 302; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) count++;
    }
    if (count > 0) console.log(`y=${y}: count=${count}`);
  }

  // Let's check where the basketball actually starts in Y
  let bMinY = 9999, bMaxY = 0, bMinX = 9999, bMaxX = 0;
  for (let y = 450; y < 940; y++) {
    for (let x = 35; x <= 302; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (y < bMinY) bMinY = y;
        if (y > bMaxY) bMaxY = y;
        if (x < bMinX) bMinX = x;
        if (x > bMaxX) bMaxX = x;
      }
    }
  }
  console.log(`Basketball exact bbox: x=[${bMinX}, ${bMaxX}], y=[${bMinY}, ${bMaxY}] (W=${bMaxX - bMinX + 1}, H=${bMaxY - bMinY + 1})`);
}

analyze().catch(console.error);
