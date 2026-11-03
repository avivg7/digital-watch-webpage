// Builds the featured-video poster (public/img/video-front-*.avif|webp) from the owner's supplied frame assets/images/video_front.png (git-ignored original, never copied as-is).
// The frame comes from a third-party TV report (Channel 13): rights and privacy are the owner's open question V-1 (docs/FEATURED_VIDEO.md). The image is NOT edited (no blur, no crop of content):
// it is only cover-cropped to exactly 16:9 so the poster box never shifts, resized, re-encoded, and stripped of all metadata (sharp drops EXIF/ICC/XMP unless asked).
// Usage: npm run assets:poster
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join(process.cwd(), 'assets', 'images', 'video_front.png');
const OUT = path.join(process.cwd(), 'public', 'img');
if (!fs.existsSync(SRC)) throw new Error(`missing poster source: ${SRC}`);
fs.mkdirSync(OUT, { recursive: true });
const WIDTHS = [640, 1200, 1920];
for (const w of WIDTHS) {
  const pipe = () => sharp(SRC).resize({ width: w, height: Math.round((w * 9) / 16), fit: 'cover', position: 'centre' });
  await pipe()
    .webp({ quality: 80, effort: 5 })
    .toFile(path.join(OUT, `video-front-${w}.webp`));
  await pipe()
    .avif({ quality: 55, effort: 4 })
    .toFile(path.join(OUT, `video-front-${w}.avif`));
}
for (const f of fs.readdirSync(OUT).filter((n) => n.startsWith('video-front-'))) console.log(f, Math.round(fs.statSync(path.join(OUT, f)).size / 1024) + ' KB');
