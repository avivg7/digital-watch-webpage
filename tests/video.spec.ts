import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { axe, noOverflow, settle } from './helpers';

// The featured video section: the primary Play button plays IN PAGE (never a navigation to an article), loads media only on demand,
// manages focus, handles failure, and in the current RIGHTS-PENDING mode plays only the labelled first-party demo (docs/FEATURED_VIDEO.md).
const BASE = '/digital-watch-webpage/';
const SHOTS = path.join(process.cwd(), 'test-results', 'shots', 'video');

async function openPlayer(page: Page) {
  await page.goto('./');
  await page.locator('#video').scrollIntoViewIfNeeded();
  await page.locator('[data-video-open]').click();
  await expect(page.locator('#video-dialog')).toBeVisible();
}

test.describe('featured video', () => {
  test('nothing video-related is requested or present until the visitor chooses to play', async ({ page }) => {
    const media: string[] = [];
    page.on('request', (r) => {
      if (/\/video\//.test(r.url())) media.push(r.url());
    });
    await page.goto('./');
    await settle(page);
    await page.waitForTimeout(500);
    expect(media, 'media requests before any click').toEqual([]);
    expect(await page.locator('video').count()).toBe(0);
  });

  test('the primary Play control is an in-page button, not a link, and does not navigate; the article link is separate and labelled as an article', async ({
    page,
    context,
  }) => {
    await page.goto('./');
    const play = page.locator('[data-video-open]');
    expect(await play.evaluate((el) => el.tagName)).toBe('BUTTON');
    expect(await play.evaluate((el) => !!el.closest('a') || !!el.querySelector('a'))).toBe(false);
    const before = page.url();
    const pages = context.pages().length;
    await play.scrollIntoViewIfNeeded();
    await play.click();
    await expect(page.locator('#video-dialog')).toBeVisible();
    expect(page.url()).toBe(before);
    expect(context.pages().length).toBe(pages);
    const v = page.locator('#video-dialog video');
    await expect(v).toHaveCount(1);
    expect(await v.evaluate((el: HTMLVideoElement) => el.currentSrc)).toContain(`${BASE}video/demo/dw-player-demo.`);
    // the real article links stay in the press section and in the video section, all external and labelled
    const art = page.locator('#video .vid__article a');
    await expect(art).toHaveAttribute('href', 'https://13tv.co.il/item/news/politics/security/soldiers-905155535/');
    await expect(art).toHaveAttribute('target', '_blank');
    await expect(page.locator('#evidence a[href*="gly.co.il"]')).toHaveCount(1);
    await expect(page.locator('#evidence a[href*="13tv.co.il"]')).toHaveCount(1);
    await expect(page.locator('#video .vid__article-k')).toContainText('לא לסרטון');
  });

  test('the video actually plays, has the Hebrew caption track, and loads over the project base path', async ({ page }) => {
    await openPlayer(page);
    const v = page.locator('#video-dialog video');
    await expect.poll(async () => v.evaluate((el: HTMLVideoElement) => el.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.3);
    const info = await v.evaluate((el: HTMLVideoElement) => ({
      paused: el.paused,
      poster: el.poster,
      tracks: Array.from(el.textTracks).map((t) => `${t.kind}:${t.language}:${t.label}`),
      w: el.videoWidth,
      h: el.videoHeight,
      controls: el.controls,
      duration: el.duration,
    }));
    expect(info.paused).toBe(false);
    expect(info.controls).toBe(true);
    expect(info.poster).toContain(`${BASE}video/demo/dw-player-demo-poster.webp`);
    expect(info.tracks).toEqual(['captions:he:עברית']);
    expect([info.w, info.h]).toEqual([1280, 720]);
    expect(info.duration).toBeGreaterThan(8);
  });

  test('rights-pending mode: the poster, the dialog and the note all say this is a demo and not the Channel 13 report', async ({ page }) => {
    await page.goto('./');
    await expect(page.locator('#video')).toHaveAttribute('data-video-mode', 'demo');
    await expect(page.locator('.vid__badge')).toContainText('לא התחקיר');
    await expect(page.locator('.vid__cta')).toHaveText('הפעלת הדגמת הנגן');
    await expect(page.locator('.vid__note')).toContainText('אינו התחקיר של חדשות 13');
    await expect(page.locator('#vdlg-title')).toContainText('הדגמת נגן');
    expect(await page.locator('#video').innerText()).not.toMatch(/לצפייה בתחקיר המלא|באישור בעלי הזכויות/);
  });

  test('Escape closes the dialog, stops the media, removes the video element and returns focus to the Play button', async ({ page }) => {
    await openPlayer(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('#video-dialog')).toBeHidden();
    await expect(page.locator('#video-dialog video')).toHaveCount(0);
    await expect(page.locator('[data-video-open]')).toBeFocused();
    // requests the engine had already queued when the visitor pressed Escape may still show up; from here on nothing new may be asked for
    await page.waitForTimeout(300);
    const media: string[] = [];
    page.on('request', (r) => {
      if (/\/video\//.test(r.url())) media.push(r.url());
    });
    await page.waitForTimeout(700);
    expect(media, 'requests after close').toEqual([]);
  });

  test('the close button closes it (and on desktop a click on the dim area), and it can be opened again', async ({ page, isMobile }) => {
    await openPlayer(page);
    await page.locator('[data-video-close]').click();
    await expect(page.locator('#video-dialog')).toBeHidden();
    await expect(page.locator('[data-video-open]')).toBeFocused();
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog video')).toHaveCount(1);
    // a click on the dialog element itself (outside the panel) closes it. On a phone the panel fills the screen, so there is no dim area to click.
    if (isMobile) {
      await page.keyboard.press('Escape');
    } else {
      await page.mouse.click(40, 360); // left of the panel: the dialog element itself is under the pointer
    }
    await expect(page.locator('#video-dialog')).toBeHidden();
  });

  test('keyboard: Enter on the poster opens the player, Tab stays inside the dialog, the focused video is not trapped', async ({ page, browserName }) => {
    await page.goto('./');
    await page.locator('#video').scrollIntoViewIfNeeded();
    // Safari-family engines do not Tab onto buttons by default; focus the control directly there
    await page.locator('[data-video-open]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#video-dialog')).toBeVisible();
    // a modal may hand focus to the browser's own interface (activeElement is then the body) but must never hand it to the page behind it
    const seen: string[] = [];
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const where = await page.evaluate(() => {
        const a = document.activeElement;
        return !a || a === document.body ? 'browser' : a.closest('#video-dialog') ? 'dialog' : `PAGE:${a.tagName}.${a.className}`;
      });
      seen.push(where);
    }
    expect(
      seen.filter((w) => w.startsWith('PAGE')),
      `focus reached the page behind the modal (${browserName}): ${seen.join(', ')}`,
    ).toEqual([]);
    expect(seen, 'focus is still reachable inside the dialog while it is open').toContain('dialog');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-video-open]')).toBeFocused();
  });

  test('load failure: a visible, announced fallback with a retry and a clearly labelled article link; retry recovers', async ({ page }) => {
    await page.goto('./');
    await page.locator('#video').scrollIntoViewIfNeeded();
    // block the real files at the network level: the server then answers 404, which is what a broken, moved or blocked file looks like to the player
    await page.route(/\/video\/demo\/dw-player-demo\.(mp4|webm)$/, (r) => r.fulfill({ status: 404, body: 'nope' }));
    await page.locator('#video').scrollIntoViewIfNeeded();
    await page.locator('[data-video-open]').click();
    const err = page.locator('[data-video-err]');
    await expect(err).toBeVisible({ timeout: 10_000 });
    await expect(err).toHaveAttribute('role', 'alert');
    await expect(err).toContainText('הסרטון לא נטען');
    await expect(err.locator('a')).toHaveAttribute('href', /13tv\.co\.il/);
    await expect(err.locator('a')).toContainText('הכתבה באתר חדשות 13');
    await expect(err.locator('[data-video-retry]')).toBeFocused();
    // the page is still usable: close, then recover once the files are reachable again
    await page.unroute(/\/video\/demo\/dw-player-demo\.(mp4|webm)$/);
    await err.locator('[data-video-retry]').click();
    await expect(err).toBeHidden();
    const v = page.locator('#video-dialog video');
    await expect.poll(async () => v.evaluate((el: HTMLVideoElement) => el.currentTime), { timeout: 10_000 }).toBeGreaterThan(0.3);
  });

  test('the fullscreen control is offered where the browser supports it', async ({ page, browserName }) => {
    await openPlayer(page);
    const fs = page.locator('[data-video-fs]');
    await expect(fs).toBeVisible();
    if (browserName === 'chromium') {
      await fs.click();
      await expect.poll(() => page.evaluate(() => document.fullscreenElement?.tagName ?? null)).toBe('VIDEO');
      await page.evaluate(() => document.exitFullscreen());
    }
  });

  test('accessibility: axe finds nothing on the section or on the open dialog (default and high contrast)', async ({ page }) => {
    await page.goto('./');
    await settle(page);
    expect((await axe(page)).violations, 'section, default').toEqual([]);
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog video')).toHaveCount(1);
    expect((await axe(page)).violations, 'open dialog').toEqual([]);
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.documentElement.setAttribute('data-contrast', 'high'));
    expect((await axe(page)).violations, 'section, high contrast').toEqual([]);
    await page.locator('[data-video-open]').click();
    expect((await axe(page)).violations, 'open dialog, high contrast').toEqual([]);
  });

  test('motion: the ping and the dialog entrance stop with the OS setting and with the panel setting', async ({ browser }) => {
    for (const mode of ['os', 'panel'] as const) {
      const ctx = await browser.newContext({ reducedMotion: mode === 'os' ? 'reduce' : 'no-preference', locale: 'he-IL' });
      const page = await ctx.newPage();
      await page.goto('http://127.0.0.1:4321/digital-watch-webpage/');
      if (mode === 'panel') await page.evaluate(() => document.documentElement.setAttribute('data-motion', 'reduce'));
      const r = await page.evaluate(() => {
        const cs = getComputedStyle(document.querySelector('.vid__play')!, '::before');
        return {
          name: cs.animationName,
          dur: parseFloat(cs.animationDuration),
          tr: parseFloat(getComputedStyle(document.querySelector('.vid__poster')!).transitionDuration),
        };
      });
      expect(r.name === 'none' || r.dur < 0.01, `${mode}: ping`).toBe(true);
      expect(r.tr, `${mode}: hover transition`).toBeLessThan(0.01);
      await ctx.close();
    }
  });
});

const WIDTHS = [390, 768, 1024, 1440, 1920];
for (const w of WIDTHS) {
  test(`video section layout at ${w}px: a large 16:9 poster, no overflow, and the player fits the viewport`, async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit' && w < 700, 'phone widths are covered by the mobile projects');
    const h = w < 700 ? 844 : 900;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', locale: 'he-IL' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:4321${BASE}`);
    await settle(page);
    await noOverflow(page, `@${w}`);
    const poster = page.locator('.vid__poster');
    await poster.scrollIntoViewIfNeeded();
    const b = (await poster.boundingBox())!;
    expect(Math.abs(b.width / b.height - 16 / 9), '16:9').toBeLessThan(0.02);
    expect(b.width, 'a major visual anchor: at least 88% of a phone, 60% of a desktop screen').toBeGreaterThanOrEqual(w < 700 ? w * 0.88 : w * 0.6);
    const play = (await page.locator('.vid__play').boundingBox())!;
    expect(play.width).toBeGreaterThanOrEqual(44);
    // the poster does not move while the page settles (no layout shift): same box after a pause
    await page.waitForTimeout(300);
    expect((await poster.boundingBox())!.height).toBeCloseTo(b.height, 0);
    const isChromium = test.info().project.name === 'chromium';
    if (isChromium) {
      fs.mkdirSync(SHOTS, { recursive: true });
      // review screenshot only: the sticky header would otherwise be painted across the element
      await page.addStyleTag({ content: 'header.site{position:static!important}' });
      await page.locator('#video').screenshot({ path: path.join(SHOTS, `section-${w}.png`) });
    }
    await page.locator('[data-video-open]').click();
    const frame = (await page.locator('.vdlg__frame').boundingBox())!;
    expect(frame.x, 'frame inside the viewport (left)').toBeGreaterThanOrEqual(-0.5);
    expect(frame.x + frame.width, 'frame inside the viewport (right)').toBeLessThanOrEqual(w + 0.5);
    expect(frame.y + frame.height, 'frame inside the viewport (bottom)').toBeLessThanOrEqual(h + 0.5);
    // measure after the entrance animation: a box is scaled while it runs
    await page.evaluate(() => Promise.allSettled((document.querySelector('.vdlg__in') as HTMLElement).getAnimations().map((a) => a.finished)));
    const close = (await page.locator('[data-video-close]').boundingBox())!;
    expect(close.height).toBeGreaterThanOrEqual(44);
    await noOverflow(page, `dialog @${w}`);
    if (isChromium) {
      // review screenshot only: park the video on the "exposure" moment so the picture shows the story, not the first fade-in frame
      await page.evaluate(async () => {
        const v = document.querySelector('#video-dialog video') as HTMLVideoElement;
        v.pause();
        await new Promise<void>((res) => {
          v.addEventListener('seeked', () => res(), { once: true });
          v.currentTime = 3.6;
        });
      });
      await page.screenshot({ path: path.join(SHOTS, `dialog-${w}.png`) });
    }
    await ctx.close();
  });
}

test('rights-pending build: the public tree contains the demo only, never the source recording or a report folder', async () => {
  const dist = path.join(process.cwd(), 'dist');
  const all: string[] = [];
  (function walk(d: string) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else all.push(p);
    }
  })(dist);
  const rel = all.map((f) => path.relative(dist, f).split(path.sep).join('/'));
  expect(rel.filter((f) => /\.(mp4|mov|m4v|webm)$/i.test(f)).sort()).toEqual(['video/demo/dw-player-demo.mp4', 'video/demo/dw-player-demo.webm']);
  expect(rel.filter((f) => f.startsWith('video/report'))).toEqual([]);
  expect(rel.filter((f) => /7F0744CB/i.test(f))).toEqual([]);
  for (const f of all.filter((x) => /\.(mp4|webm)$/.test(x))) expect(fs.statSync(f).size, `${f} size`).toBeLessThan(1.5 * 1024 * 1024);
});
