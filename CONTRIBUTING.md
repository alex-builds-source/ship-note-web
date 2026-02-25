# Contributing

Thanks for contributing.

## Before opening a PR
- Keep docs in sync with behavior changes.
- Add or update tests for non-trivial changes.
- Run secret scan checks before pushing.

## Quality checklist
- `pytest -q`
- `gitleaks git --redact`
- update `CHANGELOG.md` when user-visible behavior changes

## Commit style (recommended)
- `feat:` user-visible additions
- `fix:` bug fixes
- `docs:` documentation-only updates
- `chore:` maintenance and release operations
