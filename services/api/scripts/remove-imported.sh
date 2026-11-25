#!/usr/bin/env bash
# Undoes scripts/import-to-env.sh: deletes the charities of one import source
# (and only those: their slugs and everything stored under them), a batch per
# call until none remain; the last call rebuilds the public snapshot.
#
#   scripts/remove-imported.sh <function-name> <source>     e.g. import:charity-map-2026-11-25
#
# Needs jq and the AWS CLI.
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <function-name> <source>" >&2
  exit 2
fi

function_name="$1"
import_source="$2"
limit=50
max_calls=1000

[[ "$function_name" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "error: '$function_name' is not a function name" >&2; exit 2; }
# Goes into a JSON payload: only the shape the API accepts, so nothing can break out of the string.
[[ "$import_source" =~ ^import:[a-z0-9-]+$ ]] || { echo "error: source must look like import:<dataset>" >&2; exit 2; }
command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 2; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
printf '{"task":"remove-imported","source":"%s","limit":%d}\n' "$import_source" "$limit" > "$work/payload.json"

removed=0
for ((call = 1; call <= max_calls; call += 1)); do
  meta="$(aws lambda invoke \
    --function-name "$function_name" \
    --cli-binary-format raw-in-base64-out \
    --payload "fileb://$work/payload.json" \
    "$work/out.json")"
  if grep -q '"FunctionError"' <<<"$meta" || ! jq -e '.ok == true' "$work/out.json" >/dev/null 2>&1; then
    echo "error: call $call: $(cat "$work/out.json")" >&2
    echo "stopped after removing $removed; re-run to continue" >&2
    exit 1
  fi
  read -r n remaining < <(jq -r '.data | "\(.removed) \(.remaining)"' "$work/out.json")
  removed=$((removed + n))
  echo "  removed $n, $remaining left"
  if [[ "$remaining" -eq 0 ]]; then
    echo "done: $removed charities of $import_source removed; snapshot rebuilt"
    exit 0
  fi
done
echo "error: still not done after $max_calls calls" >&2
exit 1
