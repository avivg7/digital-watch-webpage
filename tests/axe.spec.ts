import { expect, test } from '@playwright/test';
import { ROUTES, axe, settle } from './helpers';

// Automated WCAG checks (axe-core) on every route, in the default state and with each panel adjustment on. Automated checks find only part of the problems; see docs/ACCESSIBILITY_QA.md.
for (const route of ROUTES) {
  test(`axe: ${route} default`, async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', locale: 'he-IL' });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:4321/digital-watch-webpage/${route === './' ? '' : route}`);
    await settle(page);
    const r = await axe(page);
    console.log(`axe ${route}: ${r.violations.length} violations, incomplete: ${r.incomplete.join(',') || 'none'}`);
    expect(r.violations).toEqual([]);
    await ctx.close();
  });
}

test('axe: home page with the accessibility panel open and with each adjustment on', async ({ page }) => {
  await page.goto('./');
  await settle(page);
  await page.locator('#a11y-open').click();
  expect((await axe(page)).violations, 'panel open').toEqual([]);
  for (const k of ['contrast', 'motion', 'links', 'spacing']) {
    await page.locator(`[data-toggle="${k}"]`).click();
    expect((await axe(page)).violations, `after ${k}`).toEqual([]);
  }
  await page.locator('[data-size="3"]').click();
  expect((await axe(page)).violations, 'text 150%').toEqual([]);
});

test('axe: the open lightbox', async ({ page }) => {
  await page.goto('./');
  await page.locator('#product').scrollIntoViewIfNeeded();
  await page.locator('[data-open-lightbox]').click();
  await expect(page.locator('#lightbox')).toBeVisible();
  expect((await axe(page)).violations).toEqual([]);
});
