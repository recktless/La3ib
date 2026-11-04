const path = require('path');
const sharp = require('sharp');

async function testAlphas() {
  const inputPath = path.resolve(__dirname, '../public/assets/aistudio/Bubbly_Sports_Sticker_Sheet_0d209ad9.png');
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  for (let y = 490; y < 575; y++) {
    for (let x = 30; x <= 310; x++) {
      const a = data[(y * width + x) * 4 + 3];
      if (a > 0) {
        console.log(`y=${y}, x=${x}, a=${a}, rgb=(${data[(y*width+x)*4]}, ${data[(y*width+x)*4+1]}, ${data[(y*width+x)*4+2]})`);
        return;
      }
    }
  }
}
testAlphas().catch(console.error);
