import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';

// The publication gate, exercised with planted violations in throw-away copies of dist/. Node-only: runs once, in the desktop chromium project.
test.beforeEach(({ browserName }, info) => {
  test.skip(info.project.name !== 'chromium' || browserName !== 'chromium', 'node-only checks run once, in the desktop chromium project');
});

const ROOT = process.cwd();
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
const homePath = (d: string) => path.join(d, 'dist/index.html');

test.describe('publication gate and the YouTube embed', () => {
  test('the real build passes', () => {
    const g = gate(scratch());
    expect(g.ok, g.out).toBe(true);
  });

  test('any hosted video, a copy of the source recording and a name leak are refused', () => {
    const d = scratch();
    const dist = path.join(d, 'dist');
    fs.mkdirSync(path.join(dist, 'video'), { recursive: true });
    fs.writeFileSync(path.join(dist, 'video/clip.mp4'), bytes(2000));
    fs.writeFileSync(path.join(dist, 'clip.webm'), bytes(2000));
    fs.writeFileSync(path.join(dist, 'notes.txt'), 'see 7F0744CB-6DEF-469C-B7B1-1E2D3E0F1BBD.MP4');
    fs.mkdirSync(path.join(d, 'src-videos'));
    const src = bytes(3000);
    fs.writeFileSync(path.join(d, 'src-videos/source.bin'), src);
    fs.writeFileSync(path.join(dist, 'renamed.json'), src);
    const g = gate(d);
    expect(g.ok).toBe(false);
    expect(g.out).toContain('video/clip.mp4: file type .mp4 is not on the publication allow-list');
    expect(g.out).toContain('clip.webm: file type .webm is not on the publication allow-list');
    expect(g.out).toContain('notes.txt: references the private originals');
    expect(g.out).toContain('renamed.json: identical to a local source recording');
  });

  test('another YouTube video, a YouTube thumbnail or script host, and a missing embed are each refused', () => {
    const d = scratch();
    const html = fs.readFileSync(homePath(d), 'utf8');
    fs.writeFileSync(path.join(d, 'dist/other.html'), `<a href="https://www.youtube.com/watch?v=AAAAAAAAAAA">x</a>`);
    fs.writeFileSync(path.join(d, 'dist/thumb.html'), `<img src="https://i.ytimg.com/vi/DBdZiXJb9OI/hqdefault.jpg">`);
    fs.writeFileSync(path.join(d, 'dist/api.js'), `s.src='https://www.youtube.com/iframe_api'`);
    const g = gate(d);
    expect(g.ok).toBe(false);
    expect(g.out).toContain('other.html: references another YouTube video (AAAAAAAAAAA)');
    expect(g.out).toContain('thumb.html: references a YouTube thumbnail, media or script host');
    expect(g.out).toContain('api.js: references a YouTube thumbnail, media or script host');
    const none = scratch();
    fs.writeFileSync(homePath(none), html.replaceAll('DBdZiXJb9OI', 'XXXXXXXXXXX'));
    expect(gate(none).out).toContain('references another YouTube video (XXXXXXXXXXX)');
  });

  test('a home page with no video reference, a widened CSP, a wildcard, and other YouTube URL shapes are each refused', () => {
    const d = scratch();
    const html = fs.readFileSync(homePath(d), 'utf8');
    fs.writeFileSync(homePath(d), html.replaceAll('DBdZiXJb9OI', ''));
    expect(gate(d).out).toContain('no reference to the featured YouTube video was found');
    const wide = scratch();
    fs.writeFileSync(
      homePath(wide),
      html.replace('frame-src https://www.youtube-nocookie.com;', 'frame-src https://www.youtube-nocookie.com https://example.com;'),
    );
    expect(gate(wide).out).toContain('the CSP names origins other than');
    const star = scratch();
    fs.writeFileSync(homePath(star), html.replace('img-src', 'img-src *'));
    expect(gate(star).out).toContain('the CSP contains a wildcard');
    const noframe = scratch();
    fs.writeFileSync(homePath(noframe), html.replace('frame-src https://www.youtube-nocookie.com;', ''));
    expect(gate(noframe).out).toContain('the CSP lacks "frame-src');
    const shapes = scratch();
    fs.writeFileSync(
      path.join(shapes, 'dist/s.html'),
      '<a href="https://www.youtube.com/shorts/AAAAAAAAAAA">a</a><a href="https://youtu.be/BBBBBBBBBBB">b</a>',
    );
    const g = gate(shapes);
    expect(g.out).toContain('(AAAAAAAAAAA)');
    expect(g.out).toContain('(BBBBBBBBBBB)');
  });

  test('a device or personal path inside a published text file is refused', () => {
    const d = scratch();
    fs.writeFileSync(path.join(d, 'dist/x.txt'), 'path /Users/someone/aviv_files/x and password=abc');
    const g = gate(d);
    expect(g.ok).toBe(false);
    expect(g.out).toContain('x.txt: references a local path, host or credential');
  });

  test('a configuration that points at the regular YouTube domain or a mismatched URL is refused', () => {
    const d = scratch();
    const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/video.config.json'), 'utf8'));
    cfg.embedHost = 'https://www.youtube.com';
    cfg.watchUrl = 'https://www.youtube.com/watch?v=ZZZZZZZZZZZ';
    const f = path.join(d, 'video.config.json');
    fs.writeFileSync(f, JSON.stringify(cfg));
    const g = gate(d, { VIDEO_CONFIG: f });
    expect(g.ok).toBe(false);
    expect(g.out).toContain('the embed host must be the privacy-enhanced domain');
    expect(g.out).toContain('watchUrl does not match the video id');
  });
});
