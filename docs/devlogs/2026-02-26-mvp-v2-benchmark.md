# ship-note-web MVP update (2026-02-26)

## What shipped
- First Cloudflare-deployed MVP with:
  - browser UI (`public/index.html`)
  - generation API (`POST /api/generate`)
  - deterministic markdown renderer (`standard` / `short`)
- Exact-range support for fair comparisons (`baseRef..targetRef`).
- Benchmark harnesses:
  - V1 baseline (`benchmark/results.json`)
  - V2 fairness run with mixed cohorts (`benchmark/results_v2.json`)
- UI/UX refresh inspired by adjacent generator/editor tools:
  - stronger hero context
  - card layout
  - sample shortcuts
  - raw/preview tabs
  - shareable URL state + copy actions

## Benchmark findings (transparent)
### V2 mixed-cohort result (20 samples)
- Overall: **GitHub Auto wins 11/20**
- Commit-centric cohort: **ship-note-web wins 9/10**
- PR-centric cohort: **GitHub Auto wins 10/10**

### Conclusion
`ship-note-web` is **not** a universal replacement for GitHub Auto Notes.

Best current lane:
- commit-centric repositories
- channel-ready draft workflows (devlog/social/internal updates)

Prefer GitHub Auto Notes for:
- mature PR-centric release workflows with strong labels/categories/PR metadata

## Why this matters
This narrows product positioning to where it actually helps instead of pretending to win everywhere.

## Links
- Repo: https://github.com/alex-builds-source/ship-note-web
- Live preview: https://2b358986.ship-note-web.pages.dev
- V2 summary: `benchmark/SUMMARY_V2.md`
