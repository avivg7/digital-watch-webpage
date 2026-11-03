// Publication gate, run on the BUILT site (dist/) before anything is deployed. It fails the build if the output could expose what must stay private:
//   - only an allow-list of file types is published; no video, audio, archive, document, source map or env file
//   - every image is free of embedded metadata (EXIF/GPS/camera/software), and none is unreasonably large
//   - no e-mail address, phone number, localhost URL, absolute local path or credential-looking string appears in any text file
//   - no reference to the git-ignored originals folder or to the TV recording
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const DIST = path.resolve(process.env.DIST_DIR || 'dist');
const ALLOWED = new Set(['.html', '.css', '.js', '.xml', '.txt', '.webp', '.avif', '.png', '.jpg', '.woff2', '.svg', '.ico', '.json']);
const MAX_IMAGE = 400 * 1024;
const problems = [];
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

for (const f of files) {
  const rel = path.relative(DIST, f);
  const ext = path.extname(f).toLowerCase();
  if (!ALLOWED.has(ext)) problems.push(`${rel}: file type ${ext || '(none)'} is not on the publication allow-list`);
  if (/\.map$|\.env|\.DS_Store/.test(f)) problems.push(`${rel}: must not be published`);
  const size = fs.statSync(f).size;
  if (['.webp', '.avif', '.png', '.jpg'].includes(ext)) {
    if (size > MAX_IMAGE) problems.push(`${rel}: image is ${Math.round(size / 1024)} KB (limit ${MAX_IMAGE / 1024} KB)`);
    const m = await sharp(f).metadata();
    if (m.exif || m.xmp || m.iptc || m.tifftagPhotoshop) problems.push(`${rel}: carries embedded metadata (exif/xmp/iptc)`);
  }
  if (['.html', '.css', '.js', '.xml', '.txt', '.json', '.svg'].includes(ext)) {
    const t = fs.readFileSync(f, 'utf8');
    if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(t.replace(/\S+@\d+\.\d+\.\d+/g, ''))) problems.push(`${rel}: contains something that looks like an e-mail address`);
    if (/(?<![\d.])0[2-9]\d?[-\s]?\d{7}(?!\d)|\+972[-\s]?\d/.test(t)) problems.push(`${rel}: contains something that looks like a phone number`);
    if (/localhost|127\.0\.0\.1|\/Users\/|_SEED|password\s*[:=]/i.test(t)) problems.push(`${rel}: references a local path, host or credential`);
    if (/\/assets\/(images|videos)|7F0744CB|\.mp4/i.test(t)) problems.push(`${rel}: references the private originals or the TV recording`);
  }
}
const total = files.reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`checked ${files.length} files, ${(total / 1024 / 1024).toFixed(2)} MB`);
if (problems.length) {
  console.error('PUBLICATION GATE FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('publication gate: ok');
