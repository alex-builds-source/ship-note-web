#!/usr/bin/env bash
set -euo pipefail

KEEP_COUNT="${KEEP_COUNT:-3}"
PROJECT_NAME="${PROJECT_NAME:-ship-note-web}"
DRY_RUN=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep)
      KEEP_COUNT="$2"; shift 2;;
    --project)
      PROJECT_NAME="$2"; shift 2;;
    --apply)
      DRY_RUN=0; shift;;
    --dry-run)
      DRY_RUN=1; shift;;
    *)
      echo "Unknown arg: $1" >&2; exit 1;;
  esac
done

if ! [[ "$KEEP_COUNT" =~ ^[0-9]+$ ]] || [[ "$KEEP_COUNT" -lt 1 ]]; then
  echo "--keep must be a positive integer" >&2
  exit 1
fi

WRANGLER="/home/openclaw/.openclaw/workspace/scripts/wrangler-cf.sh"

json="$($WRANGLER pages deployment list --project-name "$PROJECT_NAME" --json)"

count=$(jq 'length' <<<"$json")
if [[ "$count" -le "$KEEP_COUNT" ]]; then
  echo "No cleanup needed: deployments=$count keep=$KEEP_COUNT"
  exit 0
fi

# list is newest-first; keep first KEEP_COUNT, delete the rest
ids_to_delete=$(jq -r --argjson keep "$KEEP_COUNT" '.[ $keep: ] | .[].Id' <<<"$json")

echo "Project: $PROJECT_NAME"
echo "Total deployments: $count"
echo "Keeping newest: $KEEP_COUNT"
echo "Will delete:"
while read -r id; do
  [[ -z "$id" ]] && continue
  dep=$(jq -r --arg id "$id" '.[] | select(.Id==$id) | .Deployment' <<<"$json")
  src=$(jq -r --arg id "$id" '.[] | select(.Id==$id) | .Source' <<<"$json")
  echo "- $id  source=$src  url=$dep"
done <<<"$ids_to_delete"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run only. Re-run with --apply to delete."
  exit 0
fi

while read -r id; do
  [[ -z "$id" ]] && continue
  echo "Deleting $id ..."
  $WRANGLER pages deployment delete "$id" --project-name "$PROJECT_NAME"
done <<<"$ids_to_delete"

echo "Cleanup complete."
