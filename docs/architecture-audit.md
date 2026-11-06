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
- The current equipment payload includes item identity, slot, grade, enchant/exceed and icon. It does not include full Soul Binding rolls or installed manastones in the observed payload.
- The current Daevanion payload provides board open state, open node count, total node count and percent, but not node-level effects. The UI shows only the confirmed board summary.
- No arcana array was present in the observed NCSOFT equipment response. The app does not synthesize one; Shugo.GG remains an external cross-check.

## API reliability and boundaries

- Browser requests use the same-origin `/api/profile` Cloudflare Pages Function. The browser does not call NCSOFT cross-origin, so no wildcard CORS policy is required.
- Upstream calls have a 10-second timeout; the browser request has a 15-second timeout.
- One bounded retry is allowed for 429/502/503/504. A future `Retry-After` beyond the small retry budget is respected by not retrying early.
- Upstream success responses use a 45-second edge cache; explicit refresh requests bypass that cache.
- Partial responses include structured failed-endpoint identifiers and warnings. The browser keeps the last successful sections for a failed endpoint and marks those sections stale. A fully failed refresh leaves the last snapshot visible.
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

The visual system remains a custom AION 2 field-console identity: deep blue-black surfaces, restrained teal signal color, muted gold for premium/priority states, editorial display heading, compact data cards and a consistent grid. It is not a clone of a builder template.

- **Tilda:** composition, visual hierarchy and readable text/image pairing; use one clear hero and a deliberate information order.
- **Wix Studio:** responsive grids and breakpoint-specific layout; avoid mouse-parallax effects that add little value to a data tool.
- **Webflow:** use interaction examples as a reference for clear hover/focus feedback and modular sections, not as a reason to add scroll-heavy animation.
- **Framer:** study dark, grid and large-type galleries for visual rhythm; keep the interface editorial without hiding operational data.
- **Awwwards:** use craft and interaction quality as a benchmark, while prioritising task completion, reliability and mobile legibility over spectacle.

The interface uses short transform/opacity transitions, native details/summary for expandable farm guidance, lazy images and a `prefers-reduced-motion` override. No canvas, WebGL, continuous background video or heavy blur layer is introduced. A decorative box-shadow pulse was removed.

## Security, accessibility and performance review

- React renders upstream text as text; no `dangerouslySetInnerHTML`, `innerHTML`, `eval` or dynamic function execution is used in the UI.
- Remote icons pass through an HTTPS NCSOFT-host allowlist; unknown hosts and non-HTTPS schemes are rejected.
- New-tab links use `rel="noreferrer"`.
- Native buttons, anchors and disclosure elements remain keyboard-operable; status and error regions use status/alert semantics; Daevanion progress has accessible labels and values.
- Responsive breakpoints exist for desktop, tablet and narrow mobile layouts. This is a source-level review, not a device-lab certification.
- The project uses Node's built-in test runner rather than Vitest. CI runs tests, syntax checks, production build and `npm audit`.
- Playwright, axe-core and Lighthouse CI are not installed in this repository; no automated browser, contrast or Core Web Vitals result is claimed.
- No dedicated secret-scanning action is configured in the current workflow. This audit does not claim a Gitleaks/secret-scanner pass.

## Remaining data/runtime gaps

1. No node-level Daevanion API response is currently consumed.
2. No full item-detail endpoint is called for Soul Binding/manastones; additional external requests are intentionally not added without a stable, permitted contract.
3. Arcana are not supplied by the observed NCSOFT profile payload.
4. The NotMeter deep link could not be independently rendered in the research browser; Shugo.GG's public profile was readable and explicitly identifies its data as NCSOFT character API.
5. Production Cloudflare Pages runtime could not be fetched from this execution environment. GitHub build success is not treated as proof of production deployment.
