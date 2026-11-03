// Verifies a DEPLOYED copy of the site (or the local Pages-like server) over HTTP and in a real browser.
//   node scripts/check-live.mjs https://avivg7.github.io/digital-watch-webpage/      (after deployment)
//   node scripts/check-live.mjs http://127.0.0.1:4321/digital-watch-webpage/          (local, via `npm run serve`)
// For every route, on a desktop and a phone viewport, it checks: HTTP 200 on a direct load, Hebrew RTL, one h1, a canonical URL on the right path (on the real host, the exact URL),
// no request to another origin, no console error, every image decoded, no horizontal scroll at 390 px, and zero axe violations (WCAG A/AA).
// It also checks robots.txt, sitemap.xml and that an unknown path answers 404. It prints what it measured and never claims more.
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const base = (process.argv[2] || '').replace(/\/?$/, '/');
if (!/^https?:\/\//.test(base)) {
  console.error('usage: node scripts/check-live.mjs <base url ending with the project path>');
  process.exit(2);
}
const origin = new URL(base).origin;
const production = origin.includes('github.io');
const routes = ['', 'legal/', 'privacy/', 'accessibility/'];
let failed = 0;
const check = (cond, good, bad) => {
  if (cond) console.log(`  ok   ${good}`);
  else {
    failed++;
    console.log(`  FAIL ${bad}`);
  }
};

const b = await chromium.launch();
for (const mobile of [false, true]) {
  const ctx = await b.newContext({ viewport: mobile ? { width: 390, height: 800 } : { width: 1366, height: 800 }, locale: 'he-IL', reducedMotion: 'reduce' });
  for (const r of routes) {
    const url = base + r;
    console.log(`${mobile ? 'phone  ' : 'desktop'} ${url}`);
    const p = await ctx.newPage();
    const foreign = [];
    const errors = [];
    p.on('request', (q) => {
      if (!q.url().startsWith(origin) && !q.url().startsWith('data:')) foreign.push(q.url());
    });
    p.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    const res = await p.goto(url, { waitUntil: 'networkidle' });
    check(res?.status() === 200, 'HTTP 200 on a direct load', `HTTP ${res?.status()}`);
    check((await p.getAttribute('html', 'lang')) === 'he' && (await p.getAttribute('html', 'dir')) === 'rtl', 'lang=he dir=rtl', 'lang/dir');
    check((await p.locator('h1').count()) === 1, 'one h1', 'h1 count');
    const canon = new URL((await p.getAttribute('link[rel=canonical]', 'href')) || 'about:blank', 'http://x');
    // a local copy legitimately points at the production host; the deployed site must match the URL exactly
    check(production ? canon.href === url : canon.pathname === new URL(url).pathname, 'canonical is right', `canonical is ${canon.href}`);
    check(foreign.length === 0, 'no request to another origin', `foreign requests: ${foreign.join(', ')}`);
    check(errors.length === 0, 'no console errors', `console errors: ${errors.join(' | ')}`);
    await p.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((res2) => setTimeout(res2, 40));
      }
      window.scrollTo(0, 0);
    });
    await p.waitForTimeout(400);
    const broken = await p.evaluate(() =>
      Array.from(document.images)
        .filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0)
        .map((i) => i.src),
    );
    check(broken.length === 0, 'every image loaded', `broken images: ${broken.join(', ')}`);
    if (mobile)
      check(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no horizontal scroll at 390 px', 'horizontal scroll at 390 px');
    const ax = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
    check(
      ax.violations.length === 0,
      `axe: 0 violations (incomplete: ${ax.incomplete.map((i) => i.id).join(',') || 'none'})`,
      `axe: ${ax.violations.map((v) => v.id).join(', ')}`,
    );
    await p.close();
  }
  await ctx.close();
}
await b.close();

for (const [path, test, label] of [
  ['robots.txt', (t) => t.includes('Sitemap:'), 'robots.txt mentions the sitemap'],
  ['sitemap.xml', (t) => t.includes('<urlset'), 'sitemap.xml is a urlset'],
]) {
  const r = await fetch(base + path);
  check(r.status === 200 && test(await r.text()), label, `${path}: HTTP ${r.status}`);
}
const nf = await fetch(base + 'no-such-page/');
check(nf.status === 404, 'an unknown path answers 404', `unknown path answered ${nf.status}`);
console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
