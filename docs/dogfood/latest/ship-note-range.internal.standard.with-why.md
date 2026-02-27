# ship-note internal release brief

## Internal highlights
- Make why-section optional and ship v0.1.11
- `--with-why` flag to include `Why it matters` only when explicitly requested.
- `Why it matters` is no longer included by default in markdown output.
- Preserved structured payload compatibility by returning `sections.why_it_matters` as an empty list when omitted.
- Expanded tests for default omission vs explicit inclusion behavior.

## Why it matters internally
- Covers `v0.1.10..v0.1.11` with 1 commit-derived item(s).
- Distills raw commit/changelog data into a concise summary so readers can triage changes faster.
- Adds 4 changelog item(s) when commit subjects alone miss context.
- Emphasizes concise internal communication for team context and handoffs.

## References
- Repo: https://github.com/alex-builds-source/ship-note
