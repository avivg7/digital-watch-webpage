# Brand direction

## Sources (verified, not assumed)

- **Logo and emblem:** the app's own `public/brand/digital-watch-logo.png` (720x550) and `digital-watch-emblem.png` (512x512), copied read-only. Both have an opaque white backing. The emblem is a Star of David of two overlapping triangles (a coral downward one and a blue upward one) with a white shield and binoculars at its centre.
- **Colour:** measured in the app's `globals.css`: navy `#05143F`, blue `#0474FC` (graphics only) and `#0A64E8`/`#0A58CA` for text and fills, cyan `#01AEFE`, coral `#FD3E4F`, paper `#F3F6FB`. These match the colours read from the logo.
- **Typeface:** Heebo (variable), the app's font, **self-hosted** via `@fontsource-variable/heebo` so a visit makes no request to Google.
- **CIC logo:** the owner's file (AVIF data in a `.png`), re-encoded; transparent, dark wordmark, so it is only ever shown on white.

## Concept: "משמרת" (the shift dial)

"Watch" means both the instrument and the duty. The product is built on a day split into six 4-hour shifts, so the hero image is a 24-hour **watch dial**: hour ticks, six shift arcs, a slow sweep hand, the real emblem at the centre, and one coral point on the ring. Coral means **exposure** and is used only where exposure is the subject (the dot, two of the three facts, the press card rule); blue and cyan mean protection.

It is pure SVG and CSS: no canvas, no script, no file apart from the emblem. Its one orchestrated moment is the load sequence (arcs draw in, headline rises, the hand starts). Without animation (reduced motion, no support, print) it is in its final state.

### What was rejected, and why

- A dark neon "cyber" look with a pink accent (the design generator's first suggestion): generic, and it clashes with the brand's coral meaning.
- A stock shield or padlock in the hero: the real emblem already is a shield.
- Section-by-section fade-in animation: a generated-page tell; it would also fight `prefers-reduced-motion`.
- Identical rounded cards for everything: the "how it works" section is a vertical timeline (a real sequence), the evidence is editorial typography with a thin rule, the product is a stage.

## Headline variants considered

1. **"האיומים לא נשארים בשטח. גם ההגנה שלנו לא."** — chosen: it parallels the owner's idea without claiming protection; short; the second sentence sets the project's task.
2. "הזירה עברה לרשת. אנחנו כבר שם." — claims presence ("already there"): not evidenced.
3. "הם נלחמים בשטח. אנחנו שומרים עליהם ברשת." — claims an operating protection service: not evidenced.
4. "מאחורי כל שיחה חיה — עין ערה." — poetic but unclear to a donor.
5. "ערנות אנושית לשיחות חיות." — clear, but it is a description, not a promise; used in the title and lede.

Gallery pair (the two sentences above the screenshots): **"מאחורי כל משמרת עומדים אנשים." / "מאחוריהם — מערכת שהופכת ערנות לפעולה מסודרת."** Alternatives: "מתוך אתגר אמיתי נולדה מערכת…" (the owner's example, longer) and "כך נראית ערנות כשהיא מקבלת מבנה." (clever, less clear).

## Tokens (see `src/styles/global.css`)

Navy 950/900/800/700; blue 500/600/700; cyan 300/500; coral 500/700; paper, white, ink. Type scale: fluid `clamp()` steps from 17 px body to 5.6 rem hero. Radii 8/14/22. Container 1180 px (1340 px from 1600 px). Everything is in `rem`, so the text-size adjustment scales the whole layout. High-contrast mode is a second token set (black, white, yellow `#ffe600`), not an overlay.

## Voice

Hebrew-first, plain verbs, no exclamation marks, no slogans that sound like claims. "מיזם התנדבותי, בפיתוח" stays visible. "תמכו במיזם" says what the button does; "לשותפות עם CIC" says where it goes.
