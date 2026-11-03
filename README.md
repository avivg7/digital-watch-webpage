# המשמר הדיגיטלי: the public site

A static, Hebrew-first (RTL) landing site for **Digital Watch / המשמר הדיגיטלי**, a volunteer initiative (in development) that aims to reduce the exposure of soldiers' sensitive information in live video chats. It is for supporters, partners and funders. It is **separate from the Digital Watch application**: nothing here touches that application, its database or its documents.

- **No backend, no forms, no cookies, no analytics, no third-party requests.** A visit loads files from the site and nothing else. Tests assert this.
- **Honest by construction.** No fake sign-up, no unproven security claim, no numbers. See `docs/COPY_AND_CLAIM_REGISTER.md`.
- Live URL (after deployment): <https://avivg7.github.io/digital-watch-webpage/>. Deployment evidence: `docs/DEPLOYMENT_EVIDENCE.md`.

> This repository is **public** (GitHub Pages needs that on the free plan). Only reviewed, derived assets are in it; the originals, including a third-party TV recording, are git-ignored. Read `docs/RIGHTS_AND_PUBLICATION_GATE.md` before adding any media.

## Stack

Astro 7 (static output), TypeScript, hand-written CSS with design tokens, three small client scripts (navigation, accessibility panel, gallery) and no UI framework. Heebo is self-hosted. Playwright and axe-core for tests; sharp for the image pipeline.

Node: Astro 7 needs Node 22.23.4 or newer (`engines`, `.nvmrc`; CI uses `.nvmrc`). If your Node is older and you cannot upgrade, `npm install --no-save node@22.23.4` puts a matching binary in `node_modules/.bin` for `npm run …` without touching `package.json`. CI installs with `--ignore-scripts`.

## Commands

```
npm ci
npm run dev            # local development at http://127.0.0.1:4321/digital-watch-webpage/
npm run build          # static site into dist/
npm run serve          # serves dist/ the way GitHub Pages does (project base path, 404.html)
npm run lint && npm run format:check && npm run check
npm run verify:public  # publication gate on dist/ (file types, metadata, contacts, private paths)
npm test               # Playwright: Chromium, Firefox, WebKit engine, two phone profiles (needs a build first)
npm run test:links     # checks the external links and reports verified / blocked / broken honestly
npm run assets         # rebuilds public/img from ./assets (the owner's originals; not in git)
```

## Featured video

The video section plays an original, labelled **demo** while the rights to the Channel 13 report are pending. How it works, the guard rails and the switch to the real report: `docs/FEATURED_VIDEO.md`. Commands: `npm run video:demo` (re-render the demo), `npm run video:prepare -- <file>` (refuses until rights are recorded in `src/data/video.config.json`).

## Layout

```
src/pages/          home, legal/, privacy/, accessibility/, 404, sitemap.xml
src/components/     Hero + Dial (SVG), Evidence, Why, How, Gallery (+ lightbox), People, Support, Header, Footer, A11yPanel
src/data/site.ts    names, links and gallery text: the single source of truth (the organisation name is changed here)
src/data/url.ts     base-path helper (GitHub Pages serves under /digital-watch-webpage/)
src/styles/         global.css: tokens, sections, adjustments (text size, high contrast, reduced motion)
public/img/         the ONLY published images (derived; no metadata)
scripts/            build-assets, verify-public-tree, check-external-links, serve-dist
tests/              site, gallery, a11y-panel, nav-and-keyboard, axe, responsive
docs/               audit, brand, claim register, rights gate and owner checklist, accessibility QA, QA report, review ledger, deployment evidence
```

## Editing content

- Wording that appears in several places, the organisation name, links and the gallery captions: `src/data/site.ts`.
- Sections: `src/components/*.astro`. Legal pages: `src/pages/*/index.astro`.
- **Every new factual claim needs a row in `docs/COPY_AND_CLAIM_REGISTER.md`** with its evidence. Do not add numbers, partner names, security or legal assurances without one.
- Update the "עודכן לאחרונה" date in `src/data/site.ts` when a legal page changes.

## Adding or changing images

1. Put the original in `assets/images/…` (git-ignored). Never commit originals, video, or anything with people unless the rights gate says so.
2. Add it to `scripts/build-assets.mjs` (redaction regions go there) and run `npm run assets`.
3. Add alt text and a caption in `src/data/site.ts`. Screenshots must be demo data.
4. `npm run build && npm run verify:public` must pass (it rejects video, embedded metadata, large files, e-mail addresses, phone numbers and local paths).

## Deployment

`.github/workflows/site.yml` runs on every push and pull request: lint, format, type check, `npm audit` (production, high and above), build, publication gate, all browser tests. On `main` only, and only after all of that passes, it deploys with the official Pages actions (`pages: write`, `id-token: write`, no secrets). To enable Pages for a new repository: Settings, Pages, Source "GitHub Actions" (or `gh api -X POST repos/<owner>/<repo>/pages -f build_type=workflow`).

The site lives under a path (`/digital-watch-webpage/`). A custom domain is **not** configured; if one is added, change `site` and `base` in `astro.config.mjs`, the sitemap and `robots.txt`.

## What this site does not do (and why)

No contact form (no approved receiving channel; a form that shows "success" without sending was the old prototype's defect), no donation flow, no analytics, no video hosting (the TV report belongs to its broadcaster), no custom security headers (GitHub Pages does not allow them, and none are claimed).

## License

No open-source licence is granted: the content and brand belong to their owners (see the rights gate). Add one only with the owner's decision.
