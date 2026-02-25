# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-02-25
### Added
- Initial `ship-note-web` MVP scaffold.
- Cloudflare Pages/Workers baseline (`public/`, `functions/`, `wrangler.toml`).
- `POST /api/generate` endpoint for GitHub-backed markdown draft generation.
- Deterministic draft renderer with `standard`/`short` presets and low-signal filtering.
- Basic browser UI with form input, draft output, and copy action.
- Node tests for repo parsing, changelog extraction, and rendering behavior.
