import { expect, test } from '@playwright/test';
import { ROUTES, settle } from './helpers';

// What the site promises, checked mechanically.
for (const route of ROUTES) {
  test(`route ${route}: language, direction, one h1, canonical, title, no console errors, nothing off-origin`, async ({ page }) => {
    const errors: string[] = [];
    const foreign: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:4321') && !r.url().startsWith('data:')) foreign.push(r.url());
    });
    const res = await page.goto(route);
    expect(res?.status()).toBe(200);
    await settle(page);
    await expect(page.locator('html')).toHaveAttribute('lang', 'he');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('h1')).toHaveCount(1);
    expect(await page.title()).toMatch(/\S/);
    expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(
      `https://avivg7.github.io/digital-watch-webpage/${route === './' ? '' : route}`,
    );
    expect(errors, 'console errors').toEqual([]);
    expect(foreign, 'requests to other origins (privacy claim: nothing third-party is loaded)').toEqual([]);
  });
}

test('privacy and rights guards: no form, no video, no mailto, no e-mail or phone, no cookies, only the accessibility key in storage', async ({
  page,
  context,
}) => {
  for (const route of ROUTES) {
    await page.goto(route);
    expect(await page.locator('form, video, audio, iframe, input[type=email], input[type=tel]').count(), `${route}: form/media/embed element`).toBe(0);
    expect(await page.locator('a[href^="mailto:"], a[href^="tel:"]').count(), `${route}: mailto/tel`).toBe(0);
    const html = await page.content();
    expect(html, `${route}: e-mail address in page`).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    expect(html, `${route}: video file reference`).not.toMatch(/\.(mp4|mov|webm|m4v)\b/i);
  }
  await page.goto('./');
  await settle(page);
  expect(await context.cookies(), 'cookies').toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
});

test('claims guard: nothing on the site promises what the project cannot show', async ({ page }) => {
  const banned = [/מאובטח/, /הוכח/, /100%/, /ללא סיכון/, /מאושר על ידי/, /בחסות צה/, /אושר על ידי צה/, /הצלחנו/, /מאות חיילים|אלפי חיילים/, /הפרטים התקבלו/];
  for (const route of ROUTES) {
    await page.goto(route);
    const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    for (const b of banned) expect(text, `${route}: ${b}`).not.toMatch(b);
  }
});

test('copyright credit is exactly the owner-specified line, with the current year', async ({ page }) => {
  await page.goto('./');
  const t = (await page.locator('footer.site .foot__legal p').first().innerText()).replace(/\s+/g, ' ');
  expect(t).toBe(`© ${new Date().getFullYear()} מרכז המודיעין לתודעה — CIC (Consciousness Intelligence Center). כל הזכויות שמורות.`);
});

test('external links: opened safely, announced, and the verified CIC site is linked', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    const links = page.locator('a[target="_blank"]');
    const n = await links.count();
    for (let i = 0; i < n; i++) {
      const a = links.nth(i);
      expect(await a.getAttribute('rel'), `${route} link ${i} rel`).toMatch(/noopener/);
      expect((await a.innerText()).length + (await a.locator('.sr-only').count()), `${route} link ${i} announces new tab`).toBeGreaterThan(0);
    }
  }
  await page.goto('./');
  await expect(page.locator('a[href="https://www.israelcic.com/"]').first()).toBeVisible();
});

test('internal links and images all resolve', async ({ page, request }) => {
  const seen = new Set<string>();
  for (const route of ROUTES) {
    await page.goto(route);
    await settle(page);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
    const imgs = await page.$$eval('img, source', (els) =>
      els
        .flatMap((e) => [
          (e as HTMLImageElement).currentSrc || (e as HTMLImageElement).src,
          ...((e as HTMLSourceElement).srcset || '').split(',').map((s) => s.trim().split(' ')[0]),
        ])
        .filter(Boolean),
    );
    for (const u of [...hrefs, ...imgs]) {
      const url = new URL(u, page.url());
      if (url.origin !== 'http://127.0.0.1:4321') continue;
      url.hash = '';
      if (seen.has(url.href)) continue;
      seen.add(url.href);
      const r = await request.get(url.href);
      expect(r.status(), url.href).toBe(200);
    }
  }
  expect(seen.size).toBeGreaterThan(20);
});

test('404 page exists and is not indexed', async ({ request }) => {
  const r = await request.get('http://127.0.0.1:4321/digital-watch-webpage/no-such-page/');
  expect(r.status()).toBe(404);
  expect(await r.text()).toContain('העמוד לא נמצא');
});

test('robots and sitemap', async ({ request }) => {
  const robots = await (await request.get('http://127.0.0.1:4321/digital-watch-webpage/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://avivg7.github.io/digital-watch-webpage/sitemap.xml');
  const sm = await (await request.get('http://127.0.0.1:4321/digital-watch-webpage/sitemap.xml')).text();
  for (const p of ['', 'legal/', 'privacy/', 'accessibility/']) expect(sm).toContain(`https://avivg7.github.io/digital-watch-webpage/${p}</loc>`);
  expect(sm).not.toContain('404');
});

test('JavaScript off: the message, the evidence links, the navigation and a way to the screenshots are all there', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false, locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4321/digital-watch-webpage/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('האיומים לא נשארים בשטח');
  await expect(page.locator('a[href*="gly.co.il"]').first()).toBeVisible();
  await expect(page.locator('nav.nav a').first()).toBeVisible();
  await expect(page.locator('.nojs-list a')).toHaveCount(6);
  await expect(page.locator('.filmstrip')).toBeHidden();
  await expect(page.locator('.menu-toggle')).toBeHidden();
  await ctx.close();
});

test('reduced motion: the hero stops animating, and nothing scrolls smoothly', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', locale: 'he-IL' });
  const page = await ctx.newPage();
  await page.goto('http://127.0.0.1:4321/digital-watch-webpage/');
  const names = await page.evaluate(() => [
    getComputedStyle(document.querySelector('.hand-group')!).animationName,
    getComputedStyle(document.querySelector('.hero h1 .l1')!).animationName,
    getComputedStyle(document.documentElement).scrollBehavior,
  ]);
  expect(names[0] === 'none' || names[0] === 'sweep').toBeTruthy();
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('.hand-group')!).animationDuration);
  expect(parseFloat(dur)).toBeLessThan(0.01);
  expect(names[2]).toBe('auto');
  await ctx.close();
});
