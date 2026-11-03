# Deployment evidence

## Status: **NOT DEPLOYED. BLOCKED on one permission step.**

| Item                       | State                                                                                                                                                                                                                    |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local git repository       | Created in this folder, branch `main`, working tree clean. The final local commit is whatever `git rev-parse HEAD` prints (a document cannot contain its own commit's SHA); it is also given in the batch's final report |
| GitHub repository          | **Not created.** `avivg7/digital-watch-webpage` does not exist (checked with `gh repo view` after the block)                                                                                                             |
| GitHub Pages               | **Not enabled**                                                                                                                                                                                                          |
| CI run                     | **None** (nothing has been pushed)                                                                                                                                                                                       |
| Live URL                   | **None.** The intended URL is `https://avivg7.github.io/digital-watch-webpage/`; it does not exist yet                                                                                                                   |
| The Digital Watch app repo | **Untouched.** It was opened read-only for two brand files and its colour tokens; no remote, branch or file of it was changed                                                                                            |

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
