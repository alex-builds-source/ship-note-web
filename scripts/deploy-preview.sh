#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

"/home/openclaw/.openclaw/workspace/scripts/wrangler-cf.sh" pages deploy public --project-name=ship-note-web "$@"
