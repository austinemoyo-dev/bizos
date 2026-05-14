#!/usr/bin/env node
/**
 * Generates PWA icons for BizOS.
 * Zero dependencies — uses only Node.js built-ins (zlib, fs, path).
 *
 * Run from bizos-frontend/:
 *   node scripts/generate-icons.js
 *
 * Output: public/icons/icon-192.png  and  public/icons/icon-512.png
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC-32 (required by PNG spec) ──────────────────────────────────────────
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
  CRC_TABLE[n] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG chunk builder ───────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crc]);
}

// ── PNG encoder ─────────────────────────────────────────────────────────────
function buildPNG(size, pixelFn) {
  // IHDR: width, height, bit-depth=8, color-type=2 (RGB), compression/filter/interlace=0
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2;

  // Raw image: each row = filter-byte(0) + size*3 RGB bytes
  const raw = Buffer.allocUnsafe((1 + size * 3) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 3);
    raw[row] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelFn(x, y, size);
      const i = row + 1 + x * 3;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── BizOS icon pixel function ───────────────────────────────────────────────
// Dark navy background (#0D0F1A) with an indigo (#6366F1) block "B"
function bizosPixel(x, y, size) {
  const lx = x / size; // 0..1
  const ly = y / size; // 0..1

  // "B" geometry (all in 0..1 space)
  const inB = (
    // Left vertical stem
    (lx >= 0.15 && lx < 0.33 && ly >= 0.10 && ly <= 0.90) ||
    // Top horizontal cap
    (lx >= 0.15 && lx < 0.78 && ly >= 0.10 && ly < 0.22) ||
    // Middle horizontal bar
    (lx >= 0.15 && lx < 0.72 && ly >= 0.46 && ly < 0.56) ||
    // Bottom horizontal cap
    (lx >= 0.15 && lx < 0.82 && ly >= 0.79 && ly <= 0.90) ||
    // Top-right vertical wall (upper bump)
    (lx >= 0.68 && lx < 0.78 && ly >= 0.22 && ly < 0.46) ||
    // Bottom-right vertical wall (lower bump, wider)
    (lx >= 0.72 && lx < 0.82 && ly >= 0.56 && ly < 0.79)
  );

  return inB ? [99, 102, 241] : [13, 15, 26]; // #6366F1 : #0D0F1A
}

// ── Write files ─────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const file = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(file, buildPNG(size, bizosPixel));
  console.log(`  created  ${path.relative(process.cwd(), file)}  (${size}x${size})`);
}

console.log('\nDone. Run: git add public/icons && git push');
