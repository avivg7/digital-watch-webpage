// Builds the ONLY image files that are published (public/img). Originals live in assets/ (git-ignored) and are never copied as-is.
//   - every output is resized and re-encoded: metadata (EXIF, GPS, camera, software) is not carried over (sharp drops it unless asked)
//   - main.png: the one clearly visible face (a person in the demo session) is obscured in the public copy; see docs/RIGHTS_AND_PUBLICATION_GATE.md
// Usage: npm run assets   (needs the owner's originals in ./assets; the committed outputs are what CI builds from)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'assets', 'images');
const OUT = path.join(ROOT, 'public', 'img');
fs.mkdirSync(OUT, { recursive: true });

// order = the order of the gallery; the first one is the default stage image
const GALLERY = [
  { id: 'room', file: 'main.png', redact: [{ x: 525, y: 115, w: 280, h: 290 }] },
  { id: 'overview', file: 'Screenshot 2026-11-02 at 22.02.35.png' },
  { id: 'availability', file: 'Screenshot 2026-11-02 at 21.59.09.png' },
  { id: 'shifts', file: 'Screenshot 2026-11-02 at 22.00.25.png' },
  { id: 'training', file: 'Screenshot 2026-11-02 at 22.01.37.png' },
  { id: 'preflight', file: 'Screenshot 2026-11-02 at 22.03.26.png' },
];

async function redacted(input, regions) {
  const img = sharp(input);
  const { width, height } = await img.metadata();
  const base = await img.toBuffer();
  const layers = [];
  for (const r of regions) {
    // a heavy blur of the region, feathered with an ellipse mask so no hard rectangle shows
    const patch = await sharp(base).extract({ left: r.x, top: r.y, width: r.w, height: r.h }).blur(26).toBuffer();
    const mask = Buffer.from(
      `<svg width="${r.w}" height="${r.h}"><defs><radialGradient id="g"><stop offset="0.7" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
    );
    const masked = await sharp(patch)
      .composite([{ input: await sharp(mask).png().toBuffer(), blend: 'dest-in' }])
      .png()
      .toBuffer();
    layers.push({ input: masked, left: r.x, top: r.y });
  }
  return { buf: await sharp(base).composite(layers).png().toBuffer(), width, height };
}

async function emit(input, name, widths, { avif = true, webp = true, quality = 86 } = {}) {
  const meta = await sharp(input).metadata();
  for (const w of widths) {
    const width = Math.min(w, meta.width);
    const pipe = () => sharp(input).resize({ width, withoutEnlargement: true });
    if (webp)
      await pipe()
        .webp({ quality, effort: 5 })
        .toFile(path.join(OUT, `${name}-${w}.webp`));
    if (avif)
      await pipe()
        .avif({ quality: Math.max(50, quality - 20), effort: 4 })
        .toFile(path.join(OUT, `${name}-${w}.avif`));
  }
  return { width: meta.width, height: meta.height };
}

const manifest = { gallery: [], portraits: {} };

for (const g of GALLERY) {
  const p = path.join(SRC, 'app_photo', g.file);
  if (!fs.existsSync(p)) throw new Error(`missing gallery source: ${g.file}`);
  let input = p;
  if (g.redact) input = (await redacted(p, g.redact)).buf;
  const dim = await emit(input, `gallery-${g.id}`, [640, 1200, 1920], { quality: 88 });
  manifest.gallery.push({ id: g.id, ...dim });
}

// portraits (square). Sizes are small: they are displayed at most ~420 px wide.
for (const [id, file, widths] of [
  ['omri', 'omri_rols_pic.png', [400, 800]],
  ['aviv', 'aviv_german_pic.jpeg', [400, 483]],
]) {
  const p = path.join(SRC, file);
  if (!fs.existsSync(p)) throw new Error(`missing portrait source: ${file}`);
  const dim = await emit(p, `portrait-${id}`, widths, { quality: 84 });
  manifest.portraits[id] = dim;
}

// CIC logo: the source is AVIF data with a .png name; re-encoded as real PNG + WebP (keeps transparency)
const cic = path.join(SRC, 'israelcic_logo.png');
await sharp(cic).resize({ width: 600 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'cic-logo.png'));
await sharp(cic).resize({ width: 600 }).webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(OUT, 'cic-logo.webp'));

// The emblem file has an opaque white backing. For use on dark backgrounds the OUTER white region is made transparent (flood fill from the border, so the white shield inside the star is untouched),
// with a soft edge so no white fringe remains.
async function keyOutWhiteBackground(file, size) {
  const { data, info } = await sharp(file).resize({ width: size }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const bg = new Uint8Array(W * H);
  const isWhite = (i) => Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) >= 238;
  const stack = [];
  const push = (x, y) => {
    const i = y * W + x;
    if (x >= 0 && y >= 0 && x < W && y < H && !bg[i] && isWhite(i)) {
      bg[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    const y = (i / W) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (bg[i]) {
        data[i * 4 + 3] = 0;
        continue;
      }
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++)
        for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx,
            yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < W && yy < H && bg[yy * W + xx]) {
            near = true;
            break;
          }
        }
      if (near) {
        const w = Math.min(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
        if (w > 190) data[i * 4 + 3] = Math.round(255 * Math.max(0, 1 - (w - 190) / 60));
      }
    }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } });
}

// Digital Watch brand (committed copies of the app's own public brand files)
const brand = path.join(ROOT, 'src', 'assets', 'brand');
await sharp(path.join(brand, 'digital-watch-logo.png')).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, 'digital-watch-logo.webp'));
await (
  await keyOutWhiteBackground(path.join(brand, 'digital-watch-emblem.png'), 512)
)
  .webp({ quality: 94, alphaQuality: 100 })
  .toFile(path.join(OUT, 'digital-watch-emblem.webp'));
await sharp(path.join(brand, 'digital-watch-emblem.png'))
  .resize(180, 180)
  .png()
  .toFile(path.join(ROOT, 'public', 'apple-touch-icon.png'));
await sharp(path.join(brand, 'digital-watch-emblem.png'))
  .resize(48, 48)
  .png()
  .toFile(path.join(ROOT, 'public', 'favicon.png'));
await sharp(path.join(brand, 'digital-watch-emblem.png'))
  .resize(512, 512)
  .png()
  .toFile(path.join(ROOT, 'public', 'icon-512.png'));

// Social card 1200x630: the real logo on its own, on navy. No screenshot, no face, no third-party material.
const logoBuf = await sharp(path.join(brand, 'digital-watch-logo.png')).resize({ height: 420 }).toBuffer();
const plate = await sharp({ create: { width: 560, height: 520, channels: 4, background: '#ffffff' } })
  .composite([{ input: logoBuf, gravity: 'center' }])
  .png()
  .toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#05143F' } })
  .composite([{ input: plate, left: 320, top: 55 }])
  .jpeg({ quality: 88 })
  .toFile(path.join(OUT, 'og-card.jpg'));

fs.writeFileSync(path.join(ROOT, 'src', 'data', 'image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('assets built:', fs.readdirSync(OUT).length, 'files in public/img');
