// Activation path for the supplied report recording. THIS IS THE ONLY SCRIPT THAT TOUCHES IT, and it refuses to run until the owner's written
// rights confirmation is recorded in src/data/video.config.json (rights.confirmedBy, confirmedOn, reference). See docs/FEATURED_VIDEO.md.
//
//   npm run video:prepare -- <path-to-source.mp4> [--captions <file.vtt>] [--poster-at <seconds>]
//
// It writes web-ready files to public/video/report/ (git-ignored on purpose; the owner commits them deliberately):
//   dw-report.mp4   H.264 High + AAC, at most 1280x720, faststart (playback in every current browser, byte-range friendly)
//   dw-report.webm  VP9 + Opus (smaller where supported)
//   dw-report-poster.webp   a frame chosen by --poster-at, metadata stripped
//   dw-report.he.vtt        only if --captions is given
// All container metadata (device, author, location, creation time) is dropped (-map_metadata -1).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const args = process.argv.slice(2);
const flag = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : undefined;
};
const input = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const cfgPath = path.resolve(process.env.VIDEO_CONFIG || 'src/data/video.config.json');
const outDir = path.resolve(process.env.VIDEO_OUT_DIR || 'public/video/report');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const die = (m) => {
  console.error(`video:prepare refused: ${m}`);
  process.exit(1);
};

if (!input) die('give the path of the source video: npm run video:prepare -- <file.mp4>');
if (!fs.existsSync(input)) die(`not found: ${input}`);
const r = cfg.rights;
if (!(r.confirmedBy && r.confirmedOn && r.reference)) {
  die(
    `rights are not confirmed (status ${r.status}). The report belongs to a third party. Record the owner's written confirmation in src/data/video.config.json ` +
      '(rights.confirmedBy, rights.confirmedOn, rights.reference) first. Nothing was read from the source and nothing was written.',
  );
}

const run = (cmd, a) => {
  const x = spawnSync(cmd, a, { encoding: 'utf8' });
  if (x.status !== 0) die(`${cmd} failed: ${(x.stderr || '').split('\n').slice(-5).join(' ')}`);
  return x.stdout;
};
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', input]));
const v = probe.streams.find((s) => s.codec_type === 'video');
const hasAudio = probe.streams.some((s) => s.codec_type === 'audio');
if (!v) die('no video stream in the source');
const dur = Number(probe.format.duration);
console.log(`source: ${v.codec_name} ${v.width}x${v.height}, ${dur.toFixed(1)} s, audio: ${hasAudio}, ${(Number(probe.format.size) / 1e6).toFixed(1)} MB`);

fs.mkdirSync(outDir, { recursive: true });
const out = (n) => path.join(outDir, n);
// scale down to 720p only when larger; keep the aspect ratio; even dimensions; SDR yuv420p for compatibility
const vf = "scale='min(1280,iw)':'-2',format=yuv420p";
const common = [
  '-hide_banner',
  '-loglevel',
  'error',
  '-y',
  '-i',
  input,
  '-map_metadata',
  '-1',
  '-map',
  '0:v:0',
  ...(hasAudio ? ['-map', '0:a:0'] : []),
  '-vf',
  vf,
  '-r',
  '30',
];
run('ffmpeg', [
  ...common,
  '-c:v',
  'libx264',
  '-profile:v',
  'high',
  '-crf',
  '24',
  '-preset',
  'slow',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '128k', '-ac', '2'] : ['-an']),
  '-movflags',
  '+faststart',
  '-fflags',
  '+bitexact',
  out('dw-report.mp4'),
]);
run('ffmpeg', [
  ...common,
  '-c:v',
  'libvpx-vp9',
  '-b:v',
  '0',
  '-crf',
  '33',
  '-row-mt',
  '1',
  ...(hasAudio ? ['-c:a', 'libopus', '-b:a', '96k', '-ac', '2'] : ['-an']),
  '-fflags',
  '+bitexact',
  out('dw-report.webm'),
]);

const at = Number(flag('--poster-at') ?? Math.min(5, dur / 2));
const png = out('.poster.tmp.png');
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(at), '-i', out('dw-report.mp4'), '-frames:v', '1', png]);
await sharp(png).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 78 }).toFile(out('dw-report-poster.webp'));
fs.rmSync(png);
if (flag('--captions')) fs.copyFileSync(flag('--captions'), out('dw-report.he.vtt'));

const mm = Math.floor(dur / 60);
const ss = String(Math.round(dur % 60)).padStart(2, '0');
for (const f of fs.readdirSync(outDir)) console.log(`${f}: ${(fs.statSync(out(f)).size / 1024).toFixed(0)} KB`);
console.log(
  `\nDone. Next (docs/FEATURED_VIDEO.md):\n 1. in src/data/video.config.json set "mode": "report", report.durationLabel "${mm}:${ss}"${flag('--captions') ? '' : ', and report.captions "" (no captions supplied)'}\n 2. un-ignore public/video/report/ in .gitignore (a deliberate commit)\n 3. npm run build && npm run verify:public && npm test`,
);
