const path = require('path');
const sharp = require('sharp');

async function findTrueBounds() {
  const inputPath = path.resolve(__dirname, '../public/assets/aistudio/Bubbly_Sports_Sticker_Sheet_0d209ad9.png');
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const items = [
    { name: 'la3ib_logo', xRange: [180, 800], yRange: [30, 480] },
    { name: 'coming_soon', xRange: [850, 1550], yRange: [30, 480] },
    { name: 'basketball', xRange: [30, 310], yRange: [460, 910] },
    { name: 'football', xRange: [330, 600], yRange: [460, 910] },
    { name: 'volleyball', xRange: [610, 890], yRange: [460, 910] },
    { name: 'tennis_ball', xRange: [910, 1090], yRange: [460, 910] },
    { name: 'tennis_racket', xRange: [1110, 1340], yRange: [460, 910] },
    { name: 'padel_racket', xRange: [1350, 1630], yRange: [460, 910] },
  ];

  for (const item of items) {
    let minX = width, maxX = 0, minY = height, maxY = 0;
    let pixelCount = 0;

    for (let y = item.yRange[0]; y <= item.yRange[1]; y++) {
      for (let x = item.xRange[0]; x <= item.xRange[1]; x++) {
        const a = data[(y * width + x) * channels + 3];
        if (a > 15) {
          pixelCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    console.log(`{ name: '${item.name}', bbox: [${minX}, ${minY}, ${maxX}, ${maxY}] }, // size: ${maxX - minX + 1}x${maxY - minY + 1}`);
  }
}

findTrueBounds().catch(console.error);
