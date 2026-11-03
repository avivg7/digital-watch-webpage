# Content and asset audit

Date: 2026-11-03. Scope: everything the owner supplied, what was inspected, what was kept, changed or held back, and why. Nothing in this file is a public web route.

## 1. What was inspected

| Source                                                        | How                                                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `assets/` in this folder (git-ignored, never published)       | `sips`, `ffprobe`, `file`, and each image opened and looked at                                           |
| `Digital_Guard_Landing_Page (2).html` (owner's old prototype) | read in full; text, links and the one script extracted                                                   |
| The Digital Watch app, read-only (`public/brand`, tokens)     | logo and emblem files copied; colour tokens and font read from `globals.css`; **no app file was edited** |
| Linked pages (CIC site, Galey Israel, Channel 13, gov.il)     | fetched; title, date and description read (see section 6)                                                |

## 2. Asset inventory and decisions

| File                                                       | Facts                                                                                                                                                  | Decision                                                                                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `videos/7F0744CB-…MP4`                                     | HEVC 2420x1360, 78 s, 151 MB, AAC; Apple ReplayKit screen recording; frames show the **Channel 13 logo**, an Ome.tv chat and identifiable people       | **`LINKED_ONLY_RIGHTS_PENDING`**. Not copied, not committed, not published; **no frame or poster was derived from it**. The site links to the report instead.                       |
| `images/app_photo/main.png`                                | 1670x942, 1.4 MB. Demo "work room" with **two people**: one soldier (face already blurred in the source) and one woman with a **clearly visible face** | Published as the default gallery image **only as a redacted derivative** (the visible face is blurred with a feathered mask). The unredacted file stays local. See rights gate R-3. |
| `images/app_photo/Screenshot … 22.02.35.png`               | 1918x1075 — "overview" dashboard, demo user "(דמו)"                                                                                                    | Published (resized, metadata-free)                                                                                                                                                  |
| `images/app_photo/Screenshot … 21.59.09.png`               | 1908x1076 — availability calendar, synthetic data                                                                                                      | Published                                                                                                                                                                           |
| `images/app_photo/Screenshot … 22.00.25.png`               | 1905x1076 — "my shifts", synthetic data                                                                                                                | Published                                                                                                                                                                           |
| `images/app_photo/Screenshot … 22.01.37.png`               | 1917x1078 — training page                                                                                                                              | Published                                                                                                                                                                           |
| `images/app_photo/Screenshot … 22.03.26.png`               | 1917x1076 — pre-flight checks (dark video box is empty)                                                                                                | Published                                                                                                                                                                           |
| `images/israelcic_logo.png`                                | 998x445, **actually AVIF data with a `.png` name**; transparent; wordmark reads **"CIVILIAN INTELLIGENCE CENTER"**                                     | Re-encoded as real PNG and WebP; published as the sponsor logo. **Name discrepancy: see section 5.**                                                                                |
| `images/omri_rols_pic.png`                                 | 800x800, 538 KB; looks like a **studio still with a broadcast graphics backdrop**                                                                      | Published (the owner asked for it) at 400 and 800 px. **Provenance to confirm: rights gate R-5.**                                                                                   |
| `images/aviv_german_pic.jpeg`                              | 483x483, black and white, plain white background                                                                                                       | Published. Tinted with CSS only; the file is unchanged.                                                                                                                             |
| Digital Watch logo + emblem (from the app, read-only copy) | 720x550 and 512x512 PNG, **opaque white backing**                                                                                                      | Logo published as WebP on a white plate; emblem has its **outer white backing keyed out** (flood fill from the border; the white shield inside is untouched) for use on navy.       |

Every published image is re-encoded by `scripts/build-assets.mjs`: resized, converted to WebP/AVIF, and **no EXIF, GPS, camera or software metadata is carried over**. `scripts/verify-public-tree.mjs` checks this on the built site and fails the build otherwise (it was tested against a planted EXIF image, a video, an e-mail address and a local path, and caught all of them).

## 3. Gallery screening (private data)

Looked for: real names, e-mail addresses, accounts, coordinates, incident text, session identifiers, strangers.

- All six screenshots show a **synthetic demo user, labelled "(דמו)"**, and badges "DEMO / SYNTHETIC". No e-mail address, id, coordinate or incident text is visible.
- `main.png` is the only image with people. It is labelled "דוגמה סינתטית — לא אדם אמיתי" ("synthetic example, not a real person") in the product, **but the app's own synthetic participant is a canvas drawing, not a photograph**, so the origin of these two photographs is not recorded anywhere. Treated as a possible real person until the owner says otherwise: the face is blurred in the public copy and the caption says so.
- The notes field in the work-room shot shows a generic training sentence, not an incident.

## 4. What the old prototype said, and what became of it

| Old content                                                                               | Used how                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tagline "כיפת הברזל של חיילי צה״ל ברשת"                                                   | Kept **once**, quoted and qualified as "the idea that started the project, a layer of citizens' vigilance, not an official defence system". Not a headline; no claim of affiliation. |
| Volunteer-led awareness; live video chats; sensitive exposure                             | Core of the hero and the problem section, with "may be exposed" wording                                                                                                              |
| News section: Galey Israel and Channel 13                                                 | Rebuilt as editorial cards with date, source and an original summary; both links verified                                                                                            |
| Three facts: information, exposure, awareness                                             | Kept as the three short facts under the evidence                                                                                                                                     |
| "Identify, raise awareness, act responsibly"                                              | Kept as the three numbered steps (a real sequence, so numbering is justified)                                                                                                        |
| "הפנים היפות של החברה הישראלית", community, unity, emoji icons                            | Dropped: slogan-like, not evidence; emoji icons replaced by nothing                                                                                                                  |
| "הצטרפו עלינו" and the join/sign-up flow                                                  | Replaced by "תמכו במיזם" and a link to CIC. Awkward Hebrew corrected.                                                                                                                |
| **Sign-up form that shows "הפרטים התקבלו בהצלחה!" after 500 ms without sending anything** | **Not reproduced.** There is no form on the site (a test asserts it).                                                                                                                |
| "הפרטים נשמרים באופן מאובטח ואינם מועברים לגורם שלישי"                                    | **Removed.** Nothing was stored; the statement was unproven.                                                                                                                         |
| Generic shield SVG as logo                                                                | Replaced by the real logo and emblem                                                                                                                                                 |
| Google Fonts request (Heebo)                                                              | Replaced by the same font, **self-hosted**, so the visit makes no third-party request                                                                                                |
| Footer "© המשמר הדיגיטלי"                                                                 | Replaced by the owner-specified organisation credit                                                                                                                                  |

## 5. Discrepancies found (owner decision needed)

1. **Organisation name.** The CIC website titles itself "מרכז המודיעין **האזרחי**" and its logo reads "**Civilian** Intelligence Center". The Galey Israel article (23 July 2026) and the brief say "מרכז המודיעין **לתודעה** (Consciousness Intelligence Center)". The site uses the brief's wording where the brief requires it (copyright line, the founder's title), uses only "CIC" beside the logo, and keeps the name in **one constant** (`src/data/site.ts`) so one line changes it everywhere. **Please confirm the legal name.**
2. **Channel 13 request behaviour.** An early request got HTTP 403; a later one with a plain User-Agent got 200 and the page was read. Recorded as verified (claim C-04).
3. **Omri Rols photo** looks like a broadcast still (rights gate R-5).
4. **Aviv German's title.** "מוביל המיזם הטכנולוגי" is used, with the role line "אסטרטגיית מוצר, ארכיטקטורה ופיתוח". The brief's alternative "מייסד ומוביל הפתרון הטכנולוגי" was **not** used, because "מייסד" beside the CIC founder could be read as founder of the organisation.
5. **Nonprofit status.** The brief calls CIC a nonprofit; no registration number is on its site. The public copy says "ארגון"/"CIC" and never states a legal form.
6. **No public contact address** for CIC was found on its site, so the site has **no `mailto:`** and no form (claim C-07).

## 6. Links verified (2026-11-03)

| Link                               | Result                                                                                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `israelcic.com`                    | 200; title "בית \| מרכז המודיעין האזרחי"; no e-mail address found                                                                                                                           |
| `gly.co.il/item?id=71212`          | 200; dated **23.07.2026**; says Omri Rols is "מייסד מרכז המודיעין לתודעה CIC"; contains the quoted headline and the fragment "יש תעשייה שלמה שמנסה לצוד את החיילים"                         |
| `13tv.co.il/…/soldiers-905155535/` | 200 on the second request (403 on the first); headline matches exactly; published **2026-05-16**; description says soldiers go live on video apps and expose locations and combat equipment |
| `gov.il` accessibility pages       | 403 to automated requests: **kept as references, content not verified by this audit**                                                                                                       |
| GitHub privacy statement           | 200                                                                                                                                                                                         |

## 7. Public information boundary

| May be said publicly                                                                       | Must not appear (never in copy, images, alt text, metadata, comments or git history)                      |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| The problem, as reported by named media                                                    | Volunteer names, counts, schedules, shift hours of real people                                            |
| That volunteers are trained, that shifts exist and that there is an immediate stop         | How volunteers find or approach conversations, target selection, platform names the project works on      |
| That the project is a pilot/in development and that screenshots are demo data              | Any account, credential, session, deployment host, internal route, security assumption or weakness        |
| Who the two people and CIC are, with their own words and public interview                  | Real participants, soldiers or strangers; any screenshot that is not demo data                            |
| The product's rules as taught in training (no collecting sensitive data, stop at any time) | Claims about recording in production, third-party integrations, transcription, MFA, encryption, retention |
