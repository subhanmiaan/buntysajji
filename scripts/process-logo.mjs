import sharp from 'sharp';

async function processLogo() {
  const inputPath = 'C:/Users/MMP/.gemini/antigravity/brain/c4cc6aac-d6d8-4ee6-b445-f17622418c97/.user_uploaded/media_1791298564278.png';
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  
  // Flood fill / BFS from (0,0) and the 4 corners to find background pixels
  const bgVisited = new Uint8Array(width * height);
  const queue = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  for (const [x, y] of queue) bgVisited[y * width + x] = 1;
  
  let head = 0;
  const isBgColor = (r, g, b) => {
    // Check if close to grey (96,96,96)
    return Math.abs(r - 96) < 18 && Math.abs(g - 96) < 18 && Math.abs(b - 96) < 18;
  };

  while (head < queue.length) {
    const [cx, cy] = queue[head++];
    const idx = (cy * width + cx) * 4;
    // Set alpha to 0 for background
    data[idx + 3] = 0;

    const neighbors = [
      [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdxPos = ny * width + nx;
        if (!bgVisited[nIdxPos]) {
          const nIdx = nIdxPos * 4;
          const nr = data[nIdx];
          const ng = data[nIdx + 1];
          const nb = data[nIdx + 2];
          if (isBgColor(nr, ng, nb)) {
            bgVisited[nIdxPos] = 1;
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  // Save as high-res PNG and also square JPG with transparent or clean background
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png()
    .toFile('assets/logo.png');

  // Also create square assets/logo.jpg with white/warm cream background for backward compatibility
  await sharp(data, { raw: { width, height, channels: 4 } })
    .flatten({ background: '#FFF8E9' })
    .jpeg({ quality: 95 })
    .toFile('assets/logo.jpg');

  console.log('Logo processed successfully!');
}

processLogo().catch(console.error);
