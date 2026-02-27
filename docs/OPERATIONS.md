# Operations Guide

## Cloudflare deploy workflow (non-interactive safe)

Use wrapper scripts so Cloudflare credentials are always loaded in non-interactive shells.

### Deploy preview
```bash
scripts/deploy-preview.sh
```

### List deployments
```bash
/home/openclaw/.openclaw/workspace/scripts/wrangler-cf.sh pages deployment list --project-name ship-note-web
```

## Why this matters
Direct `npx wrangler ...` in non-interactive environments can fail with token-missing errors if `~/.config/secrets/cloudflare.env` is not sourced.

The wrappers load credentials first and prevent false blocker alerts.

## Deployment cleanup
Dry run first:
```bash
scripts/cleanup-deployments.sh --keep 3 --dry-run
```

Apply deletion:
```bash
scripts/cleanup-deployments.sh --keep 3 --apply
```

## Quality gates
Before shipping runtime wording changes:
```bash
npm run dogfood:destinations
npm run dogfood:quality
npm run dogfood:quality:check
npm test
```
