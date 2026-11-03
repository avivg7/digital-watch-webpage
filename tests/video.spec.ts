import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { axe, noOverflow, settle } from './helpers';

// The featured report video: a click-to-load YouTube embed. These tests use a TEST DOUBLE for the YouTube document (every request to the embed URL is answered locally),
// so they prove OUR wiring: nothing before the click, the exact video id and iframe attributes after it, teardown, focus, failure paths, CSP, no-JS, layout, accessibility.
// They do NOT prove that YouTube plays the report: that is tests/youtube-live.spec.ts (opt-in, real network, real player).
const BASE = '/digital-watch-webpage/';
const ID = 'DBdZiXJb9OI';
const EMBED = /^https:\/\/www\.youtube-nocookie\.com\/embed\//;
const WATCH = `https://www.youtube.com/watch?v=${ID}`;
const SHOTS = path.join(process.cwd(), 'test-results', 'shots', 'video');
const MOCK_HTML =
  '<!doctype html><meta charset="utf-8"><title>test double</title><body style="margin:0;height:100vh;display:grid;place-items:center;background:#0b1f52;color:#e9f0ff;font:600 18px sans-serif;text-align:center">TEST DOUBLE<br>not YouTube: a stand-in for layout and wiring tests</body>';

async function mockEmbed(page: Page) {
  await page.route(EMBED, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: MOCK_HTML }));
}
async function openPlayer(page: Page) {
  await mockEmbed(page);
  await page.goto('./');
  await page.locator('#video').scrollIntoViewIfNeeded();
  await page.locator('[data-video-open]').click();
  await expect(page.locator('#video-dialog')).toBeVisible();
  await expect(page.locator('#video-dialog iframe')).toHaveCount(1);
}

test.describe('featured report video (YouTube embed, wiring)', () => {
  test('before Play: no request to any other origin, no iframe, no video element, nothing from YouTube or Google', async ({ page }) => {
    const other: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:4321') && !r.url().startsWith('data:')) other.push(r.url());
    });
    await page.goto('./');
    await settle(page);
    await page.waitForTimeout(600);
    expect(other, 'third-party requests before the click').toEqual([]);
    expect(await page.locator('iframe, video, audio, embed, object').count()).toBe(0);
    expect(await page.locator('script[src*="youtube"], link[href*="youtube"], img[src*="ytimg"]').count()).toBe(0);
  });

  test('the primary Play control is an in-page button; it opens the player for the exact video id and navigates nowhere', async ({ page, context }) => {
    await mockEmbed(page);
    await page.goto('./');
    const play = page.locator('[data-video-open]');
    expect(await play.evaluate((el) => el.tagName)).toBe('BUTTON');
    expect(await play.evaluate((el) => !!el.closest('a') || !!el.querySelector('a'))).toBe(false);
    await expect(play).toContainText('לצפייה בתחקיר המלא');
    const before = page.url();
    const pages = context.pages().length;
    await play.scrollIntoViewIfNeeded();
    await play.click();
    await expect(page.locator('#video-dialog')).toBeVisible();
    expect(page.url()).toBe(before);
    expect(context.pages().length).toBe(pages);
    const f = page.locator('#video-dialog iframe');
    await expect(f).toHaveCount(1);
    const attrs = await f.evaluate((el: HTMLIFrameElement) => ({
      src: el.src,
      title: el.title,
      allow: el.allow,
      fs: el.allowFullscreen,
      rp: el.referrerPolicy,
      parentOrigin: location.origin,
    }));
    const u = new URL(attrs.src);
    expect(`${u.origin}${u.pathname}`).toBe(`https://www.youtube-nocookie.com/embed/${ID}`);
    expect(u.searchParams.get('autoplay')).toBe('1');
    expect(u.searchParams.get('rel')).toBe('0');
    expect(u.searchParams.get('playsinline')).toBe('1');
    expect(u.searchParams.get('origin')).toBe(attrs.parentOrigin);
    expect(attrs.title).toBe('המשמר הדיגיטלי - סכנות החיילים במרחב הדיגיטלי - כתבה בערוץ 13');
    expect(attrs.allow).toMatch(/autoplay/);
    expect(attrs.allow).toMatch(/encrypted-media/);
    expect(attrs.fs).toBe(true);
    expect(attrs.rp).toBe('strict-origin-when-cross-origin');
    await expect(page.locator('video')).toHaveCount(0);
  });

  test('the section is the report only: no demo wording, no demo media, a YouTube link for the same video, and the press cards stay separate', async ({
    page,
  }) => {
    await page.goto('./');
    const text = await page.locator('#video').innerText();
    expect(text).not.toMatch(/הדגמ|אינו התחקיר|לא התחקיר|demo/i);
    const html = await page.content();
    expect(html).not.toMatch(/dw-player-demo|\/video\/|\.(mp4|webm|vtt)\b/);
    const links = await page.locator('#video a[href]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l).toBe(WATCH);
    await expect(page.locator('#video a[href*="13tv.co.il"], #video a[href*="gly.co.il"]')).toHaveCount(0);
    await expect(page.locator('#evidence a[href*="gly.co.il"]')).toHaveCount(1);
    await expect(page.locator('#evidence a[href*="13tv.co.il"]')).toHaveCount(1);
    await expect(page.locator('.vid__note')).toContainText('הזכויות בו שמורות לבעליהן');
    expect(text).not.toMatch(/באישור|אושר|מאושר/);
  });

  test('Escape closes the dialog, removes the iframe completely, and returns focus to the Play button; it opens again with a fresh iframe', async ({
    page,
  }) => {
    await openPlayer(page);
    expect(page.frames().filter((f) => EMBED.test(f.url()))).toHaveLength(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#video-dialog')).toBeHidden();
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(
      page.frames().filter((f) => /youtube/.test(f.url())),
      'the embedded frame must be gone',
    ).toHaveLength(0);
    await expect(page.locator('[data-video-open]')).toBeFocused();
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog iframe')).toHaveCount(1);
  });

  test('the close button closes it (and on desktop a click on the dim area)', async ({ page, isMobile }) => {
    await openPlayer(page);
    await page.locator('[data-video-close]').first().click();
    await expect(page.locator('#video-dialog')).toBeHidden();
    await expect(page.locator('iframe')).toHaveCount(0);
    await expect(page.locator('[data-video-open]')).toBeFocused();
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog iframe')).toHaveCount(1);
    // a click on the dialog element itself (outside the panel) closes it. On a phone the panel fills the screen, so there is no dim area to click.
    if (isMobile) await page.keyboard.press('Escape');
    else await page.mouse.click(40, 360);
    await expect(page.locator('#video-dialog')).toBeHidden();
    await expect(page.locator('iframe')).toHaveCount(0);
  });

  test('keyboard: Enter on the poster opens the player, the first focus is the close button, Tab never reaches the page behind the modal', async ({
    page,
    browserName,
  }) => {
    await mockEmbed(page);
    await page.goto('./');
    await page.locator('#video').scrollIntoViewIfNeeded();
    await page.locator('[data-video-open]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#video-dialog')).toBeVisible();
    await expect(page.locator('[data-video-close]').first()).toBeFocused();
    const seen: string[] = [];
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      seen.push(
        await page.evaluate(() => {
          const a = document.activeElement;
          return !a || a === document.body ? 'browser' : a.closest('#video-dialog') ? 'dialog' : `PAGE:${a.tagName}.${a.className}`;
        }),
      );
    }
    expect(
      seen.filter((w) => w.startsWith('PAGE')),
      `focus reached the page behind the modal (${browserName}): ${seen.join(', ')}`,
    ).toEqual([]);
    expect(seen).toContain('dialog');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-video-open]')).toBeFocused();
  });

  test('failure: a player that never loads ends in an announced fallback with a YouTube link for the same video; retry builds a new player', async ({
    page,
  }) => {
    await page.route(EMBED, () => {
      /* never answered: the frame stays blank, as with a stalled connection */
    });
    await page.goto('./');
    await page.evaluate(() => document.getElementById('video-dialog')!.setAttribute('data-timeout', '1500'));
    await page.locator('#video').scrollIntoViewIfNeeded();
    await page.locator('[data-video-open]').click();
    const err = page.locator('[data-video-err]');
    await expect(err).toBeVisible({ timeout: 8000 });
    await expect(err).toHaveAttribute('role', 'alert');
    await expect(err).toContainText('הסרטון לא נטען כאן');
    await expect(err.locator('a')).toHaveAttribute('href', WATCH);
    await expect(err.locator('a')).toContainText('לצפייה ביוטיוב');
    await expect(page.locator('#video-dialog iframe')).toBeHidden();
    await expect(page.locator('video')).toHaveCount(0);
    // retry with a working embed (the test double) replaces the hung one
    await page.unroute(EMBED);
    await mockEmbed(page);
    await err.locator('[data-video-retry]').click();
    await expect(err).toBeHidden();
    await expect(page.locator('#video-dialog iframe')).toHaveCount(1);
    await expect(page.locator('#video-dialog iframe')).toBeVisible();
  });

  test('failure: a Content-Security-Policy refusal of the frame ends in the same fallback, with the same YouTube link', async ({ page }) => {
    await mockEmbed(page);
    await page.goto('./');
    await page.locator('#video').scrollIntoViewIfNeeded();
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog iframe')).toBeVisible();
    // the page's listener reacts to a frame-src violation report; the browser's own report is dispatched here, as it would be if the host were refused
    await page.evaluate(() =>
      document.dispatchEvent(
        new SecurityPolicyViolationEvent('securitypolicyviolation', { violatedDirective: 'frame-src', blockedURI: 'https://www.youtube-nocookie.com/embed/x' }),
      ),
    );
    await expect(page.locator('[data-video-err]')).toBeVisible();
    await expect(page.locator('[data-video-err] a')).toHaveAttribute('href', WATCH);
    await expect(page.locator('#video-dialog iframe')).toBeHidden();
  });

  test('failure: offline at the time of the click shows the fallback at once, without building a frame', async ({ page, context }) => {
    await page.goto('./');
    await page.locator('#video').scrollIntoViewIfNeeded();
    await context.setOffline(true);
    await page.locator('[data-video-open]').click();
    await expect(page.locator('[data-video-err]')).toBeVisible();
    await expect(page.locator('[data-video-err] a')).toHaveAttribute('href', WATCH);
    await context.setOffline(false);
  });

  test('poster: the custom video_front picture is shown before any interaction, sharp, local, under the project base path, and nothing is hidden behind an iframe', async ({
    page,
    request,
  }) => {
    await page.goto('./');
    await page.locator('#video').scrollIntoViewIfNeeded();
    const img = page.locator('.vid__poster img');
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    const info = await img.evaluate((el: HTMLImageElement) => ({
      src: el.currentSrc,
      alt: el.alt,
      nw: el.naturalWidth,
      nh: el.naturalHeight,
      fit: getComputedStyle(el).objectFit,
      hiddenPic: el.closest('picture')?.getAttribute('aria-hidden'),
      rect: JSON.parse(JSON.stringify(el.getBoundingClientRect())),
      box: JSON.parse(JSON.stringify((el.closest('button') as HTMLElement).getBoundingClientRect())),
      dpr: devicePixelRatio,
    }));
    expect(info.src).toContain(`${BASE}img/video-front-`);
    expect(info.src).toMatch(/\.(avif|webp)$/);
    expect(info.fit).toBe('cover');
    expect(info.alt).toBe('');
    expect(info.hiddenPic).toBe('true');
    expect(Math.abs(info.nw / info.nh - 16 / 9), 'the file itself is exactly 16:9').toBeLessThan(0.01);
    // sharp: the browser picked a file wide enough for the box (naturalWidth is density-corrected for srcset, so read the chosen file's width from its name)
    const chosen = Number(/video-front-(\d+)\./.exec(info.src)![1]);
    expect(chosen, `file chosen for a ${Math.round(info.box.width)} px box`).toBeGreaterThanOrEqual(info.box.width >= 700 ? 1200 : 640);
    // the picture fills the whole poster box
    expect(Math.abs(info.rect.width - info.box.width)).toBeLessThan(1);
    expect(Math.abs(info.rect.height - info.box.height)).toBeLessThan(1);
    expect(await page.locator('iframe').count(), 'no iframe before interaction').toBe(0);
    for (const f of ['avif', 'webp'])
      for (const w of [640, 1200, 1920]) expect((await request.get(`${BASE}img/video-front-${w}.${f}`)).status(), `${w}.${f}`).toBe(200);
  });

  test('poster: a real button named in Hebrew that announces a video launch; blue centred Play disc; visible keyboard focus', async ({ page }) => {
    await page.goto('./');
    const btn = page.getByRole('button', { name: /לצפייה בתחקיר המלא/ });
    await expect(btn).toHaveCount(1);
    await expect(btn).toHaveAttribute('aria-haspopup', 'dialog');
    expect(await btn.evaluate((el) => el.tagName)).toBe('BUTTON');
    const name = await btn.evaluate((el) => (el as HTMLElement).innerText + ' ' + el.textContent);
    expect(name).toMatch(/סרטון מיוטיוב/);
    await btn.scrollIntoViewIfNeeded();
    const m = await page.evaluate(() => {
      const poster = document.querySelector('.vid__poster')!.getBoundingClientRect();
      const play = document.querySelector('.vid__play') as HTMLElement;
      const p = play.getBoundingClientRect();
      const label = document.querySelector('.vid__label')!.getBoundingClientRect();
      const cs = getComputedStyle(play);
      return {
        dx: p.x + p.width / 2 - (poster.x + poster.width / 2),
        dy: p.y + p.height / 2 - (poster.y + poster.height / 2),
        size: p.width,
        bg: cs.backgroundImage,
        svgVisible: getComputedStyle(play.querySelector('svg')!).fill,
        labelInside: label.left >= poster.left && label.right <= poster.right && label.bottom <= poster.bottom,
        labelBelowPlay: label.top >= p.bottom - 0.5,
      };
    });
    expect(Math.abs(m.dx), 'horizontally centred').toBeLessThan(1.5);
    expect(Math.abs(m.dy), 'vertically centred').toBeLessThan(1.5);
    expect(m.size, 'prominent').toBeGreaterThanOrEqual(58);
    expect(m.bg, 'brand blue (#0474fc to #0a58ca)').toContain('rgb(4, 116, 252)');
    expect(m.bg).toContain('rgb(10, 88, 202)');
    expect(m.svgVisible).toBe('rgb(255, 255, 255)');
    expect(m.labelInside && m.labelBelowPlay, 'the label sits below the disc, inside the picture').toBe(true);
    await btn.focus();
    const f = await btn.evaluate((el) => ({
      style: getComputedStyle(el).outlineStyle,
      width: parseFloat(getComputedStyle(el).outlineWidth),
      colour: getComputedStyle(el).outlineColor,
    }));
    expect(f.style).not.toBe('none');
    expect(f.width).toBeGreaterThanOrEqual(3);
  });

  test('poster: hover gives feedback on desktop (the disc grows, the picture eases in), and Play swaps the poster for the player without leaving the page', async ({
    page,
    isMobile,
  }) => {
    await mockEmbed(page);
    await page.goto('./');
    const poster = page.locator('.vid__poster');
    await poster.scrollIntoViewIfNeeded();
    if (!isMobile) {
      const t0 = await page.locator('.vid__play').evaluate((el) => getComputedStyle(el).transform);
      await poster.hover();
      await expect.poll(() => page.locator('.vid__play').evaluate((el) => getComputedStyle(el).transform)).not.toBe(t0);
    }
    const url = page.url();
    await poster.click();
    await expect(page.locator('#video-dialog iframe')).toBeVisible();
    expect(page.url()).toBe(url);
    expect(await page.locator('#video-dialog iframe').evaluate((el: HTMLIFrameElement) => el.src)).toContain(`/embed/${ID}`);
  });

  test('CSP: frame-src allows exactly the privacy-enhanced YouTube host; another YouTube host is refused by the browser; no wildcard anywhere', async ({
    page,
  }) => {
    await mockEmbed(page);
    await page.goto('./');
    const csp = (await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content'))!;
    expect(csp).toContain('frame-src https://www.youtube-nocookie.com;');
    expect(csp).not.toMatch(/\*/);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    const verdict = await page.evaluate(
      () =>
        new Promise<string[]>((resolve) => {
          const out: string[] = [];
          document.addEventListener('securitypolicyviolation', (e) => out.push(`${e.violatedDirective}|${e.blockedURI}`));
          for (const src of ['https://www.youtube.com/embed/x', 'https://example.com/']) {
            const f = document.createElement('iframe');
            f.src = src;
            document.body.append(f);
          }
          setTimeout(() => resolve(out), 800);
        }),
    );
    expect(verdict.filter((v) => /^(frame-src|child-src)/.test(v)).length, `violations: ${verdict.join(', ')}`).toBe(2);
    await page.evaluate(() => document.querySelectorAll('body > iframe').forEach((f) => f.remove()));
  });

  test('JavaScript off: no player, no frame, and a normal link to the SAME YouTube video', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false, locale: 'he-IL' });
    const page = await ctx.newPage();
    await page.goto('http://127.0.0.1:4321/digital-watch-webpage/');
    await expect(page.locator('.vid__poster')).toBeHidden();
    await expect(page.locator('.vid__nojs a')).toHaveAttribute('href', WATCH);
    await expect(page.locator('.vid__article a')).toHaveAttribute('href', WATCH);
    expect(await page.locator('iframe, video').count()).toBe(0);
    await ctx.close();
  });

  test('privacy page: says nothing connects to YouTube before Play, names the host, and makes no compliance claim', async ({ page }) => {
    await page.goto('privacy/');
    const t = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    expect(t).toContain('www.youtube-nocookie.com');
    expect(t).toMatch(/עד שתלחצו[^.]*אין שום חיבור ליוטיוב/);
    expect(t).toMatch(/אינו אומר שלא מועבר מידע/);
    expect(t).toMatch(/אין באמור כאן הצהרה על עמידה בדין/);
    expect(t).not.toMatch(/GDPR|תואם|עומד בדרישות|מאושר/);
    await expect(page.locator('main a[href="https://policies.google.com/privacy"]')).toHaveCount(1);
  });

  test('accessibility: axe finds nothing on the section or on the open dialog (default contrast)', async ({ page }) => {
    await mockEmbed(page);
    await page.goto('./');
    await settle(page);
    expect((await axe(page)).violations, 'section').toEqual([]);
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog iframe')).toHaveCount(1);
    expect((await axe(page)).violations, 'open dialog').toEqual([]);
  });

  test('accessibility: high contrast: axe finds nothing on the section or the open dialog, and the poster overlay overrides really apply', async ({ page }) => {
    await mockEmbed(page);
    await page.goto('./');
    await page.evaluate(() => document.documentElement.setAttribute('data-contrast', 'high'));
    await settle(page);
    expect((await axe(page)).violations, 'section, high contrast').toEqual([]);
    // a mistyped selector once silently disabled these overrides, and axe did not notice: assert the computed styles
    const hc = await page.evaluate(() => ({
      labelBg: getComputedStyle(document.querySelector('.vid__label')!).backgroundColor,
      labelBorder: getComputedStyle(document.querySelector('.vid__label')!).borderTopColor,
      playBg: getComputedStyle(document.querySelector('.vid__play')!).backgroundColor,
      playBorder: getComputedStyle(document.querySelector('.vid__play')!).borderTopColor,
      shade: getComputedStyle(document.querySelector('.vid__shade')!).backgroundColor,
    }));
    expect(hc.labelBg).toBe('rgb(0, 0, 0)');
    expect(hc.labelBorder).toBe('rgb(255, 255, 255)');
    expect(hc.playBg).toBe('rgb(0, 0, 0)');
    expect(hc.playBorder).toBe('rgb(255, 230, 0)');
    expect(hc.shade).toMatch(/^rgba\(0, 0, 0/);
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog iframe')).toHaveCount(1);
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
          img: parseFloat(getComputedStyle(document.querySelector('.vid__pic img')!).transitionDuration),
        };
      });
      expect(r.name === 'none' || r.dur < 0.01, `${mode}: ping`).toBe(true);
      expect(r.tr, `${mode}: hover transition`).toBeLessThan(0.01);
      expect(r.img, `${mode}: picture zoom`).toBeLessThan(0.01);
      await ctx.close();
    }
  });
});

const WIDTHS = [320, 390, 768, 1024, 1440, 1920];
for (const w of WIDTHS) {
  test(`video section layout at ${w}px: a large 16:9 poster, no overflow, and the player fits the viewport`, async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit' && w < 700, 'phone widths are covered by the mobile projects');
    const h = w < 700 ? 844 : 900;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce', locale: 'he-IL' });
    const page = await ctx.newPage();
    await mockEmbed(page);
    await page.goto(`http://127.0.0.1:4321${BASE}`);
    await settle(page);
    await noOverflow(page, `@${w}`);
    const poster = page.locator('.vid__poster');
    await poster.scrollIntoViewIfNeeded();
    const b = (await poster.boundingBox())!;
    expect(Math.abs(b.width / b.height - 16 / 9), '16:9').toBeLessThan(0.02);
    expect(b.width, 'a major visual anchor: at least 88% of a phone, 60% of a desktop screen').toBeGreaterThanOrEqual(w < 700 ? w * 0.88 : w * 0.6);
    const play = (await page.locator('.vid__play').boundingBox())!;
    const label = (await page.locator('.vid__label').boundingBox())!;
    expect(play.width).toBeGreaterThanOrEqual(58);
    expect(Math.abs(play.x + play.width / 2 - (b.x + b.width / 2)), 'Play centred horizontally').toBeLessThan(1.5);
    expect(Math.abs(play.y + play.height / 2 - (b.y + b.height / 2)), 'Play centred vertically').toBeLessThan(1.5);
    expect(label.y, 'label below the disc').toBeGreaterThanOrEqual(play.y + play.height - 0.5);
    expect(label.x).toBeGreaterThanOrEqual(b.x);
    expect(label.x + label.width).toBeLessThanOrEqual(b.x + b.width);
    expect(label.y + label.height).toBeLessThanOrEqual(b.y + b.height);
    await expect(page.locator('.vid__poster img')).toHaveJSProperty('complete', true);
    await page.waitForTimeout(300);
    expect((await poster.boundingBox())!.height, 'no layout shift').toBeCloseTo(b.height, 0);
    const isChromium = test.info().project.name === 'chromium';
    if (isChromium) {
      fs.mkdirSync(SHOTS, { recursive: true });
      // review screenshot only: the sticky header would otherwise be painted across the element
      await page.addStyleTag({ content: 'header.site{position:static!important}' });
      await page.locator('#video').screenshot({ path: path.join(SHOTS, `section-${w}.png`) });
    }
    await page.locator('[data-video-open]').click();
    await expect(page.locator('#video-dialog iframe')).toBeVisible();
    await page.evaluate(() => Promise.allSettled((document.querySelector('.vdlg__in') as HTMLElement).getAnimations().map((a) => a.finished)));
    const frame = (await page.locator('.vdlg__frame').boundingBox())!;
    expect(frame.x, 'frame inside the viewport (left)').toBeGreaterThanOrEqual(-0.5);
    expect(frame.x + frame.width, 'frame inside the viewport (right)').toBeLessThanOrEqual(w + 0.5);
    expect(frame.y + frame.height, 'frame inside the viewport (bottom)').toBeLessThanOrEqual(h + 0.5);
    expect(Math.abs(frame.width / frame.height - 16 / 9), 'player is 16:9').toBeLessThan(0.02);
    for (const c of await page.locator('[data-video-close]').all()) expect((await c.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    await noOverflow(page, `dialog @${w}`);
    // the visible fallback link under the player is reachable on every width
    await expect(page.locator('.vdlg__note a')).toBeInViewport();
    if (isChromium) await page.screenshot({ path: path.join(SHOTS, `dialog-${w}.png`) });
    await ctx.close();
  });
}

test('the built public tree hosts no video or audio file and references no demo clip, source recording or YouTube image host', async () => {
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
  expect(rel.filter((f) => /\.(mp4|mov|m4v|webm|mkv|mp3|m4a|wav|vtt)$/i.test(f) || f.startsWith('video/'))).toEqual([]);
  expect(rel.filter((f) => /7F0744CB|demo/i.test(f))).toEqual([]);
  for (const f of all.filter((x) => /\.(html|js|css|json|xml|txt)$/.test(x))) {
    const t = fs.readFileSync(f, 'utf8');
    expect(t, `${f}`).not.toMatch(/dw-player-demo|7F0744CB|ytimg\.com|googlevideo\.com|youtube\.com\/iframe_api/);
    for (const m of t.matchAll(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{6,})/g))
      expect(m[1].slice(0, 11), `${f}: video id`).toBe(ID);
  }
});
