import { expect, test } from '@playwright/test';

test('skip link is the first tab stop, becomes visible, and moves focus to the main content', async ({ page, browserName }) => {
  await page.goto('./');
  // Safari-family engines only Tab onto links when the user turns that option on, so in WebKit the link is focused directly (the rest of the check is the same)
  if (browserName === 'webkit') await page.locator('.skip:not(.skip--second)').focus();
  else await page.keyboard.press('Tab');
  const skip = page.locator('.skip:not(.skip--second)');
  await expect(skip).toBeFocused();
  expect((await skip.boundingBox())!.y).toBeGreaterThanOrEqual(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test('focus is always visible: every interactive element shows an outline when focused by keyboard', async ({ page }) => {
  await page.goto('./');
  const bad: string[] = [];
  for (let i = 0; i < 45; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''),
        ow: parseFloat(cs.outlineWidth),
        os: cs.outlineStyle,
        visible: r.width > 0 && r.height > 0,
      };
    });
    if (r && r.visible && !(r.ow >= 2 && r.os !== 'none')) bad.push(r.tag);
  }
  expect(bad, 'focused elements without a visible outline').toEqual([]);
});

test('the main navigation moves to the sections (home page)', async ({ page, isMobile }) => {
  await page.goto('./');
  if (isMobile) await page.locator('#menu-toggle').click();
  await page.locator('nav.nav a[data-nav="people"]').click();
  await expect(page).toHaveURL(/#people$/);
  await expect(page.locator('#people')).toBeInViewport();
});

test('mobile menu: opens, announces its state, closes with Escape and returns focus', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await page.goto('./');
  const t = page.locator('#menu-toggle');
  await expect(t).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#site-nav')).toBeHidden();
  await t.click();
  await expect(t).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#site-nav')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#site-nav')).toBeHidden();
  await expect(t).toBeFocused();
});

test('a link from a document page leads back to a home-page section', async ({ page, isMobile }) => {
  await page.goto('privacy/');
  if (isMobile) await page.locator('#menu-toggle').click();
  await page.locator('nav.nav a[data-nav="evidence"]').click();
  await expect(page).toHaveURL(/\/digital-watch-webpage\/#evidence$/);
  await expect(page.locator('#evidence')).toBeInViewport();
});

test('a second skip link goes straight to the accessibility button', async ({ page, browserName }) => {
  await page.goto('./');
  const second = page.locator('.skip--second');
  if (browserName === 'webkit') await second.focus();
  else {
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  }
  await expect(second).toBeFocused();
  await expect(second).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.locator('#a11y-open')).toBeFocused();
});

test('phone menu closes when the visitor taps outside it', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone layout only');
  await page.goto('./');
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#site-nav')).toBeVisible();
  await page.mouse.click(20, 500);
  await expect(page.locator('#site-nav')).toBeHidden();
});

test('a content security policy is delivered and allows exactly one third-party origin: the privacy-enhanced YouTube embed, as a frame', async ({ page }) => {
  await page.goto('./');
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("form-action 'none'");
  // the only external origin the policy names is the YouTube privacy-enhanced embed host, and only for frames
  expect(csp!.match(/https?:\/\/[^\s;]+/g)).toEqual(['https://www.youtube-nocookie.com']);
  expect(csp).toContain('frame-src https://www.youtube-nocookie.com;');
  for (const d of ['script-src', 'img-src', 'connect-src', 'style-src', 'font-src'])
    expect(csp!.split(';').find((x) => x.trim().startsWith(d))).not.toMatch(/youtube|https?:/);
});
