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
  "releaseUrl": "https://github.com/alex-builds-source/ship-note/releases/tag/v0.1.9"
}
```

### Fields
- `repo` (string, required): `owner/repo` or full GitHub repo URL
- `preset` (string, optional): `standard` (default) or `short`
- `baseRef` (string, optional): tag/ref used as compare base; defaults to latest tag
- `releaseUrl` (string, optional): included in Links section

## Response (success)

```json
{
  "ok": true,
  "repo": "alex-builds-source/ship-note",
  "baseRef": "v0.1.8",
  "targetRef": "HEAD",
  "preset": "standard",
  "commitCount": 3,
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

## Notes
- Currently supports public GitHub repositories only.
- Server can use optional `GITHUB_TOKEN` secret to increase API budget.
