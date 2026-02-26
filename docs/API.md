# API

## Endpoint

`POST /api/generate`

Generate a markdown release/devlog draft from public GitHub repository history.

## Request body

```json
{
  "repo": "alex-builds-source/ship-note",
  "preset": "standard",
  "baseRef": "v0.1.8",
  "targetRef": "v0.1.9",
  "releaseUrl": "https://github.com/alex-builds-source/ship-note/releases/tag/v0.1.9"
}
```

### Fields
- `repo` (string, required): `owner/repo` or full GitHub repo URL
- `preset` (string, optional): `standard` (default) or `short`
- `baseRef` (string, optional): tag/ref used as compare base; defaults to latest tag
- `targetRef` (string, optional): compare target ref/tag; defaults to `HEAD`
- `releaseUrl` (string, optional): included in Links section

## Response (success)

```json
{
  "ok": true,
  "schemaVersion": "1.0",
  "repo": "alex-builds-source/ship-note",
  "baseRef": "v0.1.8",
  "targetRef": "v0.1.9",
  "rangeSpec": "v0.1.8..v0.1.9",
  "preset": "standard",
  "commitCount": 3,
  "sections": {
    "whatShipped": ["- Added parser improvements"],
    "whyItMatters": ["- Covers `v0.1.8..v0.1.9` using 2 distilled bullet(s) from 3 commit(s)."],
    "links": ["- Repo: https://github.com/alex-builds-source/ship-note"]
  },
  "items": [
    {"source": "commit", "text": "add parser improvements", "type": "feat", "scope": "general"}
  ],
  "markdown": "# ship-note release draft\n..."
}
```

## Response (error)

```json
{
  "ok": false,
  "error": "only github.com repositories are supported"
}
```

Rate limit errors are returned with a dedicated code and hint:

```json
{
  "ok": false,
  "error": "GitHub API rate limit reached.",
  "code": "GITHUB_RATE_LIMIT",
  "hint": "Anonymous GitHub API limit reached. Configure GITHUB_TOKEN in Cloudflare Pages to raise API budget."
}
```

## Notes
- Currently supports public GitHub repositories only.
- Server can use optional `GITHUB_TOKEN` secret to increase API budget.
