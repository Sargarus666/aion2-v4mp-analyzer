# AION 2 Build Lab — architecture, trust and design audit

**Audit snapshot:** 6 November 2026  
**Repository:** `Sargarus666/aion2-v4mp-analyzer` · `main`  
**Character:** `v4mp` · Ranger · Global/EU · Kromede

## Live data contract observed

The latest successful GitHub diagnostic run against the public NCSOFT character endpoints returned HTTP 200 for both `info` and `equipment`.

- `info` is a root object with `profile`, `stat.statList`, `title`, `ranking` and `daevanion.boardList`.
- `equipment` is a root object with `equipment.equipmentList`, `equipment.skinList`, `petwing` and `skill.skillList`.
- The diagnostic sample contained 17 stat rows, 25 equipment rows, 35 skills and 6 Daevanion boards.
- Each `statList` row can contain its own `statSecondList` array. Normalization now preserves the original row and exposes each nested bonus as a separate row; `desc` is also accepted as a value field.
- The public profile exposes `combatPower` and an `ItemLevel` stat. It does **not** expose a separate `Gear Score` field in the observed response. Shugo.GG currently labels its own value as Gear Score 2,111 while the NCSOFT `ItemLevel` sample is 2,212; both sources show CP 98,198. These labels are not merged. The app uses NCSOFT ItemLevel for dungeon-entry planning and labels it iLvl.
- The current equipment payload includes item identity, slot, grade, enchant/exceed and icon. It also includes a `petwing` object with `pet`, `wing` and `wingSkin` branches; the normalizer retains those branches and the equipment view surfaces populated entries. The endpoint validator now accepts a petwing-only response as usable, with a dedicated regression test. It does not include full Soul Binding rolls or installed manastones in the observed payload.
- Farm cards compare equipped items against known AION2.GG base item levels plus the NCSOFT enchant level. Unknown current items remain unclassified; this is an item-level gate only, not a stat/Soul-Binding/DPS simulation.
- Nuakum is presented as a medium-priority, slot-specific dungeon step rather than a full endgame set: AION2 META's 3 November Global top-136 snapshot lists Dragon Lord armor as the most common endgame direction.
- The current Daevanion payload provides board open state, open node count, total node count and percent, but not node-level effects. The UI shows only the confirmed board summary.
- No arcana array was present in the observed NCSOFT equipment response. The app does not synthesize one; Shugo.GG remains an external cross-check.

## API reliability and boundaries

- Browser requests use the same-origin `/api/profile` Cloudflare Pages Function. The browser does not call NCSOFT cross-origin, so no wildcard CORS policy is required.
- Upstream calls have a 10-second timeout; the browser request has a 15-second timeout.
- One bounded retry is allowed for 429/502/503/504. A future `Retry-After` beyond the small retry budget is respected by not retrying early.
- Upstream success responses use a 45-second edge cache; explicit refresh requests bypass that cache.
- Partial responses include structured failed-endpoint identifiers and warnings. A successful HTTP 200 with an empty or structurally unusable `info` or `equipment` payload is treated as a failed endpoint, not as a fresh complete snapshot. The browser keeps the last successful sections for a failed endpoint and marks those sections stale. A fully failed refresh leaves the last snapshot visible.
- Partial and error responses are not treated as a complete fresh snapshot. A complete response clears stale markers.
- The function uses fixed public NCSOFT endpoints and fixed character identifiers; it does not accept arbitrary upstream URLs or bypass login, anti-bot controls or rate limits.

## Drop and build evidence policy

- AION2.GG's EU/NA client data (2.0.10.0, extracted 5 November 2026) reports exact probabilities **per reward-cube roll**. The app labels them that way and links each item page.
- AION2 Hub's Global dungeon pages show a modelled estimate **per clear**. Those values are kept separate and are not presented as exact per-roll rates.
- Guaranteed selection after 28 cube uses is shown only for items whose current item page explicitly lists that guarantee.
- NCSOFT's 4 November patch notes are the source for Ludra entry iLvl, one-hour limit and voucher/bracelet rules. No Ludra drop percentage is invented.
- Build-guide level milestones, Global popularity and KR sample averages are labelled by source and date. Conflicting Snipe/Deadshot priorities are shown as separate source recommendations, not merged into a fabricated universal DPS order.
- No DPS percentage, upgrade gain, item stat roll or drop source is calculated from a name alone.

## Visual direction (research translated into product rules)

The visual system remains a custom AION 2 field-console identity: deep blue-black surfaces, restrained teal signal color, muted gold for premium/priority states, editorial display heading, compact data cards and a consistent grid. The hero now uses the actual NCSOFT `profileImage` only after the HTTPS host allowlist check; if the image is absent or fails, a text-only AION 2 fallback remains. It is not a clone of a builder template.

- **Tilda:** composition, visual hierarchy and readable text/image pairing; use one clear hero and a deliberate information order.
- **Wix Studio:** responsive grids and breakpoint-specific layout; avoid mouse-parallax effects that add little value to a data tool.
- **Webflow:** use interaction examples as a reference for clear hover/focus feedback and modular sections, not as a reason to add scroll-heavy animation.
- **Framer:** study dark, grid and large-type galleries for visual rhythm; keep the interface editorial without hiding operational data.
- **Awwwards:** use craft and interaction quality as a benchmark, while prioritising task completion, reliability and mobile legibility over spectacle.

Research references checked 6 November 2026: [Tilda Made on Tilda](https://tilda.cc/madeontilda/), [Wix Studio Inspiration](https://www.wix.com/studio/inspiration), [Webflow Interactions showcase](https://webflow.com/made-in-webflow/interactions), [Framer Quadro Studio](https://www.framer.com/marketplace/templates/quadro-studio/) and [Awwwards dark-site collection](https://www.awwwards.com/websites/dark/). The references support editorial hierarchy, strict grids, dark tonal systems, reusable card patterns and concise interaction feedback; no template, custom cursor, parallax scene or WebGL effect was copied. The art direction pass also removes the residual purple tint in the global background and hover glow in favour of the same cyan/teal signal palette used by the AION 2 cards.

The interface uses short transform/opacity transitions, native details/summary for expandable farm guidance, lazy images and a `prefers-reduced-motion` override. The hero aura is static (no infinite pulse), the hero gradient has no blur filter, sticky surfaces use a 4px blur on desktop and opaque backgrounds without backdrop blur on narrow screens. No canvas, WebGL or continuous background video is introduced.

## Security, accessibility and performance review

- React renders upstream text as text; no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or dynamic function execution is used in the UI.
- Remote icons and the hero portrait pass through an HTTPS NCSOFT-host allowlist; unknown hosts and non-HTTPS schemes are rejected. The portrait has descriptive alternative text and a text-only failure fallback.
- New-tab links use `rel="noreferrer"`.
- Native buttons, anchors and disclosure elements remain keyboard-operable; status and error regions use status/alert semantics; Daevanion progress has accessible labels and values.
- Responsive breakpoints exist for desktop, tablet and narrow mobile layouts. Selected foreground/background token pairs were manually contrast-checked: primary button 12.59:1, primary-container text 11.33:1, secondary button 7.09:1, muted text 10.35:1 and outline text 6.13:1. This is a token sample, not a complete device-lab or automated axe certification.
- The project uses Node's built-in test runner rather than Vitest. CI runs tests, syntax checks, production build and `npm audit`.
- Playwright, axe-core and Lighthouse CI are not installed in this repository; no automated browser, contrast or Core Web Vitals result is claimed.
- A dedicated Gitleaks Action v3.0.0 job is configured in CI and pinned to a full commit SHA. Push/PR runs scan the incoming commit range; `workflow_dispatch` and the weekly Monday 03:00 UTC schedule scan full history. The current push run scanned one commit and found no leaks; that is not a guarantee that a previously leaked secret is safe to keep.

## Remaining data/runtime gaps

1. No node-level Daevanion API response is currently consumed.
2. No full item-detail endpoint is called for Soul Binding/manastones; additional external requests are intentionally not added without a stable, permitted contract.
3. Arcana are not supplied by the observed NCSOFT profile payload.
4. Shugo.GG's FAQ explicitly says it has no public API, so the project does not scrape its page or silently import its Gear Score. Its public profile remains a manual cross-check; NCSOFT's observed payload supplies CP and ItemLevel, not a separate Gear Score. The NotMeter deep link could not be independently rendered in the research browser.
5. Production Cloudflare Pages runtime could not be fetched from this execution environment. GitHub build success is not treated as proof of production deployment.


## Execution boundaries

- No independent coding-agent/sub-agent connector was available in this execution environment. No delegated review was simulated.
- `PlayGround` and `SmartSearch` were not modified.
- The repository currently has no lint, typecheck, browser E2E, axe-core or Lighthouse CI scripts. Those checks remain unclaimed; the available Node tests, syntax checks, Vite build and npm audit are run by GitHub Actions.


## Current implementation pass — 6 November 2026

- Fixed a data-quality edge case: when NCSOFT's equipment endpoint returns only `petwing`, it is no longer discarded as an empty equipment response. A regression test verifies that the partial shape remains available without marking the whole endpoint stale.
- Added a responsive portrait panel to the hero using the live NCSOFT profile image, with a text-only fallback and descriptive `alt` text. The image is loaded eagerly because it is the only new above-the-fold visual.
- Harmonised all Material-derived surface, primary, secondary, outline and text tokens with the cyan/teal + muted-gold identity. Selected token contrast ratios were calculated manually. Removed the infinite hero pulse and 5px hero blur; sticky navigation blur is reduced to 4px on desktop and disabled on narrow screens. No canvas, WebGL, video, new runtime dependency or additional animation library was added.
- Increased the smallest farm guidance text on narrow screens; the existing reduced-motion override still disables transitions and animations.
- The public Shugo.GG FAQ says there is no public data API. Its current profile was useful to cross-check v4mp's displayed GS, gear and Arcana, but the project deliberately does not scrape or merge that value into NCSOFT's CP/iLvl fields.
- AION2 Companion's Ranger guide was also checked on 6 November and labels its PvE stat order as editorial. It is treated as a separate community opinion, not a measured DPS formula.

- Added a separate Gitleaks secret scan to GitHub Actions, pinned by commit SHA; PR comments are disabled and the personal repository does not require an organization license. Push/PR events scan the incoming commit range; manual and weekly scheduled runs scan full history.

- Entry-gate wording is source-labelled: AION2 META calls Conquest Tier 3's 2,100 threshold ItemLevel, while AION2 Guides labels the dungeon gate GS 2,100. The UI keeps NCSOFT ItemLevel separate from Shugo Gear Score and tells the user to verify the in-game gate rather than silently treating the two labels as identical.
