# ship-note-web

Generate concise release/devlog drafts from public GitHub repos in a browser.

## What it does (MVP)
- Input a repo URL (`owner/repo` or full GitHub URL)
- Resolve range (`latest tag..HEAD`, with optional base and target ref overrides)
- Produce deterministic markdown in `standard` or `short` mode
- Tune destination tone via `release` / `update` / `social` / `internal`
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
  - `destination` (`release` | `update` | `social` | `internal`)
  - `includeWhy` (optional boolean, default `false`)
  - `baseRef`/`targetRef` (optional range overrides)
  - `releaseUrl` (optional)
- Response JSON (canonical):
  - `schema_version`, `repo`, `range`, `options`, `stats`, `sections`, `items`, `markdown`
  - plus transitional legacy aliases (`schemaVersion`, `baseRef`, `targetRef`, `rangeSpec`, `commitCount`)

See `docs/API.md` for details.
See `docs/AGENT_INTEGRATION.md` for generated copy-paste examples.
See `docs/AGENT_RECIPES.md` for real-world workflow recipes.
See `docs/OPERATIONS.md` for deploy/cleanup and quality-gate workflow.

## Testing

```bash
npm test
npm run snippets:check
npm run dogfood:destinations
npm run dogfood:quality:check
```

## Snippet generation (agent examples)

```bash
npm run snippets:generate
npm run snippets:check
```

Fixture sources:
- `docs/fixtures/index.json`
- `docs/fixtures/schema.v1.*.json`

Generated outputs:
- `docs/AGENT_INTEGRATION.md`
- `docs/snippets/<fixture-id>/*`

To add a scenario:
1. create fixture file in `docs/fixtures/`
2. register it in `docs/fixtures/index.json`
3. run `npm run snippets:generate`

## Destination dogfood snapshots

```bash
npm run dogfood:destinations
npm run dogfood:quality
npm run dogfood:quality:check
npm run dogfood:todo
```

Outputs:
- `docs/dogfood/latest/SUMMARY.md`
- `docs/dogfood/latest/QUALITY_REPORT.md`
- `docs/dogfood/latest/*.md`
- `docs/dogfood/latest/*.json`

## Deployment housekeeping

List and prune old direct-upload deployments (dry run by default):

```bash
scripts/cleanup-deployments.sh --keep 3 --dry-run
scripts/cleanup-deployments.sh --keep 3 --apply
```

## Benchmark harness

```bash
npm run benchmark
npm run benchmark:v2
```

Outputs:
- `benchmark/results.json` + `benchmark/SUMMARY.md` (V1)
- `benchmark/results_v2.json` + `benchmark/SUMMARY_V2.md` (mixed-cohort fairness run)

## Authenticated mode (optional)
For heavier usage, configure a server-side `GITHUB_TOKEN` so GitHub API budget is higher than anonymous mode.

```bash
wrangler pages secret put GITHUB_TOKEN --project-name ship-note-web
```

Notes:
- Token stays server-side in Cloudflare Pages Functions.
- The UI now surfaces a clearer hint when a GitHub rate limit is hit.

## Security
- Public-repo mode by default (no user tokens required).
- Optional `GITHUB_TOKEN` Worker secret can be added server-side for higher rate limits.
- Never expose secrets in client code.
