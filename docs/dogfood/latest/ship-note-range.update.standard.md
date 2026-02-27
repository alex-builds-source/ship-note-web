# ship-note update draft

## Update highlights
- Make why-section optional and ship v0.1.11
- `--with-why` flag to include `Why it matters` only when explicitly requested.
- `Why it matters` is no longer included by default in markdown output.
- Preserved structured payload compatibility by returning `sections.why_it_matters` as an empty list when omitted.
- Expanded tests for default omission vs explicit inclusion behavior.

## References
- Repo: https://github.com/alex-builds-source/ship-note
