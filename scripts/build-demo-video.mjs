// Renders the ORIGINAL first-party player-demo video (public/video/demo/) from scripts/demo-video/scene.html.
// Deterministic: every frame is drawn by window.render(t) and screenshotted, then ffmpeg encodes MP4 (H.264) and WebM (VP9). No audio track.
// This is a fixture for the featured-video player. It is NOT the Channel 13 report and contains no third-party material.
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/video/demo');
const FPS = 30;
const SECONDS = 9;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-demo-video-'));
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(ROOT, 'scripts/demo-video/scene.html')).href);
await page.evaluate(() => document.fonts.ready);
const frames = FPS * SECONDS;
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => window.render(t), i / FPS);
  await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`) });
}
await page.evaluate(() => window.render(3.6));
await page.screenshot({ path: path.join(tmp, 'poster.png') });
await browser.close();

const run = (args) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error('ffmpeg failed');
};
const input = ['-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png')];
// -map_metadata -1 and -fflags +bitexact keep tool/creation-time tags out of the published file
run([
  ...input,
  '-an',
  '-c:v',
  'libx264',
  '-profile:v',
  'high',
  '-pix_fmt',
  'yuv420p',
  '-crf',
  '27',
  '-preset',
  'slow',
  '-movflags',
  '+faststart',
  '-map_metadata',
  '-1',
  '-fflags',
  '+bitexact',
  '-flags:v',
  '+bitexact',
  path.join(OUT, 'dw-player-demo.mp4'),
]);
run([
  ...input,
  '-an',
  '-c:v',
  'libvpx-vp9',
  '-b:v',
  '0',
  '-crf',
  '36',
  '-row-mt',
  '1',
  '-map_metadata',
  '-1',
  '-fflags',
  '+bitexact',
  path.join(OUT, 'dw-player-demo.webm'),
]);
// poster (the exposure moment of the story, t = 3.6 s): WebP without metadata
const sharp = (await import('sharp')).default;
await sharp(path.join(tmp, 'poster.png')).webp({ quality: 80 }).toFile(path.join(OUT, 'dw-player-demo-poster.webp'));
fs.rmSync(tmp, { recursive: true, force: true });
console.log('demo video written to public/video/demo/');
