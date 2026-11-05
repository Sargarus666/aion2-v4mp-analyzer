# AION 2 — v4mp Build Analyzer

Responsive React/Vite MVP for a fan-made AION 2 Ranger build analyzer.

## Current scope
- Character dashboard for `v4mp` (Global EU · Kromede).
- Sections for overview, equipment, stats, skills, arcana and farming plan.
- JSON import/export for structured character data.
- Cloudflare Pages Function scaffold that checks public profile reachability only.

## Important limitations
- Shuggo.GG parsing is **not implemented** yet.
- No top-build dataset is bundled yet.
- Recommendations are scaffolding, not calculated upgrade rankings.
- Gear Score, Combat Power and boss DPS must be evaluated separately. DPS cannot be reliably inferred from GS/CP alone.
- The profile endpoint does not bypass anti-bot controls or access private data.

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy
Connect this repository to Cloudflare Pages, use `npm run build` as the build command and `dist` as the output directory. Pages Functions in `functions/` are deployed with the project.

## Next development milestones
1. Inspect the public Shuggo.GG profile response and determine whether stable structured data is exposed.
2. Implement a validated read-only importer with clear failure states.
3. Build a sourced top-Ranger dataset and identify patch/version timestamps.
4. Add item/skill/arcana comparison and transparent GS/CP/DPS estimates.
5. Rank dungeon farming options by expected value and confidence.
