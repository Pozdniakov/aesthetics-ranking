// Build public/logo.png from the latest source asset:
//   1. Read source PNG (assets/logo-v2.png by default, override with LOGO_SRC).
//   2. Find bounding box of bright pixels (the white "Æ" glyph).
//   3. Crop to a square around the glyph with padding.
//   4. Map dark background → transparent, white glyph → opaque white,
//      mid-tones → smooth alpha ramp for clean anti-aliased edges.
//   5. Write to public/logo.png.
import fs from "node:fs";
import path from "node:path";
import { PNG } from "pngjs";

const SRC = path.resolve(
  process.env.LOGO_SRC ??
    "/Users/ivan/.cursor/projects/Users-ivan-Claude-projects-ranking-aes/assets/logo-v2.png"
);
const OUT = path.resolve("public/logo-v2.png");

const BRIGHT_THRESHOLD = 180;
const PAD_RATIO = 0.12;

const buf = fs.readFileSync(SRC);
const src = PNG.sync.read(buf);
const { width: sw, height: sh, data: sd } = src;

let minX = sw;
let minY = sh;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < sh; y++) {
  for (let x = 0; x < sw; x++) {
    const i = (y * sw + x) * 4;
    const lum = (sd[i] + sd[i + 1] + sd[i + 2]) / 3;
    if (lum >= BRIGHT_THRESHOLD) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

if (maxX < 0) {
  throw new Error(`No bright pixels found in ${SRC}`);
}

const glyphW = maxX - minX + 1;
const glyphH = maxY - minY + 1;
const side = Math.max(glyphW, glyphH);
const pad = Math.round(side * PAD_RATIO);
const boxSide = side + pad * 2;

const cxGlyph = (minX + maxX) / 2;
const cyGlyph = (minY + maxY) / 2;

let cropX = Math.round(cxGlyph - boxSide / 2);
let cropY = Math.round(cyGlyph - boxSide / 2);
cropX = Math.max(0, Math.min(cropX, sw - boxSide));
cropY = Math.max(0, Math.min(cropY, sh - boxSide));
const cropSide = Math.min(boxSide, sw - cropX, sh - cropY);

const out = new PNG({ width: cropSide, height: cropSide });

for (let y = 0; y < cropSide; y++) {
  for (let x = 0; x < cropSide; x++) {
    const si = ((cropY + y) * sw + (cropX + x)) * 4;
    const di = (y * cropSide + x) * 4;
    const r = sd[si];
    const g = sd[si + 1];
    const b = sd[si + 2];
    const lum = (r + g + b) / 3;

    let a;
    if (lum <= 16) a = 0;
    else if (lum >= 200) a = 255;
    else a = Math.round(((lum - 16) / (200 - 16)) * 255);

    out.data[di] = 255;
    out.data[di + 1] = 255;
    out.data[di + 2] = 255;
    out.data[di + 3] = a;
  }
}

const outBuf = PNG.sync.write(out);
fs.writeFileSync(OUT, outBuf);
console.log(
  `Source: ${path.basename(SRC)} (${sw}×${sh})\n` +
    `Glyph bbox: ${glyphW}×${glyphH} at (${minX},${minY})\n` +
    `Cropped to ${cropSide}×${cropSide} at (${cropX},${cropY})\n` +
    `Wrote ${OUT} (${(outBuf.length / 1024).toFixed(0)} KB)`
);
