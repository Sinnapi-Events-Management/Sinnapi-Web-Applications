#!/usr/bin/env node
/**
 * Regenerate `supabase/functions/_shared/logo.ts` from the canonical brand mark
 * at `apps/web-public/public/logo.png`. Run this whenever the logo changes:
 *
 *   yarn email:logo
 *
 * Why the asset is embedded at all: emails attach the logo inline by Content-ID
 * rather than hot-linking it, because Outlook and most corporate gateways block
 * remote images by default, which would leave every email logo-less.
 *
 * Why it is reprocessed: the source is a 626x399, 90 KB full-colour PNG, and
 * that rides along with *every* send. The mark is flat two-tone artwork, so
 * downscaling to 2x display size and requantizing to an indexed palette is
 * visually lossless and lands at ~9 KB.
 *
 * Implemented against `node:zlib` only — no image dependency to install, and
 * nothing to keep in sync with a native binary.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { inflateSync, deflateSync } from 'node:zlib';

// `zlib.crc32` only landed in Node 22 and this repo targets >=18, so compute it
// here. Standard PNG/zlib CRC-32 (reversed polynomial 0xEDB88320).
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = resolve(ROOT, 'apps/web-public/public/logo.png');
const TARGET = resolve(ROOT, 'supabase/functions/_shared/logo.ts');

/** Rendered width in the email masthead; the asset is encoded at 2x for retina. */
const DISPLAY_WIDTH = 168;
const ENCODE_WIDTH = 400;
const MAX_COLORS = 64;

// ── PNG read ───────────────────────────────────────────────────────────────

function readPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  let pos = 8;
  let ihdr = null;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const body = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      ihdr = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        interlace: body[12],
      };
    } else if (type === 'IDAT') {
      idat.push(body);
    }
    pos += 12 + len;
  }
  return { ihdr, data: inflateSync(Buffer.concat(idat)) };
}

/** Undo per-scanline PNG filtering (spec §9.2) to get raw RGBA samples. */
function unfilter(raw, width, height, bpp) {
  const stride = width * bpp;
  const out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const type = raw[pos++];
    const line = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let add = 0;
      if (type === 1) add = a;
      else if (type === 2) add = b;
      else if (type === 3) add = (a + b) >> 1;
      else if (type === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        add = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      line[i] = (line[i] + add) & 0xff;
    }
    line.copy(out, y * stride);
    prev = line;
  }
  return out;
}

// ── PNG write (8-bit indexed + tRNS) ───────────────────────────────────────

function chunk(type, body) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const typed = Buffer.concat([head.subarray(4), body]);
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(typed) >>> 0, 0);
  return Buffer.concat([head, body, tail]);
}

function writeIndexedPng(width, height, indices, palette) {
  const rows = Buffer.alloc(height * (width + 1));
  for (let y = 0; y < height; y++) {
    rows[y * (width + 1)] = 0; // filter: none — indexed data filters poorly
    indices.copy(rows, y * (width + 1) + 1, y * width, (y + 1) * width);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // colour type: indexed
  const plte = Buffer.from(palette.flatMap((c) => [c[0], c[1], c[2]]));
  let trns = Buffer.from(palette.map((c) => c[3]));
  while (trns.length && trns[trns.length - 1] === 255) trns = trns.subarray(0, -1);

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    ...(trns.length ? [chunk('tRNS', trns)] : []),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Quantize ───────────────────────────────────────────────────────────────

function quantize(px, width, height) {
  // Snap near-transparent pixels fully clear and drop two bits of colour
  // precision, collapsing antialiasing noise into a handful of real colours.
  const counts = new Map();
  const snapped = Buffer.alloc(px.length);
  for (let i = 0; i < px.length; i += 4) {
    let [r, g, b, a] = [px[i], px[i + 1], px[i + 2], px[i + 3]];
    if (a < 16) r = g = b = a = 0;
    else if (a > 239) a = 255;
    r = (r >> 2) << 2;
    g = (g >> 2) << 2;
    b = (b >> 2) << 2;
    if (a !== 255) a = (a >> 3) << 3;
    snapped[i] = r;
    snapped[i + 1] = g;
    snapped[i + 2] = b;
    snapped[i + 3] = a;
    const key = (r << 24) | (g << 16) | (b << 8) | a;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const palette = [...counts.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, MAX_COLORS)
    .map(([key]) => [(key >>> 24) & 0xff, (key >>> 16) & 0xff, (key >>> 8) & 0xff, key & 0xff]);

  const exact = new Map(
    palette.map((c, i) => [(c[0] << 24) | (c[1] << 16) | (c[2] << 8) | c[3], i]),
  );
  const cache = new Map();
  const indices = Buffer.alloc(width * height);

  for (let p = 0; p < width * height; p++) {
    const i = p * 4;
    const key =
      (snapped[i] << 24) | (snapped[i + 1] << 16) | (snapped[i + 2] << 8) | snapped[i + 3];
    let idx = exact.get(key);
    if (idx === undefined) idx = cache.get(key);
    if (idx === undefined) {
      let best = 0;
      let bestD = Infinity;
      for (let j = 0; j < palette.length; j++) {
        const [pr, pg, pb, pa] = palette[j];
        // Weight alpha heavily: mixing an opaque colour into a transparent
        // region is far more visible than a small hue shift.
        const d =
          (pr - snapped[i]) ** 2 +
          (pg - snapped[i + 1]) ** 2 +
          (pb - snapped[i + 2]) ** 2 +
          3 * (pa - snapped[i + 3]) ** 2;
        if (d < bestD) {
          bestD = d;
          best = j;
        }
      }
      idx = best;
      cache.set(key, idx);
    }
    indices[p] = idx;
  }

  return { indices, palette, distinct: counts.size };
}

// ── Main ───────────────────────────────────────────────────────────────────

const originalFile = readFileSync(SOURCE);
const originalBytes = originalFile.length;
const original = readPng(originalFile).ihdr;

// macOS ships `sips`; it is the only external tool used, and only for the
// downscale. Swap in any resizer if this ever needs to run on Linux CI.
const tmp = resolve(ROOT, '.email-logo-tmp.png');
execFileSync('sips', ['-Z', String(ENCODE_WIDTH), SOURCE, '--out', tmp], { stdio: 'ignore' });

const { ihdr, data } = readPng(readFileSync(tmp));
if (ihdr.depth !== 8 || ihdr.colorType !== 6) {
  throw new Error(
    `expected 8-bit RGBA after resize, got depth=${ihdr.depth} type=${ihdr.colorType}`,
  );
}
if (ihdr.interlace) throw new Error('interlaced PNG is not supported');

const px = unfilter(data, ihdr.width, ihdr.height, 4);
const { indices, palette, distinct } = quantize(px, ihdr.width, ihdr.height);
const png = writeIndexedPng(ihdr.width, ihdr.height, indices, palette);
execFileSync('rm', ['-f', tmp]);

const b64 = png.toString('base64');
const lines = (b64.match(/.{1,96}/g) ?? []).map((l) => `  '${l}' +`);
lines[lines.length - 1] = lines[lines.length - 1].replace(/ \+$/, ';');

const out = `// Sinnapi wordmark, embedded as base64 so transactional emails can attach it
// inline (Content-ID) instead of hot-linking a remote image. Inline attachments
// always render — remote images are blocked by default in Outlook and by many
// corporate gateways, which would leave every email logo-less.
//
// Source:  apps/web-public/public/logo.png (${original.width}x${original.height}, ${Math.round(originalBytes / 1024)} KB)
// Encoded: downscaled to ${ihdr.width}x${ihdr.height} (displayed at ${DISPLAY_WIDTH}px, so 2x for
//          retina) and requantized from ${distinct} colours to a ${palette.length}-colour indexed
//          palette with alpha -> ${(png.length / 1024).toFixed(1)} KB.
//
// GENERATED FILE — do not edit by hand. Regenerate with: yarn email:logo
// (see scripts/build-email-logo.mjs) whenever the brand mark changes.

/** Content-ID referenced by <img src="cid:..."> in the email shell. */
export const LOGO_CID = 'sinnapi-logo';

/** Intrinsic size of the encoded asset; rendered at ${DISPLAY_WIDTH}px wide. */
export const LOGO_WIDTH = ${ihdr.width};
export const LOGO_HEIGHT = ${ihdr.height};

/** Base64-encoded PNG bytes of the Sinnapi wordmark. */
export const LOGO_PNG_BASE64 =
${lines.join('\n')}
`;

writeFileSync(TARGET, out);

console.log(`${relative(ROOT, SOURCE)}  ${(originalBytes / 1024).toFixed(1)} KB`);
console.log(`  -> ${ihdr.width}x${ihdr.height}, ${distinct} colours reduced to ${palette.length}`);
console.log(
  `  -> ${relative(ROOT, TARGET)}  ${(png.length / 1024).toFixed(1)} KB PNG (${(b64.length / 1024).toFixed(1)} KB base64)`,
);
