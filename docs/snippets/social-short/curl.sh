#!/usr/bin/env bash
set -euo pipefail

curl -sS -X POST 'https://ship-note-web.pages.dev/api/generate' \
  -H 'content-type: application/json' \
  -d '{
  "repo": "alex-builds-source/ship-note",
  "preset": "short",
  "destination": "social",
  "includeWhy": false,
  "baseRef": "v0.1.10",
  "targetRef": "v0.1.11"
}' | jq .
