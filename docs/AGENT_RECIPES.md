# Agent Recipes (Real-World)

Use these when integrating `ship-note-web` into autonomous workflows.

## 1) Release-ready notes for tagged deploy

Use when a release tag is created and you want clean release notes with minimal editorial overhead.

### Request shape
- `preset`: `standard`
- `destination`: `release`
- `includeWhy`: `false`
- provide `baseRef` and `targetRef` for exact release range

### Example (curl)
```bash
curl -sS -X POST "https://ship-note-web.pages.dev/api/generate" \
  -H "content-type: application/json" \
  -d '{
    "repo": "alex-builds-source/ship-note",
    "preset": "standard",
    "destination": "release",
    "includeWhy": false,
    "baseRef": "v0.1.10",
    "targetRef": "v0.1.11"
  }'
```

### Agent behavior
1. call API
2. use `markdown`
3. if `items` empty, skip publish and mark no-change

---

## 2) Social post draft after shipping

Use when you need short copy for X/Discord/Slack after a release.

### Request shape
- `preset`: `short`
- `destination`: `social`
- `includeWhy`: `false`

### Agent behavior
1. call API
2. pull top 2 bullets from `sections.what_shipped`
3. prepend one-line hook
4. post to channel

### Notes
- social mode intentionally limits bullet count for readability.

---

## 3) Internal handoff summary

Use when a team channel needs release context plus rationale.

### Request shape
- `preset`: `standard`
- `destination`: `internal`
- `includeWhy`: `true`

### Agent behavior
1. call API
2. include `sections.what_shipped`
3. include `sections.why_it_matters` in internal notes only
4. attach release link if available

---

## Decision guide
- public release page → `release` + `standard`
- social post → `social` + `short`
- team handoff → `internal` + `standard` (+ `includeWhy=true`)
- quick status update → `update` + `short` or `standard`

For canonical machine-readable fixtures/snippets, see:
- `docs/fixtures/index.json`
- `docs/AGENT_INTEGRATION.md`
