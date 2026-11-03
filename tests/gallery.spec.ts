import { expect, test } from '@playwright/test';

// The screenshot gallery: default image, thumbnails, buttons, RTL keyboard, lightbox focus, and failure handling.
test.describe('gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('./');
    await page.locator('#product').scrollIntoViewIfNeeded();
    await expect(page.locator('#stage-img')).toBeVisible();
  });

  test('opens on the "work room" screenshot (the owner default, main.png), six screens, redacted derivative', async ({ page }) => {
    await expect(page.locator('#stage-img')).toHaveAttribute('alt', /חדר העבודה/);
    await expect(page.locator('#stage-img')).toHaveAttribute('src', /gallery-room-1200\.webp$/);
    await expect(page.locator('.thumb')).toHaveCount(6);
    await expect(page.locator('.thumb[aria-current="true"]')).toHaveCount(1);
    await expect(page.locator('[data-pos]')).toHaveText('1');
    await expect(page.locator('#stage-cap')).toContainText('הפנים הוסתרו');
  });

  test('clicking a thumbnail changes the stage image, caption, counter and the active marker', async ({ page }) => {
    await page.locator('.thumb').nth(3).click();
    await expect(page.locator('#stage-img')).toHaveAttribute('src', /gallery-shifts-1200\.webp$/);
    await expect(page.locator('#stage-cap')).toContainText('המשמרות שלי');
    await expect(page.locator('[data-pos]')).toHaveText('4');
    await expect(page.locator('.thumb').nth(3)).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('.thumb[aria-current="true"]')).toHaveCount(1);
    await expect(page.locator('#stage-img')).toHaveJSProperty('complete', true);
  });

  test('next and previous buttons wrap around', async ({ page }) => {
    await page.locator('[data-step="-1"]').first().click();
    await expect(page.locator('[data-pos]')).toHaveText('6');
    await page.locator('[data-step="1"]').first().click();
    await expect(page.locator('[data-pos]')).toHaveText('1');
  });

  test('RTL keyboard: on the filmstrip ArrowLeft goes to the NEXT image, ArrowRight to the previous, Home and End jump', async ({ page }) => {
    await page.locator('.thumb').first().focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-pos]')).toHaveText('2');
    await expect(page.locator('.thumb').nth(1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-pos]')).toHaveText('1');
    await page.keyboard.press('End');
    await expect(page.locator('[data-pos]')).toHaveText('6');
    await page.keyboard.press('Home');
    await expect(page.locator('[data-pos]')).toHaveText('1');
  });

  test('lightbox: opens from the button, shows the large image, arrows work, Escape closes, focus returns to the opener', async ({ page }) => {
    const opener = page.locator('[data-open-lightbox]');
    await opener.focus();
    await page.keyboard.press('Enter');
    const dlg = page.locator('#lightbox');
    await expect(dlg).toBeVisible();
    await expect(page.locator('#lb-img')).toHaveAttribute('src', /gallery-room-1920\.webp$/);
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-lb-pos]')).toHaveText('2');
    await expect(page.locator('#lb-img')).toHaveAttribute('src', /gallery-overview-1920\.webp$/);
    // focus stays inside the modal while it is open
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      // focus may leave the page for the browser's own controls (body), but never reaches the page behind the modal
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog') || document.activeElement === document.body)).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(opener).toBeFocused();
    await expect(page.locator('[data-pos]')).toHaveText('2'); // the stage followed the lightbox
  });

  test('lightbox closes with its button and by clicking the backdrop', async ({ page }) => {
    await page.locator('[data-open-lightbox]').click();
    await expect(page.locator('#lightbox')).toBeVisible();
    await page.locator('[data-close-lightbox]').click();
    await expect(page.locator('#lightbox')).toBeHidden();
    await page.locator('#stage-img').click();
    await expect(page.locator('#lightbox')).toBeVisible();
    // the empty area of the dialog around the controls and the image (the middle of the top bar)
    const top = (await page.locator('.lightbox__top').boundingBox())!;
    await page.mouse.click(top.x + top.width / 2, top.y + top.height / 2);
    await expect(page.locator('#lightbox')).toBeHidden();
  });

  test('a screenshot that fails to load shows a plain message and the gallery keeps working', async ({ page }) => {
    await page.route('**/gallery-overview-*', (r) => r.abort());
    await page.locator('.thumb').nth(1).click();
    await expect(page.locator('.stage__shot')).toHaveAttribute('data-error', 'true');
    await expect(page.locator('.stage__err')).toBeVisible();
    await page.locator('.thumb').nth(2).click();
    await expect(page.locator('.stage__shot')).not.toHaveAttribute('data-error', 'true');
    await expect(page.locator('#stage-img')).toHaveAttribute('src', /gallery-availability-1200\.webp$/);
  });

  test('every screenshot has a description, a caption and a thumbnail label', async ({ page }) => {
    for (let i = 0; i < 6; i++) {
      await page.locator('.thumb').nth(i).click();
      expect((await page.locator('#stage-img').getAttribute('alt'))!.length).toBeGreaterThan(40);
      expect((await page.locator('#stage-cap').innerText()).length).toBeGreaterThan(30);
      expect((await page.locator('.thumb').nth(i).getAttribute('aria-label'))!).toContain(`${i + 1} מתוך 6`);
    }
  });

  test('RTL arrows: "previous" is on the right and "next" on the left, in the stage and in the lightbox', async ({ page }) => {
    const prev = (await page.locator('[data-step="-1"]').first().boundingBox())!;
    const next = (await page.locator('[data-step="1"]').first().boundingBox())!;
    expect(prev.x, 'previous must be to the right of next in RTL').toBeGreaterThan(next.x);
    await page.locator('[data-open-lightbox]').click();
    const lp = (await page.locator('[data-lb-step="-1"]').boundingBox())!;
    const ln = (await page.locator('[data-lb-step="1"]').boundingBox())!;
    expect(lp.x).toBeGreaterThan(ln.x);
  });

  test('on a phone the lightbox shows the screenshot at reading size in a scrollable, focusable region', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only');
    await page.locator('[data-open-lightbox]').click();
    const box = page.locator('.lightbox__img');
    await expect(box).toHaveAttribute('tabindex', '0');
    const dims = await page.evaluate(() => {
      const el = document.querySelector('.lightbox__img') as HTMLElement;
      const img = el.querySelector('img') as HTMLImageElement;
      return { imgW: img.getBoundingClientRect().width, boxW: el.clientWidth, scrollable: el.scrollWidth > el.clientWidth };
    });
    expect(dims.imgW).toBeGreaterThan(dims.boxW * 2);
    expect(dims.scrollable).toBe(true);
    await expect(page.locator('.lightbox__hint')).toBeVisible();
  });
});
