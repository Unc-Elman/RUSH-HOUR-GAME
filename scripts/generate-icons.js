/**
 * Generates simple PNG app icons without external dependencies.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(size) {
  const width = size;
  const height = size;
  // RGBA raw rows with filter byte
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const row = y * rowSize;
    raw[row] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const i = row + 1 + x * 4;
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;
      const dist = Math.sqrt(nx * nx + ny * ny);

      // Dark navy background circle
      if (dist > 0.96) {
        raw[i] = 0;
        raw[i + 1] = 0;
        raw[i + 2] = 0;
        raw[i + 3] = 0;
        continue;
      }

      // Background gradient
      const gy = y / height;
      raw[i] = Math.floor(10 + gy * 20);
      raw[i + 1] = Math.floor(14 + gy * 30);
      raw[i + 2] = Math.floor(30 + gy * 40);
      raw[i + 3] = 255;

      // Road stripe at bottom
      if (y > height * 0.72 && y < height * 0.78) {
        const dash = Math.floor(x / (size * 0.08)) % 2;
        if (dash === 0) {
          raw[i] = 255;
          raw[i + 1] = 210;
          raw[i + 2] = 100;
        }
      }

      // Runner body (blue) left-center
      const px = x / width;
      const py = y / height;
      if (px > 0.32 && px < 0.48 && py > 0.38 && py < 0.68) {
        raw[i] = 43;
        raw[i + 1] = 108;
        raw[i + 2] = 176;
      }
      // Head
      const hx = (px - 0.4) * size;
      const hy = (py - 0.32) * size;
      if (hx * hx + hy * hy < (size * 0.07) ** 2) {
        raw[i] = 232;
        raw[i + 1] = 196;
        raw[i + 2] = 162;
      }

      // Cop (dark blue) further left
      if (px > 0.12 && px < 0.26 && py > 0.36 && py < 0.68) {
        raw[i] = 30;
        raw[i + 1] = 58;
        raw[i + 2] = 95;
      }
      const cx = (px - 0.19) * size;
      const cy = (py - 0.3) * size;
      if (cx * cx + cy * cy < (size * 0.065) ** 2) {
        raw[i] = 232;
        raw[i + 1] = 196;
        raw[i + 2] = 162;
      }
      // Siren flash
      if (px > 0.16 && px < 0.22 && py > 0.22 && py < 0.28) {
        raw[i] = 255;
        raw[i + 1] = 60;
        raw[i + 2] = 60;
      }

      // Gold coin right
      const cox = (px - 0.72) * size;
      const coy = (py - 0.42) * size;
      if (cox * cox + coy * coy < (size * 0.1) ** 2) {
        raw[i] = 255;
        raw[i + 1] = 213;
        raw[i + 2] = 106;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'www', 'icons');
fs.mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, createPng(size));
  console.log('Wrote', file);
}
