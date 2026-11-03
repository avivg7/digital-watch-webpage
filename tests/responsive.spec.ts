import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { ROUTES, noOverflow, settle } from './helpers';

// Seven widths, every route: nothing overflows horizontally, the primary actions are reachable, and (chromium only) a screenshot is saved for review.
const WIDTHS = [320, 390, 768, 1024, 1366, 1440, 1920];
const OUT = path.join(process.cwd(), 'test-results', 'shots');

for (const w of WIDTHS) {
  test(`layout at ${w}px on every route`, async ({ browser, browserName }) => {
    test.skip(browserName === 'webkit' && w < 700, 'phone widths are covered by the mobile projects');
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 800 : 900 }, reducedMotion: 'reduce', locale: 'he-IL' });
    const page = await ctx.newPage();
    for (const route of ROUTES) {
      await page.goto(`http://127.0.0.1:4321/digital-watch-webpage/${route === './' ? '' : route}`);
      await settle(page);
      await noOverflow(page, `${route} @${w}`);
      if (route === './') {
        // the hero message and the main call to action are visible without scrolling past them
        await expect(page.locator('h1')).toBeInViewport();
        const cta = page.locator('.hero__cta .btn--primary');
        await expect(cta).toBeVisible();
        const box = await cta.boundingBox();
        expect(box!.height).toBeGreaterThanOrEqual(44);
        // no image is wider than its container
        const wide = await page.evaluate(() =>
          Array.from(document.images)
            .filter((i) => !i.closest('.filmstrip') && (i.getBoundingClientRect().right > window.innerWidth + 1 || i.getBoundingClientRect().left < -1))
            .map((i) => i.src),
        );
        expect(wide, 'images outside the viewport').toEqual([]);
      }
      if (browserName === 'chromium') {
        fs.mkdirSync(path.join(OUT, String(w)), { recursive: true });
        await page.screenshot({ path: path.join(OUT, String(w), `${route === './' ? 'home' : route.replace('/', '')}.png`), fullPage: true });
      }
    }
    await ctx.close();
  });
}

test('text enlarged to 150% on a 320 px screen (about 400% zoom) still has no horizontal scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 700 }, reducedMotion: 'reduce', locale: 'he-IL' });
  const page = await ctx.newPage();
  for (const route of ROUTES) {
    await page.goto(`http://127.0.0.1:4321/digital-watch-webpage/${route === './' ? '' : route}`);
    await page.evaluate(() => document.documentElement.setAttribute('data-text', '3'));
    await settle(page);
    await noOverflow(page, `${route} @320 text 150%`);
  }
  await ctx.close();
});

test('touch targets: every button and link in the header, hero, gallery controls and panel is at least 44 px', async ({ page }) => {
  await page.goto('./');
  await page.locator('#a11y-open').click();
  const small = await page.evaluate(() => {
    const sel = '.nav .btn, .menu-toggle, .hero__cta .btn, .arrow, .zoom, .a11y-fab, .a11y-panel button';
    return Array.from(document.querySelectorAll(sel))
      .map((e) => ({ c: (e as HTMLElement).className, r: e.getBoundingClientRect() }))
      .filter((x) => x.r.width > 0 && (x.r.height < 43.5 || x.r.width < 43.5))
      .map((x) => `${x.c} ${Math.round(x.r.width)}x${Math.round(x.r.height)}`);
  });
  expect(small).toEqual([]);
});
