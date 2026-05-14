#!/usr/bin/env node
/**
 * Generates PWA icons for BizOS — Dash & Co.
 * Zero dependencies: uses only Node.js built-ins (zlib, fs, path).
 *
 * Run from bizos-frontend/:
 *   node scripts/generate-icons.js
 *
 * Output:
 *   public/icons/icon-192.png        (Android / manifest)
 *   public/icons/icon-512.png        (Android / manifest)
 *   public/icons/apple-touch-icon.png  (iOS 180×180)
 */

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

// ── CRC-32 ─────────────────────────────────────────────────────────────────
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

// ── PNG chunk ───────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(d.length);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([len, t, d, crc]);
}

// ── PNG encoder (RGBA) ──────────────────────────────────────────────────────
function buildPNG(size, pixelFn) {
  // IHDR: RGBA (color-type 6, 8-bit)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // color type: RGBA

  const raw = Buffer.allocUnsafe((1 + size * 4) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (1 + size * 4);
    raw[row] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      const i = row + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Anti-aliasing helper ────────────────────────────────────────────────────
function aa(dist, radius) {
  // Returns 0-1 alpha: 1 = fully inside, 0 = fully outside, smooth at edge
  return Math.max(0, Math.min(1, (radius - dist) / Math.max(radius * 0.015, 1)));
}

// ── BizOS brand pixel function ─────────────────────────────────────────────
// Brand:
//   Background: #0C0D0F  (dark)
//   Accent:     #C8102E  (crimson red)
//   Logo mark:  three speed-lines left + "d" letter right
//
// The logo replicates the SVG in LogoMark.tsx (32×32 viewBox):
//   Speed lines:  <rect x="1" y="8"    width="10" height="3" rx="1.5" />
//                 <rect x="1" y="14.5" width="7"  height="3" rx="1.5" />
//                 <rect x="1" y="21"   width="10" height="3" rx="1.5" />
//   D letter:     <path d="M14 4 L14 28 L20.5 28 C26 28 30 23.5 30 16
//                           C30 8.5 26 4 20.5 4 Z" />
function bizosPixel(px, py, size) {
  // Normalise to 32×32 logo space, centred + padded 14% each side
  const pad = 0.14;
  const scale = 32 / (size * (1 - 2 * pad));
  const lx = (px / size - pad) * 32 / (1 - 2 * pad);  // 0..32
  const ly = (py / size - pad) * 32 / (1 - 2 * pad);

  // ── Rounded-square background ──────────────────────────────────────────
  const bgR = size * 0.22;      // corner radius in screen px
  const cx  = size / 2;
  const cy  = size / 2;
  const cdx = Math.max(Math.abs(px - cx) - (cx - bgR), 0);
  const cdy = Math.max(Math.abs(py - cy) - (cy - bgR), 0);
  const bgAlpha = aa(Math.sqrt(cdx * cdx + cdy * cdy), bgR);

  const BG = [12, 13, 15];     // #0C0D0F
  const AC = [200, 16, 46];    // #C8102E

  // ── Rounded-rect helper (SVG rect in 32-coord space) ──────────────────
  function inRRect(x0, y0, w, h, rx) {
    // Distance from the rounded rect
    const rx2 = Math.min(rx, w / 2, h / 2);
    const nx = Math.max(x0 + rx2 - lx, 0, lx - (x0 + w - rx2));
    const ny = Math.max(y0 + rx2 - ly, 0, ly - (y0 + h - rx2));
    const dist = Math.sqrt(nx * nx + ny * ny);
    // scale factor: aa in "32-coord" units → convert to px: 1 unit = size/32 px
    const pxPerUnit = size / 32;
    return aa(dist, rx2) * (lx >= x0 && lx <= x0 + w && ly >= y0 && ly <= y0 + h ? 1 : aa(dist * pxPerUnit, rx2 * pxPerUnit));
  }

  // Simpler: just check inside and blend at edges in logo-space
  function solidRect(x0, y0, w, h, rx) {
    const rx2 = Math.min(rx, w / 2, h / 2);
    const nx = Math.max(x0 + rx2 - lx, 0, lx - (x0 + w - rx2));
    const ny = Math.max(y0 + rx2 - ly, 0, ly - (y0 + h - rx2));
    const dist = Math.sqrt(nx * nx + ny * ny);
    const pxPerUnit = size / 32;
    return dist <= rx2 ? 1 : aa(dist * pxPerUnit - rx2 * pxPerUnit + 0.5, 0.5);
  }

  // ── Speed lines (3 horizontal bars, x1 y8 w10 h3 rx1.5) ────────────────
  const sl1 = solidRect(1, 8,    10, 3, 1.5);
  const sl2 = solidRect(1, 14.5,  7, 3, 1.5);
  const sl3 = solidRect(1, 21,   10, 3, 1.5);
  const speedAlpha = Math.min(1, sl1 + sl2 + sl3);

  // ── D letter ────────────────────────────────────────────────────────────
  // M14 4  L14 28  L20.5 28  C26 28 30 23.5 30 16  C30 8.5 26 4 20.5 4  Z
  // Decompose: vertical stem (x≥14) + right half-ellipse
  // The D fills: lx ∈ [14,30], ly ∈ [4,28]
  // Right boundary is the cubic bezier curve → approximate with an ellipse:
  //   centre (14, 16), semi-axes a=16 (horiz) b=12 (vert)
  //   but only the RIGHT half (lx >= 14)
  let dAlpha = 0;
  if (lx >= 14 && ly >= 4 && ly <= 28) {
    // Ellipse: ((lx-14)/16)² + ((ly-16)/12)² <= 1
    const ex = (lx - 14) / 16;
    const ey = (ly - 16) / 12;
    const distEllipse = Math.sqrt(ex * ex + ey * ey);
    // Anti-alias at the ellipse boundary (1 px in logo units ≈ size/32 screen px)
    const pxPerUnit = size / 32;
    if (distEllipse < 1) {
      dAlpha = aa((distEllipse - 1) * 16 * pxPerUnit, 0.6);  // smooth outer edge
      dAlpha = Math.max(dAlpha, distEllipse < 0.97 ? 1 : 0);
    }
    dAlpha = distEllipse <= 1 ? 1 : aa((distEllipse - 1) * 16 * pxPerUnit, 0.8);
  }

  const logoAlpha = Math.min(1, speedAlpha + dAlpha);

  // ── Composite ────────────────────────────────────────────────────────────
  // Only render if inside the background rounded square
  if (bgAlpha <= 0) return [0, 0, 0, 0]; // fully transparent outside

  const r = Math.round(BG[0] + (AC[0] - BG[0]) * logoAlpha);
  const g = Math.round(BG[1] + (AC[1] - BG[1]) * logoAlpha);
  const b = Math.round(BG[2] + (AC[2] - BG[2]) * logoAlpha);
  const a = Math.round(bgAlpha * 255);

  return [r, g, b, a];
}

// ── Write files ─────────────────────────────────────────────────────────────
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

const SIZES = [
  { name: 'icon-192.png',        size: 192 },
  { name: 'icon-512.png',        size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

for (const { name, size } of SIZES) {
  const file = path.join(outDir, name);
  fs.writeFileSync(file, buildPNG(size, bizosPixel));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`  ✓  ${name.padEnd(26)}  ${size}×${size}  (${kb} KB)`);
}

console.log('\nAll icons generated. Re-run after logo changes.');
