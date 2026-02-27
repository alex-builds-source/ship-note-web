# API

## Endpoint

`POST /api/generate`

Generate a release/devlog draft from GitHub repository history.

## Request body

```json
{
  "repo": "alex-builds-source/ship-note",
  "preset": "standard",
  "destination": "release",
  "includeWhy": false,
  "baseRef": "v0.1.8",
  "targetRef": "v0.1.9",
  "releaseUrl": "https://github.com/alex-builds-source/ship-note/releases/tag/v0.1.9"
}
```

### Fields
- `repo` (string, required): `owner/repo` or full GitHub repo URL
- `preset` (string, optional): `standard` (default) or `short`
- `destination` (string, optional): `release` (default), `update`, `social`, `internal`
- `includeWhy` / `include_why` (boolean, optional): include `Why it matters` section (`false` default)
- `baseRef` / `base_ref` (string, optional): compare base ref/tag; defaults to latest tag
- `targetRef` / `target_ref` (string, optional): compare target ref/tag; defaults to `HEAD`
- `releaseUrl` / `release_url` (string, optional): included in Links section

## Response (success)

```json
{
  "ok": true,
  "schema_version": "1.0",
  "repo": {
    "name": "alex-builds-source/ship-note",
    "url": "https://github.com/alex-builds-source/ship-note"
  },
  "range": {
    "base_ref": "v0.1.8",
    "target_ref": "v0.1.9",
    "range_spec": "v0.1.8..v0.1.9"
  },
  "options": {
    "preset": "standard",
    "group_by": "type",
    "destination": "release",
    "include_why": false
  },
  "stats": {
    "raw_commit_count": 3,
    "selected_commit_count": 3,
    "commit_items_used": 2,
    "changelog_items_used": 1,
    "bullet_line_count": 3
  },
  "sections": {
    "title": "# ship-note release draft",
    "what_shipped": ["- Added parser improvements"],
    "why_it_matters": [],
    "links": ["- Repo: https://github.com/alex-builds-source/ship-note"]
  },
  "items": [
    {
      "source": "commit",
      "text": "add parser improvements",
      "sha": "abc123",
      "type": "feat",
      "scope": "general"
    }
  ],
  "markdown": "# ship-note release draft\n..."
}
```

`sections.why_it_matters` is empty unless `includeWhy` is enabled.

### Legacy compatibility aliases
For transition safety, responses also include legacy camelCase aliases:
- `schemaVersion`, `baseRef`, `targetRef`, `rangeSpec`, `commitCount`

## Error responses

### Validation / bad request

```json
{
  "ok": false,
  "code": "BAD_REQUEST",
  "error": "preset must be one of: standard, short"
}
```

### Local endpoint rate limit (service hardening)

```json
{
  "ok": false,
  "code": "LOCAL_RATE_LIMIT",
  "error": "Too many requests for this endpoint.",
  "hint": "Try again in ~42s."
}
```

### GitHub API rate limit

```json
{
  "ok": false,
  "code": "GITHUB_RATE_LIMIT",
  "error": "GitHub API rate limit reached.",
  "hint": "Anonymous GitHub API limit reached. Configure GITHUB_TOKEN in Cloudflare Pages to raise API budget."
}
```

## Notes
- Supports public GitHub repositories.
- Set optional `GITHUB_TOKEN` in Cloudflare Pages for higher GitHub API budget.
- Response header includes `x-ship-note-schema`.
- Generated agent examples are available in `docs/AGENT_INTEGRATION.md`.
