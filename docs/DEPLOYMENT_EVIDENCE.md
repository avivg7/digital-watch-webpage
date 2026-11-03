# Deployment evidence

## Status: **DEPLOYED** (2026-11-03) to https://avivg7.github.io/digital-watch-webpage/

The first attempt (earlier the same day) was denied by the tool permission system and nothing was created. After the owner explicitly asked to try again, the repository was created and published with the commands below.

| Item                                      | State                                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub repository                         | `avivg7/digital-watch-webpage`, **public**, created with `gh repo create ... --public --source=. --remote=origin`                                                                                                                                                                                                                                                                        |
| GitHub Pages                              | enabled with `build_type=workflow` (publishing from the Actions workflow)                                                                                                                                                                                                                                                                                                                |
| First CI run (commit `e4cf01d`)           | **failed**: one test (mobile-webkit, the video axe test: a click that never completed on the second open; flaky, passed on 7 of 8 local repeats; not reproduced locally with an error). `deploy` was skipped. Nothing was published from it                                                                                                                                              |
| Fix                                       | the test was split in two shorter ones (commit `8a0cd5c`); no retry or timeout was added                                                                                                                                                                                                                                                                                                 |
| Second CI run (commit `8a0cd5c`)          | `verify` **success**, `deploy` **success**                                                                                                                                                                                                                                                                                                                                               |
| Live URL                                  | https://avivg7.github.io/digital-watch-webpage/ answers HTTP 200                                                                                                                                                                                                                                                                                                                         |
| `npm run check:live` against the live URL | **all checks passed** (every route, desktop and phone: 200, lang/dir, one h1, canonical, no request to another origin, no console errors, images, no horizontal scroll, axe 0 violations; robots, sitemap, 404)                                                                                                                                                                          |
| Playback from the deployed origin         | the real YouTube player played the report in headed Google Chrome, Chromium, Firefox and WebKit: 0 third-party hosts before the click; `origin=https://avivg7.github.io` in the embed URL; `currentTime` advanced (about 3 s per 3 s), not paused, duration 78.3 s; closing removed the iframe and detached the frame. **No referer error (153).** Not tested: a real phone, real Safari |
| The Digital Watch app repo                | **Untouched**                                                                                                                                                                                                                                                                                                                                                                            |

Reminder: the site is now **public**, including the embedded Channel 13 report. The rights and privacy question about that report (identifiable, partly unblurred people; the owner's upload is not proof of republication rights) is **still unresolved** (`FEATURED_VIDEO.md` V-1, `RIGHTS_AND_PUBLICATION_GATE.md` R-1, O-1 to O-8). To take the video down quickly: remove the `FeaturedVideo` line from `src/pages/index.astro` and push, or make the YouTube video private (the player then shows YouTube's own error).

## Historical: what was blocked the first time, and the manual steps

## What was blocked, and why it matters

The step "create a public repository under `avivg7` and enable GitHub Pages" was **denied by the tool permission system** (its automatic classifier gave no reason). I did not try to get around it. Nothing was created on GitHub. The GitHub account is on the **free plan**, where Pages works only for **public** repositories, so the repository has to be public; that is also why the originals are git-ignored and the repository was checked for secrets, media, metadata and personal e-mail before the attempt (gitleaks on the tree and the history: no leaks; every commit uses the GitHub no-reply identity; 124 tracked files, none from `assets/`).

## The exact manual steps (about two minutes; each one is yours to approve)

```
cd /Users/avivgerman/aviv_files/side_projects/digital-watch-webpage

# 1. create the PUBLIC repository from this folder (does not push)
gh repo create avivg7/digital-watch-webpage --public --source=. --remote=origin \
  --description "Public static landing site for המשמר הדיגיטלי / Digital Watch (Astro, GitHub Pages). No backend, no tracking."

# 2. publish from GitHub Actions (the workflow in .github/workflows/site.yml does the deploy)
gh api -X POST repos/avivg7/digital-watch-webpage/pages -f build_type=workflow

# 3. push (fast-forward only, no force) and watch the run
git push -u origin main
gh run watch --exit-status

# 4. verify the live site (desktop and phone, every route, axe, canonical, robots, sitemap, 404)
npm run check:live -- https://avivg7.github.io/digital-watch-webpage/
```

Expected, from the local runs: the workflow's `verify` job (lint, format, type check, `npm audit`, build, publication gate, 262 browser tests) passes, then `deploy` publishes. **Until `check:live` passes against the real URL, do not call the site deployed.** Then record here: the commit SHA, the workflow run id and conclusion, the page URL, and the `check:live` output.

**Before step 1, please read `RIGHTS_AND_PUBLICATION_GATE.md`:** four items (organisation name, CIC's consent, Omri Rols's photo, the people in the default screenshot) are published _with their confirmation still open_, because the brief asked for them to be used and to be listed rather than omitted. Each has a one-line hold-back (`SHOW` in `src/data/site.ts`, `SITE.orgNameHe`). If you would rather not publish any of them until they are confirmed, set `SHOW` to `false` (and delete `public/img/portrait-omri-*` if you want them out of the history as well) **before** step 3: a public repository's history is effectively permanent.

## 3. What was verified locally instead (so the first deploy is expected to pass)

- Built from a **fresh clone** with `npm ci --ignore-scripts` (the way CI installs): lint, type check, build and the publication gate pass; the Chromium suite passed on an earlier fresh clone (47 tests).
- The same site served by `scripts/serve-dist.mjs`, which imitates GitHub Pages for a project site (base path, `404.html`, generic 404 outside the path): `npm run check:live` passes on desktop and phone for `/`, `/legal/`, `/privacy/`, `/accessibility/` (axe 0 violations, no foreign request, canonical correct, images load), robots, sitemap and 404.
- Not verifiable before deployment: GitHub's own behaviour (Pages entitlement for this account, the environment protection rules, the five pinned action versions running together), the live CDN headers, and how GitHub answers `robots.txt` at the origin root.
