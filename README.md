# ship-note-web

Generate concise release/devlog drafts from public GitHub repos in a browser.

## What it does (MVP)
- Input a repo URL (`owner/repo` or full GitHub URL)
- Resolve range (`latest tag..HEAD`, or optional base ref override)
- Produce deterministic markdown in `standard` or `short` mode
- Copy draft and edit before publishing

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
  - `releaseUrl` (optional)
- Response JSON:
  - `ok`, `repo`, `baseRef`, `targetRef`, `commitCount`, `markdown`

See `docs/API.md` for details.

## Testing

```bash
npm test
```

## Security
- Public-repo mode by default (no user tokens required).
- Optional `GITHUB_TOKEN` Worker secret can be added server-side for higher rate limits.
- Never expose secrets in client code.
