# Destination Output Review Notes

Updated: 2026-02-27 UTC

## Manual review summary

### release.standard
- Strengths:
  - clear `What shipped` output with stable links section
  - rationale omitted by default (good for public release notes)
- Gaps:
  - still occasional technical phrasing from commit subjects when commit style is maintenance-heavy

### update.standard
- Strengths:
  - compact and readable heading structure
  - reduced meta/code noise compared to previous run
- Gaps:
  - some bullets could be rewritten from technical imperative to stakeholder wording

### social.short
- Strengths:
  - very compact output
  - single-link policy reduces clutter
- Gaps:
  - bullet language can still read commit-centric instead of audience-centric

### internal.standard.with-why
- Strengths:
  - why section now explicitly opt-in and scoped to internal use
- Gaps:
  - with low commit volume, rationale can still feel generic

## Recommended next tuning pass
1. Add destination-specific wording transforms:
   - social: stronger plain-language rewrite pass
   - update: stakeholder-oriented phrasing
2. Add optional map from commit type -> audience language hints.
3. Add golden snapshot tests for one scenario per destination.
