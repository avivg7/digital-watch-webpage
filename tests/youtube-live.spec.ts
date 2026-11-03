import { expect, test } from '@playwright/test';

// LIVE proof, opt-in (DW_LIVE=1): the REAL YouTube player, over the real network, no mocks. It plays the owner's upload inside the page and measures the player's own
// <video> element: currentTime must advance, the duration must be the report's (about 78 s), no error panel. It is skipped by default because it needs internet access
// and YouTube may treat automated browsers or data-centre addresses differently; a skip is a skip, not a pass.
//   DW_LIVE=1 npx playwright test tests/youtube-live.spec.ts
test.skip(!process.env.DW_LIVE, 'live YouTube test: set DW_LIVE=1 (needs internet; not part of the default suite)');

const ID = 'DBdZiXJb9OI';

test('the real YouTube player plays the report inside the page, and closing the dialog destroys it', async ({ page, isMobile, browserName }) => {
  test.setTimeout(90_000);
  const other: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('http://127.0.0.1:4321') && !r.url().startsWith('data:')) other.push(new URL(r.url()).host);
  });
  await page.goto('./');
  await page.waitForTimeout(1500);
  expect(other, 'third-party requests before the click').toEqual([]);

  await page.locator('#video').scrollIntoViewIfNeeded();
  await page.locator('[data-video-open]').click();
  const iframe = page.locator('#video-dialog iframe');
  await expect(iframe).toHaveAttribute('src', new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${ID}\\?`));
  const frame = await (await iframe.elementHandle())!.contentFrame();
  expect(frame, 'the embedded frame').not.toBeNull();
  await frame!.waitForSelector('video', { timeout: 30_000 });
  expect(new Set(other).has('www.youtube-nocookie.com'), 'the embed host was contacted after the click').toBe(true);

  const read = () =>
    frame!.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement;
      return {
        t: v.currentTime,
        paused: v.paused,
        dur: v.duration,
        rs: v.readyState,
        w: v.videoWidth,
        err: document.querySelector('.ytp-error')?.textContent ?? null,
      };
    });
  // autoplay after the click is allowed by most engines; where the engine's policy keeps the player paused, press the player's own play button, as a visitor would
  let s = await read();
  const t0 = Date.now();
  while (s.paused && Date.now() - t0 < 8000) {
    await page.waitForTimeout(500);
    s = await read();
  }
  const autoplayed = !s.paused;
  if (s.paused) await frame!.locator('.ytp-large-play-button, .ytp-play-button').first().click({ timeout: 10_000, force: true });
  await expect.poll(async () => (await read()).t, { timeout: 30_000, message: 'playback position must advance' }).toBeGreaterThan(1.5);
  const t1 = (await read()).t;
  await page.waitForTimeout(3000);
  s = await read();
  test.info().annotations.push({ type: 'autoplay-worked', description: String(autoplayed) });
  expect(s.err, 'YouTube error text (restricted, removed, referrer)').toBeNull();
  expect(s.paused).toBe(false);
  expect(s.t - t1, 'the position keeps advancing in real time').toBeGreaterThan(2);
  expect(s.dur, "the report's length (about 78 s)").toBeGreaterThan(70);
  expect(s.dur).toBeLessThan(90);
  expect(s.w).toBeGreaterThan(300);

  // fullscreen from the player's own button (desktop engines that allow it under automation)
  if (!isMobile) {
    const fsBtn = frame!.locator('button[aria-label*="מסך מלא"], button[aria-label*="ull screen"], .ytp-fullscreen-button').first();
    await fsBtn.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => undefined);
    if (await fsBtn.count()) {
      await fsBtn.click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(800);
      const fsTag = await page.evaluate(() => document.fullscreenElement?.tagName ?? null);
      test.info().annotations.push({ type: 'fullscreen-element', description: String(fsTag) });
      // the player's own fullscreen button must put THE IFRAME into fullscreen (our `allow` includes fullscreen); WebKit under automation does not grant it
      if (browserName !== 'webkit') expect(fsTag, 'fullscreen from the YouTube player button').toBe('IFRAME');
      if (fsTag) await page.evaluate(() => document.exitFullscreen());
    }
  }

  await page.locator('[data-video-close]').first().click();
  await expect(page.locator('#video-dialog')).toBeHidden();
  await expect(page.locator('iframe')).toHaveCount(0);
  expect(
    page.frames().filter((f) => /youtube/.test(f.url())),
    'the player frame must be destroyed',
  ).toHaveLength(0);
  expect(await frame!.isDetached(), 'the old frame is detached, so its audio cannot continue').toBe(true);
  await expect(page.locator('[data-video-open]')).toBeFocused();
});

test('keyboard way out of the real player: from inside the YouTube frame, forward Tab reaches the second close button, Enter closes and focus returns to Play', async ({
  page,
  browserName,
  isMobile,
}) => {
  test.skip(isMobile, 'touch profile: no keyboard');
  test.skip(browserName === 'webkit', 'Safari-family engines do not Tab onto buttons by default (system setting); not exercised under automation');
  test.setTimeout(90_000);
  await page.goto('./');
  await page.locator('#video').scrollIntoViewIfNeeded();
  await page.locator('[data-video-open]').click();
  const iframe = page.locator('#video-dialog iframe');
  const frame = await (await iframe.elementHandle())!.contentFrame();
  await frame!.waitForSelector('video', { timeout: 30_000 });
  await page.waitForTimeout(3000);
  await iframe.click({ position: { x: 300, y: 200 } }); // puts the keyboard focus inside the YouTube document
  let reached = 0;
  for (let i = 1; i <= 60 && !reached; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate(() => !!document.activeElement?.hasAttribute('data-video-close'))) reached = i;
  }
  expect(reached, 'Tab presses from inside the player to a close button').toBeGreaterThan(0);
  test.info().annotations.push({ type: 'tabs-to-close', description: String(reached) });
  await page.keyboard.press('Enter');
  await expect(page.locator('#video-dialog')).toBeHidden();
  await expect(page.locator('[data-video-open]')).toBeFocused();
  await expect(page.locator('iframe')).toHaveCount(0);
});
