# Destination Quality Scoring

This project uses a lightweight heuristic score to catch regressions in destination output readability.

## Commands

```bash
npm run dogfood:destinations
npm run dogfood:quality
npm run dogfood:quality:check
npm run dogfood:todo
```

## Artifacts
- `docs/dogfood/latest/QUALITY_REPORT.md`
- `docs/dogfood/latest/QUALITY_REPORT.json`
- `docs/dogfood/latest/TUNING_TODO.md`

## Metrics
- **Long**: bullet lines over 110 chars
- **Codey**: bullets containing inline code formatting
- **Meta**: bullets that look like process/mechanics, not user-impact

## Threshold policy
- Default CI threshold: `90/100` average
- If below threshold:
  1. inspect lowest-score files in `TUNING_TODO.md`
  2. tune destination wording/filter logic
  3. regenerate dogfood outputs and rerun checks

## Limitations
- This is heuristic, not semantic quality judgment.
- Keep manual review notes in `docs/dogfood/latest/REVIEW_NOTES.md` for context.
