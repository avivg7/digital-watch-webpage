import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// The publication gate and the activation script, exercised with planted violations in throw-away copies of dist/.
// Node-only tests (no browser): they run once, in the chromium project.
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== 'chromium' || browserName !== 'chromium', 'node-only checks run once, in the desktop chromium project');
});

const ROOT = process.cwd();
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/video.config.json'), 'utf8'));
const bytes = (n: number) => crypto.randomBytes(n);

function scratch() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-gate-'));
  fs.cpSync(path.join(ROOT, 'dist'), path.join(d, 'dist'), { recursive: true });
  return d;
}
function gate(dir: string, env: Record<string, string> = {}) {
  const r = spawnSync('node', ['scripts/verify-public-tree.mjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, DIST_DIR: path.join(dir, 'dist'), SOURCE_VIDEO_DIR: path.join(dir, 'src-videos'), ...env },
  });
  return { ok: r.status === 0, out: r.stdout + r.stderr };
}
function writeConfig(dir: string, patch: (c: typeof config) => void) {
  const c = structuredClone(config);
  patch(c);
  const f = path.join(dir, 'video.config.json');
  fs.writeFileSync(f, JSON.stringify(c));
  return f;
}
const approved = (c: typeof config) => {
  c.mode = 'report';
  c.rights = { ...c.rights, status: 'PUBLISHED_APPROVED', confirmedBy: 'test owner', confirmedOn: '2026-01-01', reference: 'test-reference' };
};

test.describe('video publication gate', () => {
  test('the real build passes', () => {
    const d = scratch();
    const g = gate(d);
    expect(g.ok, g.out).toBe(true);
  });

  test('rights pending: a report folder, a stray video, the source recording, an oversize demo and a name leak are each refused', () => {
    const d = scratch();
    const dist = path.join(d, 'dist');
    fs.mkdirSync(path.join(dist, 'video/report'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'video/report/dw-report.mp4'), bytes(2000));
    fs.writeFileSync(path.join(dist, 'stray.mp4'), bytes(2000));
    fs.writeFileSync(path.join(dist, 'notes.txt'), 'see 7F0744CB-6DEF-469C-B7B1-1E2D3E0F1BBD.MP4');
    fs.mkdirSync(path.join(d, 'src-videos'));
    const src = bytes(3000);
    fs.writeFileSync(path.join(d, 'src-videos/source.mp4'), src);
    fs.writeFileSync(path.join(dist, 'video/demo/dw-player-demo.webm'), src);
    const g = gate(d);
    expect(g.ok).toBe(false);
    expect(g.out).toContain('video/report/dw-report.mp4: media is not published by the current video configuration');
    expect(g.out).toContain('video/report/dw-report.mp4: the report video needs the owner');
    expect(g.out).toContain('stray.mp4: media is not published');
    expect(g.out).toContain('notes.txt: references the private originals or the TV recording');
    expect(g.out).toContain('video/demo/dw-player-demo.webm: identical to a local source recording');
    const big = scratch();
    fs.writeFileSync(path.join(big, 'dist/video/demo/dw-player-demo.mp4'), bytes(2 * 1024 * 1024));
    expect(gate(big).out).toContain('limit 1.5 MB');
  });

  test('a device or path tag inside a video file is refused', () => {
    const d = scratch();
    fs.writeFileSync(
      path.join(d, 'dist/video/demo/dw-player-demo.mp4'),
      Buffer.concat([bytes(500), Buffer.from('com.apple.quicktime.author ReplayKit'), bytes(500)]),
    );
    const g = gate(d);
    expect(g.ok).toBe(false);
    expect(g.out).toContain('carries a local path, device or author tag');
  });

  test('mode "report" without a complete rights record fails; with one, and the files present, it passes', () => {
    const d = scratch();
    const incomplete = writeConfig(d, (c) => {
      c.mode = 'report';
    });
    const bad = gate(d, { VIDEO_CONFIG: incomplete });
    expect(bad.ok).toBe(false);
    expect(bad.out).toContain('mode "report" without a complete rights confirmation');

    const cfg = writeConfig(d, approved);
    const missing = gate(d, { VIDEO_CONFIG: cfg });
    expect(missing.ok).toBe(false);
    expect(missing.out).toContain('video/report/dw-report.mp4: configured but missing from the build');

    fs.mkdirSync(path.join(d, 'dist/video/report'), { recursive: true });
    fs.writeFileSync(path.join(d, 'dist/video/report/dw-report.mp4'), bytes(5000));
    fs.writeFileSync(path.join(d, 'dist/video/report/dw-report.webm'), bytes(5000));
    const ok = gate(d, { VIDEO_CONFIG: cfg });
    expect(ok.ok, ok.out).toBe(true);
  });
});

test.describe('activation script', () => {
  test('refuses while rights are pending, before reading the source, and writes nothing', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-prep-'));
    const r = spawnSync('node', ['scripts/prepare-report-video.mjs', path.join(out, 'whatever.mp4')], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, VIDEO_OUT_DIR: path.join(out, 'o') },
    });
    // a missing file is reported first; use a real (empty) file to reach the rights check
    expect(r.status).toBe(1);
    fs.writeFileSync(path.join(out, 'x.mp4'), '');
    const r2 = spawnSync('node', ['scripts/prepare-report-video.mjs', path.join(out, 'x.mp4')], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, VIDEO_OUT_DIR: path.join(out, 'o') },
    });
    expect(r2.status).toBe(1);
    expect(r2.stderr).toContain('rights are not confirmed');
    expect(fs.existsSync(path.join(out, 'o'))).toBe(false);
  });

  const hasFfmpeg = spawnSync('ffmpeg', ['-version']).status === 0;
  test('with a recorded confirmation it produces compact, metadata-free files from a synthetic clip', () => {
    test.skip(!hasFfmpeg, 'ffmpeg is not installed on this machine');
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'dw-prep-'));
    const input = path.join(d, 'synthetic.mp4');
    // a 3 s 1920x1080 test pattern with a tone and an author tag: stands in for a source, contains nothing third-party
    const mk = spawnSync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-f',
        'lavfi',
        '-i',
        'testsrc2=size=1920x1080:rate=60:duration=3',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=3',
        '-metadata',
        'author=ReplayKit',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        input,
      ],
      { encoding: 'utf8' },
    );
    expect(mk.status, mk.stderr).toBe(0);
    const cfg = writeConfig(d, approved);
    const outDir = path.join(d, 'out');
    const r = spawnSync('node', ['scripts/prepare-report-video.mjs', input, '--poster-at', '1'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: { ...process.env, VIDEO_CONFIG: cfg, VIDEO_OUT_DIR: outDir },
    });
    expect(r.status, r.stderr).toBe(0);
    expect(fs.readdirSync(outDir).sort()).toEqual(['dw-report-poster.webp', 'dw-report.mp4', 'dw-report.webm']);
    const probe = JSON.parse(
      spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', path.join(outDir, 'dw-report.mp4')], { encoding: 'utf8' })
        .stdout,
    );
    const v = probe.streams.find((s: { codec_type: string }) => s.codec_type === 'video');
    expect([v.codec_name, v.width, v.height]).toEqual(['h264', 1280, 720]);
    expect(probe.streams.some((s: { codec_type: string }) => s.codec_type === 'audio')).toBe(true);
    expect(JSON.stringify(probe.format.tags ?? {})).not.toMatch(/ReplayKit|author/i);
    expect(fs.readFileSync(path.join(outDir, 'dw-report.mp4')).toString('latin1')).not.toContain('ReplayKit');
  });
});
