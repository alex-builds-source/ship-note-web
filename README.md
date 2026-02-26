# ship-note-web

Generate concise release/devlog drafts from public GitHub repos in a browser.

## What it does (MVP)
- Input a repo URL (`owner/repo` or full GitHub URL)
- Resolve range (`latest tag..HEAD`, with optional base and target ref overrides)
- Produce deterministic markdown in `standard` or `short` mode
- Copy draft, preview rendered output, and share prefilled links
- Show lane guidance: when to use this tool vs GitHub Auto Notes

## Why this exists
GitHub auto notes and release automation are useful, but often require repo setup and still need heavy editing for channel-ready updates. `ship-note-web` targets fast ad-hoc drafting with zero repository config.

## Local run

```bash
npm install
npm run dev
```

Then open the local Pages dev URL printed by Wrangler.

## API
- `POST /api/generate`
- Request JSON:
  - `repo` (required)
  - `preset` (`standard` | `short`)
  - `baseRef` (optional)
  - `targetRef` (optional, default `HEAD`)
  - `releaseUrl` (optional)
- Response JSON:
  - `ok`, `repo`, `baseRef`, `targetRef`, `commitCount`, `markdown`

See `docs/API.md` for details.

## Testing

```bash
npm test
```

## Benchmark harness

```bash
npm run benchmark
npm run benchmark:v2
```

Outputs:
- `benchmark/results.json` + `benchmark/SUMMARY.md` (V1)
- `benchmark/results_v2.json` + `benchmark/SUMMARY_V2.md` (mixed-cohort fairness run)

## Security
- Public-repo mode by default (no user tokens required).
- Optional `GITHUB_TOKEN` Worker secret can be added server-side for higher rate limits.
- Never expose secrets in client code.
