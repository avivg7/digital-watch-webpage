import { expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export const ROUTES = ['./', 'legal/', 'privacy/', 'accessibility/'] as const;

/** Scroll the whole page so lazy images load, then wait for them (a visitor scrolls too). */
export async function settle(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => Array.from(document.images).every((i) => i.complete), null, { timeout: 15_000 }).catch(() => undefined);
}

export async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  return {
    violations: r.violations.map(
      (v) =>
        `${v.id} (${v.impact}): ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(' '))
          .join(' | ')}`,
    ),
    incomplete: r.incomplete.map((v) => v.id),
  };
}

export async function noOverflow(page: Page, label: string) {
  const o = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(o.sw, `${label}: horizontal scroll (scrollWidth ${o.sw} > ${o.iw})`).toBeLessThanOrEqual(o.iw);
}
