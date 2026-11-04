const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function inspect() {
  const inputPath = path.resolve(__dirname, '../public/assets/aistudio/Bubbly_Sports_Sticker_Sheet_0d209ad9.png');
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  console.log(`Dimensions: ${width}x${height}, channels: ${channels}`);

  // Find overall non-zero alpha bounding box
  let minX = width, maxX = 0, minY = height, maxY = 0;
  let nonZeroCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + 3];
      if (a > 10) {
        nonZeroCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  console.log(`Non-zero alpha pixels: ${nonZeroCount}`);
  console.log(`Global bbox: x=[${minX}, ${maxX}], y=[${minY}, ${maxY}]`);

  // Let's compute column alpha profile for top row (say y 50..450) and bottom row (y 500..900)
  const topColCount = new Array(width).fill(0);
  for (let y = 50; y < 460; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 10) {
        topColCount[x]++;
      }
    }
  }

  const bottomColCount = new Array(width).fill(0);
  for (let y = 490; y < 900; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * channels + 3] > 10) {
        bottomColCount[x]++;
      }
    }
  }

  // Find intervals of non-zero in top row
  function getIntervals(arr, minThreshold = 2) {
    const intervals = [];
    let inSeg = false;
    let start = 0;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > minThreshold && !inSeg) {
        inSeg = true;
        start = i;
      } else if (arr[i] <= minThreshold && inSeg) {
        inSeg = false;
        intervals.push([start, i - 1]);
      }
    }
    if (inSeg) intervals.push([start, arr.length - 1]);
    return intervals;
  }

  console.log('Top row clusters (X intervals):', getIntervals(topColCount));
  console.log('Bottom row clusters (X intervals):', getIntervals(bottomColCount));
}

inspect().catch(console.error);
