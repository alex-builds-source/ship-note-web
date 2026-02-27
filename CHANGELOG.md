# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4] - 2026-02-27
### Added
- Destination quality review script (`npm run dogfood:quality`) with generated report at `docs/dogfood/latest/QUALITY_REPORT.md`.
- Real-world agent workflow guide (`docs/AGENT_RECIPES.md`) for release/social/internal usage.
- Destination dogfood snapshot generator (`npm run dogfood:destinations`) for ongoing wording regression checks.

### Changed
- Improved destination output readability by reducing code-style/meta-heavy bullets in social/update modes.
- Added destination-specific headings and tightened social short output density.

## [0.1.3] - 2026-02-26
### Added
- Multi-scenario fixture index (`docs/fixtures/index.json`) with canonical scenarios:
  - `release-standard`
  - `social-short`
  - `internal-standard-with-why`
- Fixture-driven snippet generator supporting per-scenario outputs (`docs/snippets/<fixture-id>/*`).
- Generated integration guide now composes all scenarios (`docs/AGENT_INTEGRATION.md`).
- Fixture contract guard tests (`tests/fixtures.test.js`) for required keys and duplicate-ID protection.
- Drift guard extended to ensure legacy root-level snippet files are removed.

### Changed
- Snippet docs workflow now uses fixture index + scenario files as source-of-truth.
- `snippets:generate` now writes scenario bundles + composed guide in one pass.

## [0.1.2] - 2026-02-26
### Added
- `includeWhy` / `include_why` request option for explicitly including `Why it matters` section.

### Changed
- `Why it matters` is off by default in web output to avoid template filler in release notes.
- UI now exposes explicit `Why section` control (off/on).
- Destination controls are more visible and practical in UI.

## [0.1.1] - 2026-02-26
### Added
- `targetRef` support for exact release-range draft generation (`baseRef..targetRef`).
- Benchmark harness V2 with mixed cohorts and fairness artifacts (`samples_v2`, `results_v2`, `SUMMARY_V2`).
- Structured API contract fields aligned with CLI schema (`schema_version`, `repo`, `range`, `options`, `stats`, `sections`, `items`, `markdown`).
- Destination-aware draft mode (`release|update|social|internal`) across API and UI.
- API hardening controls (request validation + local endpoint rate limiting + clearer error codes/hints).

### Changed
- Refined product positioning in UI/docs with explicit guidance on when to use ship-note-web vs GitHub Auto Notes.
- Upgraded visual design to a modern card-based utility layout for faster scan/use.
- Kept legacy camelCase response aliases for transitional compatibility.

## [0.1.0] - 2026-02-25
### Added
- Initial `ship-note-web` MVP scaffold.
- Cloudflare Pages/Workers baseline (`public/`, `functions/`, `wrangler.toml`).
- `POST /api/generate` endpoint for GitHub-backed markdown draft generation.
- Deterministic draft renderer with `standard`/`short` presets and low-signal filtering.
- Basic browser UI with form input, draft output, and copy action.
- Node tests for repo parsing, changelog extraction, and rendering behavior.
