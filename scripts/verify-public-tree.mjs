// Publication gate, run on the BUILT site (dist/) before anything is deployed. It fails the build if the output could expose what must stay private:
//   - only an allow-list of file types is published; NO video or audio file of any kind (the featured report is an embed of the owner's YouTube upload, never a hosted file)
//   - the only third-party video reference in any page is the configured YouTube video ID (privacy-enhanced embed host + watch URL); no other YouTube ID, no thumbnail host
//   - every image is free of embedded metadata (EXIF/GPS/camera/software), and none is unreasonably large
//   - no e-mail address, phone number, localhost URL, absolute local path or credential-looking string appears in any text file
//   - no reference to the git-ignored originals folder or to the TV recording file, and no published file identical to anything in assets/videos
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

const DIST = path.resolve(process.env.DIST_DIR || 'dist');
const ALLOWED = new Set(['.html', '.css', '.js', '.xml', '.txt', '.webp', '.avif', '.png', '.jpg', '.woff2', '.svg', '.ico', '.json']);
const MAX_IMAGE = 400 * 1024;
const cfg = JSON.parse(fs.readFileSync(path.resolve(process.env.VIDEO_CONFIG || 'src/data/video.config.json'), 'utf8'));
const problems = [];
if (!/^[\w-]{11}$/.test(cfg.id)) problems.push(`video.config.json: "${cfg.id}" is not a YouTube video ID`);
if (cfg.embedHost !== 'https://www.youtube-nocookie.com')
  problems.push('video.config.json: the embed host must be the privacy-enhanced domain https://www.youtube-nocookie.com');
if (cfg.watchUrl !== `https://www.youtube.com/watch?v=${cfg.id}`) problems.push('video.config.json: watchUrl does not match the video id');

// local-only source recordings: a published file must never be identical to one of these
const sourceHashes = new Set();
const sourceDir = path.resolve(process.env.SOURCE_VIDEO_DIR || 'assets/videos');
if (fs.existsSync(sourceDir)) {
  for (const n of fs.readdirSync(sourceDir)) {
    const f = path.join(sourceDir, n);
    if (fs.statSync(f).isFile()) sourceHashes.add(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'));
  }
}
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);

let embeds = 0;
for (const f of files) {
  const rel = path.relative(DIST, f);
  const ext = path.extname(f).toLowerCase();
  if (!ALLOWED.has(ext)) problems.push(`${rel}: file type ${ext || '(none)'} is not on the publication allow-list (no video or audio is ever hosted here)`);
  if (/\.map$|\.env|\.DS_Store/.test(f)) problems.push(`${rel}: must not be published`);
  const size = fs.statSync(f).size;
  if (sourceHashes.size && sourceHashes.has(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')))
    problems.push(`${rel}: identical to a local source recording in assets/videos`);
  if (['.webp', '.avif', '.png', '.jpg'].includes(ext)) {
    if (size > MAX_IMAGE) problems.push(`${rel}: image is ${Math.round(size / 1024)} KB (limit ${MAX_IMAGE / 1024} KB)`);
    const m = await sharp(f)
      .metadata()
      .catch(() => null);
    if (!m) problems.push(`${rel}: is not a readable image`);
    else if (m.exif || m.xmp || m.iptc || m.tifftagPhotoshop) problems.push(`${rel}: carries embedded metadata (exif/xmp/iptc)`);
  }
  if (['.html', '.css', '.js', '.xml', '.txt', '.json', '.svg'].includes(ext)) {
    const t = fs.readFileSync(f, 'utf8');
    if (/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(t.replace(/\S+@\d+\.\d+\.\d+/g, ''))) problems.push(`${rel}: contains something that looks like an e-mail address`);
    if (/(?<![\d.])0[2-9]\d?[-\s]?\d{7}(?!\d)|\+972[-\s]?\d/.test(t)) problems.push(`${rel}: contains something that looks like a phone number`);
    if (/localhost|127\.0\.0\.1|\/Users\/|_SEED|password\s*[:=]/i.test(t)) problems.push(`${rel}: references a local path, host or credential`);
    if (/\/assets\/(images|videos)|7F0744CB|\.(mp4|mov|m4v|webm)\b/i.test(t))
      problems.push(`${rel}: references the private originals, the TV recording or a hosted video file`);
    // third-party video: only the one configured YouTube video, nothing else from YouTube/Google media hosts
    for (const m of t.matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/|live\/|v\/)|youtu\.be\/)([\w-]{6,})/g)) {
      embeds++;
      if (m[1].slice(0, 11) !== cfg.id) problems.push(`${rel}: references another YouTube video (${m[1]}); only ${cfg.id} is configured`);
    }
    if (/ytimg\.com|ggpht\.com|googlevideo\.com|youtube\.com\/iframe_api/i.test(t))
      problems.push(`${rel}: references a YouTube thumbnail, media or script host (the poster must be local; the player is a plain iframe)`);
    // the Content-Security-Policy meta tag: exactly one third-party origin, only for frames, no wildcard
    const csp = t.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/)?.[1];
    if (csp !== undefined) {
      if ((csp.match(/https?:\/\/[^\s;]+/g) ?? []).join() !== cfg.embedHost) problems.push(`${rel}: the CSP names origins other than ${cfg.embedHost}`);
      if (!csp.includes(`frame-src ${cfg.embedHost};`)) problems.push(`${rel}: the CSP lacks "frame-src ${cfg.embedHost}"`);
      if (/\*/.test(csp)) problems.push(`${rel}: the CSP contains a wildcard`);
    } else if (rel.endsWith('.html') && !rel.startsWith('404')) problems.push(`${rel}: has no Content-Security-Policy meta tag`);
    if (rel.endsWith('index.html') && !rel.includes(path.sep) && !t.includes(cfg.id))
      problems.push(`${rel}: the home page does not contain the configured video id`);
  }
}
if (!embeds) problems.push('no reference to the featured YouTube video was found in the build');
const total = files.reduce((a, f) => a + fs.statSync(f).size, 0);
console.log(`checked ${files.length} files, ${(total / 1024 / 1024).toFixed(2)} MB`);
if (problems.length) {
  console.error('PUBLICATION GATE FAILED:\n - ' + problems.join('\n - '));
  process.exit(1);
}
console.log('publication gate: ok');
