# Featured video: what is built, what is gated, how to switch it on

**Status (2026-11-03): RIGHTS-PENDING MODE.** The section is built and tested. The player plays an **original, clearly labelled first-party demo**. The Channel 13 report is **not** hosted, **not** embedded and **not** derived from in any form.

## 1. Can the actual report be played from an authorised source today? No (nothing verified)

| Question                                                               | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is there an official embed (publisher player, official YouTube) of it? | **None was found.** Two web searches (Hebrew headline, English description) returned no official copy and no upload. The publisher article page (`13tv.co.il/…/soldiers-905155535/`) answered **HTTP 403 "Access Denied"** to every automated request on 2026-11-03. That block was **not bypassed** (no spoofed headers, no browser automation to defeat it), so whether the page itself carries an embeddable player is **unknown**. |
| Does the primary Play button open the article?                         | **No, never.** It is a `<button>` that opens the in-page player. The article keeps its own, separate, labelled links (see section 4).                                                                                                                                                                                                                                                                                                  |
| Is the supplied MP4 published, committed, transcoded or sampled?       | **No.** It is read nowhere in the build. `scripts/prepare-report-video.mjs` refuses to run until rights are recorded (tested, section 6). No frame was extracted from it for any public file.                                                                                                                                                                                                                                          |
| What does the visitor see when pressing Play?                          | `public/video/demo/dw-player-demo.*`: 9 s, silent, 1280x720, drawn by `scripts/demo-video/scene.html` (abstract call window, three tags, the headline sentences, the logo). It carries an on-screen badge "סרטון הדגמה של הנגן באתר · אינו התחקיר של חדשות 13", Hebrew captions, and the dialog says the same.                                                                                                                         |

**If an official embed is later found:** it needs a CSP `frame-src` for that one origin (the policy is in `src/layouts/Base.astro` and today has none), a click-to-load iframe created only on activation (the same dialog), and a sentence in `privacy/` that the visitor's browser then contacts that third party. The site's "nothing third-party is loaded" statement would need to be re-examined. Not done: no such embed is verified.

## 2. The source recording (inspected locally, read-only)

`assets/videos/7F0744CB-…MP4` (git-ignored, never published): QuickTime container, HEVC 2420x1360, 78.2 s, 158,678,240 bytes (about 16 Mbit/s), one AAC audio track, a ReplayKit author tag. The frames show the Channel 13 logo and a video-chat window with identifiable people: **a third-party broadcast, recorded from a screen**. Status **R-1 `LINKED_ONLY_RIGHTS_PENDING`** (`RIGHTS_AND_PUBLICATION_GATE.md`).

## 3. What was built

- `src/components/FeaturedVideo.astro`, placed directly after the hero (`#video`), **replacing** the old "feature" box in the press section. Headline: the three sentences as one `h2` (the last underlined in coral, the colour that means exposure). A 16:9 poster (about 1,180 px wide on desktop; at least 88% of the screen on phones) with an original drawn composition, a large white Play button, the label and the duration.
- **Motion:** the Play ring pings twice after load, the poster lifts and its art scales 3% on hover or focus, the dialog eases in (280 ms). All of it ends with the OS reduced-motion setting and with the accessibility panel's "stop motion" (tested).
- **Player:** a native `<dialog>` (modal). The `<video>`, its sources and its caption track are **created only after the click**; closing pauses, removes the sources and calls `load()` so any download stops. Controls are the browser's own (keyboard, captions, volume, speed menu, picture-in-picture where offered). A "מסך מלא" button is shown where the browser has a fullscreen API or iOS's `webkitEnterFullscreen`. Escape, the close button, and a click on the dim area close it; **focus returns to the Play button**. On phones the dialog fills the screen; in landscape the note is hidden so the video gets the height.
- **Failure:** if every source fails, an `role="alert"` panel says the video did not load, offers "ניסיון נוסף", and a link to the article, labelled "קישור לכתבה ולא לסרטון" for screen readers.
- **No JavaScript:** the inert Play button is hidden and a plain link to the demo file takes its place.
- **Delivery:** MP4 (H.264 High, 184 KB) first, WebM (VP9, 492 KB) as fallback, a 23 KB WebP poster for the player. `preload="metadata"`; `Accept-Ranges` is honoured by GitHub Pages (the local test server now emulates it). No library, no iframe, no third-party request.
- `src/data/video.config.json` is the single switch. `scripts/serve-dist.mjs` gained video MIME types and byte ranges.

## 3b. Copy, and where it deliberately differs from the brief

| Place           | Rights-pending mode (now)                                                                                                             | Report mode (after approval)                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Headline        | "שיחה אחת. רגע אחד של חוסר תשומת לב. מידע שלא היה אמור להיחשף." (as briefed)                                                          | same                                        |
| Supporting copy | "התחקיר של חדשות 13 ממחיש מדוע נדרשת שכבת מודעות והגנה גם במרחב הדיגיטלי. עד שפרסומו כאן יאושר, הנגן מציג סרטון הדגמה מקורי של האתר." | "צפו בתחקיר שממחיש מדוע נדרשת שכבת מודעות…" |
| Play label      | **"הפעלת הדגמת הנגן"**                                                                                                                | **"לצפייה בתחקיר המלא"** (as briefed)       |
| Badge           | "הדגמת נגן · לא התחקיר"                                                                                                               | "תחקיר חדשות 13"                            |

The briefed label "לצפייה בתחקיר המלא" and copy "צפו בתחקיר" are **not used now on purpose**: while the button plays a demo, they would tell the visitor they are about to watch the investigation. They switch on with the report.

## 4. Separation from the articles

The two press cards in `#evidence` (Galey Israel, Channel 13) are unchanged and still link to the publishers. The video section has one extra, separate line: "הכתבה באתר חדשות 13 (קישור לאתר, לא לסרטון)". A test asserts the Play control is a button, is not inside a link, does not change the URL or open a tab, and that both press links remain.

## 5. How to switch to the supplied MP4 (after written rights approval)

1. **Get the owner's written confirmation** that the site may publish the report (from Channel 13 or whoever can license it), covering the on-screen logo and the identifiable people in the chat window. Without it, stop here.
2. In `src/data/video.config.json` fill `rights.confirmedBy`, `rights.confirmedOn`, `rights.reference` (and set `rights.status` to `PUBLISHED_APPROVED`). The script and the build both refuse otherwise.
3. `npm run video:prepare -- "<path to the MP4>" --poster-at 6 [--captions <file.he.vtt>]`. It probes the file, scales to at most 1280x720, writes `public/video/report/dw-report.mp4` (H.264 + AAC, faststart), `dw-report.webm`, a metadata-free `dw-report-poster.webp`, drops every container tag, and prints the next steps. **Choose the poster frame yourself**: it must not show anything the licence does not cover. **Captions are required for accessibility** (the demo ships them; the report must too: provide a Hebrew `.vtt`).
4. In the config set `"mode": "report"` and `report.durationLabel` (the script prints it). If no captions, set `report.captions` to `""` and say so in the accessibility statement.
5. Un-ignore `public/video/report/` in `.gitignore` (deliberate commit). `npm run build && npm run verify:public && npm test`.
6. Update `COPY_AND_CLAIM_REGISTER.md` (C-26) and `RIGHTS_AND_PUBLICATION_GATE.md` R-1 to the approved status, with the reference.

Size and caching: GitHub Pages sets its own short cache lifetime (not configurable on a project site) and honours byte ranges; a 78 s 720p file is roughly 8 to 12 MB at crf 24 (the gate allows 40 MB). Hosting a video of that size on Pages is within its 1 GB site limit, but if it is ever heavily watched an external video host chosen by the owner is the better home.

## 6. The guard rails, and how they are tested

`scripts/verify-public-tree.mjs` (run before every deploy) now allows video only as the configured demo (or the report once the rights record is complete). It refuses: any other video file, a `video/report/` folder while rights are pending, a video larger than 1.5 MB (report: 40 MB), a video **byte-identical to anything in `assets/videos/`**, a device/author/path tag inside a video, and any text file naming the source recording or a stray `.mp4`. `tests/video-gate.spec.ts` plants each violation in a copy of `dist/` and asserts the exact refusal; it also runs the activation script on a synthetic 1080p clip with a "ReplayKit" tag and checks that the output is 1280x720 H.264+AAC with the tag gone. `.gitignore` still ignores `*.mp4`/`*.webm` everywhere except the two named demo files.

## 7. Open items for the owner

| ID  | Item                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------- |
| V-1 | Licence or written permission for the Channel 13 report (R-1 / O-6). Until then the demo stays.                             |
| V-2 | Whether Channel 13 offers an official embed or a share link meant for third-party sites (ask the publisher; not done here). |
| V-3 | Hebrew captions or a transcript for the report, if it is ever hosted.                                                       |
| V-4 | Decide whether the demo clip's wording and look are right for the investor-facing site, or replace it with a produced one.  |
