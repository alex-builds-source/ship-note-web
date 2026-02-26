# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Added
- `targetRef` support for exact release-range draft generation (`baseRef..targetRef`).
- Benchmark harness V2 with mixed cohorts and fairness artifacts (`samples_v2`, `results_v2`, `SUMMARY_V2`).
- UI features: shareable URL state, sample shortcuts, and raw/preview output tabs.

### Changed
- Refined product positioning in UI/docs with explicit guidance on when to use ship-note-web vs GitHub Auto Notes.
- Upgraded visual design to a modern card-based utility layout for faster scan/use.

## [0.1.0] - 2026-02-25
### Added
- Initial `ship-note-web` MVP scaffold.
- Cloudflare Pages/Workers baseline (`public/`, `functions/`, `wrangler.toml`).
- `POST /api/generate` endpoint for GitHub-backed markdown draft generation.
- Deterministic draft renderer with `standard`/`short` presets and low-signal filtering.
- Basic browser UI with form input, draft output, and copy action.
- Node tests for repo parsing, changelog extraction, and rendering behavior.
