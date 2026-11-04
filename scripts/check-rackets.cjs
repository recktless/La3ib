const path = require('path');
const sharp = require('sharp');

async function checkRackets() {
  const inputPath = path.resolve(__dirname, '../public/assets/aistudio/Bubbly_Sports_Sticker_Sheet_0d209ad9.png');
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width } = info;

  for (let y = 470; y < 535; y++) {
    for (let x = 1110; x <= 1630; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 15) {
        console.log(`Racket pixel at y=${y}, x=${x}, a=${a}`);
        return;
      }
    }
  }
}
checkRackets().catch(console.error);
