import { expect, test } from '@playwright/test';

// The accessibility panel must CHANGE the page (not just flip a class), remember the choice on this device, and reset.
test.describe('accessibility panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
  });

  test('opens by mouse and keyboard, moves focus in, Escape closes and returns focus', async ({ page }) => {
    const fab = page.locator('#a11y-open');
    await expect(fab).toHaveAttribute('aria-expanded', 'false');
    await fab.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#a11y-panel')).toBeVisible();
    await expect(fab).toHaveAttribute('aria-expanded', 'true');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#a11y-panel'))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#a11y-panel')).toBeHidden();
    await expect(fab).toBeFocused();
  });

  test('text size really enlarges the text (and the layout still fits)', async ({ page }) => {
    const base = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    await page.locator('#a11y-open').click();
    await page.locator('[data-size="3"]').click();
    const big = await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize));
    expect(big / base).toBeGreaterThan(1.4);
    await expect(page.locator('[data-size="3"]')).toHaveAttribute('aria-pressed', 'true');
    const o = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(o).toBe(true);
  });

  test('high contrast really changes the colours (dark navy and light paper become black and white)', async ({ page }) => {
    const before = await page.evaluate(() => getComputedStyle(document.querySelector('.hero')!).backgroundColor);
    await page.locator('#a11y-open').click();
    await page.locator('[data-toggle="contrast"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    const hero = await page.evaluate(() => getComputedStyle(document.querySelector('.hero')!).backgroundColor);
    const why = await page.evaluate(() => getComputedStyle(document.querySelector('#why')!).backgroundColor);
    expect(hero).not.toBe(before);
    expect(hero).toBe('rgb(0, 0, 0)');
    expect(why).toBe('rgb(255, 255, 255)');
  });

  test('reduce motion stops the hero animation; underline links and spacing take effect', async ({ page }) => {
    await page.locator('#a11y-open').click();
    await page.locator('[data-toggle="motion"]').click();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('.hand-group')!).animationName)).toBe('none');
    await page.locator('[data-toggle="links"]').click();
    expect(await page.evaluate(() => getComputedStyle(document.querySelector('footer.site a')!).textDecorationLine)).toBe('underline');
    const lh = await page.evaluate(() => parseFloat(getComputedStyle(document.body).lineHeight) / parseFloat(getComputedStyle(document.body).fontSize));
    await page.locator('[data-toggle="spacing"]').click();
    const lh2 = await page.evaluate(() => parseFloat(getComputedStyle(document.body).lineHeight) / parseFloat(getComputedStyle(document.body).fontSize));
    expect(lh2).toBeGreaterThan(lh);
  });

  test('choices are remembered after a reload (this browser only) and reset clears everything', async ({ page }) => {
    await page.locator('#a11y-open').click();
    await page.locator('[data-size="2"]').click();
    await page.locator('[data-toggle="contrast"]').click();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-text', '2');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual(['dw-a11y']);
    await page.locator('#a11y-open').click();
    await expect(page.locator('[data-toggle="contrast"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#a11y-reset').click();
    await expect(page.locator('html')).not.toHaveAttribute('data-text', /.*/);
    await expect(page.locator('html')).not.toHaveAttribute('data-contrast', /.*/);
    expect(await page.evaluate(() => localStorage.getItem('dw-a11y'))).toBeNull();
  });

  test('every change is announced to assistive technology', async ({ page }) => {
    await page.locator('#a11y-open').click();
    await page.locator('[data-toggle="links"]').click();
    await expect(page.locator('#a11y-live')).toContainText('קו תחתון לקישורים: פעיל');
  });

  test('the settings are on every page (a visitor who enlarged the text on the home page keeps it)', async ({ page }) => {
    await page.locator('#a11y-open').click();
    await page.locator('[data-size="1"]').click();
    await page.goto('privacy/');
    await expect(page.locator('html')).toHaveAttribute('data-text', '1');
    await expect(page.locator('#a11y-open')).toBeVisible();
  });
});
