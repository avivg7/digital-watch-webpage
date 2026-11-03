// Publication gate, run on the BUILT site (dist/) before anything is deployed. It fails the build if the output could expose what must stay private:
//   - only an allow-list of file types is published; no audio, archive, document, source map or env file
//   - video is allowed ONLY as the first-party player demo (video/demo/), or as the report (video/report/) once src/data/video.config.json records the
//     owner's written rights confirmation; video files are size-capped, carry no device or tool paths, and never equal the local source recording
//   - every image is free of embedded metadata (EXIF/GPS/camera/software), and none is unreasonably large
//   - no e-mail address, phone number, localhost URL, absolute local path or credential-looking string appears in any text file
//   - no reference to the git-ignored originals folder or to the TV recording
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const DIST = path.resolve(process.env.DIST_DIR || 'dist');
const ALLOWED = new Set(['.vtt', '.html', '.css', '.js', '.xml', '.txt', '.webp', '.avif', '.png', '.jpg', '.woff2', '.svg', '.ico', '.json']);
const MAX_IMAGE = 400 * 1024;
const VIDEO_EXT = new Set(['.mp4', '.webm']);
const MAX_VIDEO = { demo: 1.5 * 1024 * 1024, report: 40 * 1024 * 1024 };
const cfg = JSON.parse(fs.readFileSync(path.resolve(process.env.VIDEO_CONFIG || 'src/data/video.config.json'), 'utf8'));
const reportApproved = cfg.mode === 'report' && !!(cfg.rights.confirmedBy && cfg.rights.confirmedOn && cfg.rights.reference);
// the exact published media paths this configuration allows (relative to dist/, from the base path)
const allowedMedia = new Set(Object.values(cfg.demo).filter((v) => typeof v === 'string' && v.startsWith('video/')));
if (reportApproved)
  Object.values(cfg.report)
    .filter((v) => typeof v === 'string' && v.startsWith('video/'))
    .forEach((v) => allowedMedia.add(v));
// local-only source recordings: a published file must never be identical to one of these
const sourceHashes = new Set();
const sourceDir = path.resolve(process.env.SOURCE_VIDEO_DIR || 'assets/videos');
if (fs.existsSync(sourceDir)) {
  for (const n of fs.readdirSync(sourceDir)) {
    const f = path.join(sourceDir, n);
    if (fs.statSync(f).isFile()) sourceHashes.add(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'));
  }
}
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
  const relPosix = rel.split(path.sep).join('/');
  const isMedia = VIDEO_EXT.has(ext) || ext === '.vtt' || relPosix.startsWith('video/');
  if (isMedia) {
    if (!allowedMedia.has(relPosix))
      problems.push(
        `${rel}: media is not published by the current video configuration (mode "${cfg.mode}", rights ${cfg.rights.status}); see docs/FEATURED_VIDEO.md`,
      );
    if (relPosix.startsWith('video/report/') && !reportApproved)
      problems.push(`${rel}: the report video needs the owner's recorded rights confirmation in src/data/video.config.json`);
  } else if (!ALLOWED.has(ext)) problems.push(`${rel}: file type ${ext || '(none)'} is not on the publication allow-list`);
  if (VIDEO_EXT.has(ext)) {
    const bytes = fs.readFileSync(f);
    const cap = relPosix.startsWith('video/report/') ? MAX_VIDEO.report : MAX_VIDEO.demo;
    if (bytes.length > cap)
      problems.push(
        `${rel}: video is ${(bytes.length / 1024 / 1024).toFixed(1)} MB (limit ${(cap / 1024 / 1024).toFixed(1)} MB); compress it (docs/FEATURED_VIDEO.md)`,
      );
    if (sourceHashes.has(crypto.createHash('sha256').update(bytes).digest('hex')))
      problems.push(`${rel}: identical to a local source recording in assets/videos`);
    if (/\/Users\/|com\.apple|ReplayKit/.test(bytes.toString('latin1'))) problems.push(`${rel}: carries a local path, device or author tag`);
  }
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
    // references to the configured, allowed media paths are expected in the page; anything else that looks like a video file is not
    const stripped = t.replace(/video\/(demo|report)\/[\w-]+(\.he)?\.(mp4|webm|vtt|webp)/g, (m) => (allowedMedia.has(m) ? '' : m));
    if (/\/assets\/(images|videos)|7F0744CB|\.(mp4|mov|m4v|webm)\b/i.test(stripped))
      problems.push(`${rel}: references the private originals or the TV recording`);
  }
}
if (!reportApproved && cfg.mode === 'report') problems.push('video.config.json: mode "report" without a complete rights confirmation');
const required = reportApproved ? [cfg.report.mp4] : [cfg.demo.mp4];
for (const m of required)
  if (!files.some((f) => path.relative(DIST, f).split(path.sep).join('/') === m)) problems.push(`${m}: configured but missing from the build`);
const total = files.reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`checked ${files.length} files, ${(total / 1024 / 1024).toFixed(2)} MB`);
if (problems.length) {
  console.error('PUBLICATION GATE FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('publication gate: ok');
