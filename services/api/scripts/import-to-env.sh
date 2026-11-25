#!/usr/bin/env bash
# Loads an import file (data/imported-charities.json) into an environment by
# invoking the API Lambda directly, in order, a batch at a time, then rebuilds
# the public snapshot once. Idempotent: the same ids overwrite themselves.
# Nothing is mailed and no account is created.
#
#   scripts/import-to-env.sh <function-name> [file] [batch-size]
#
# Stops at the first failed batch; the batches before it stay imported, and a
# re-run picks the whole file up again. Needs jq and the AWS CLI.
set -euo pipefail

if [[ $# -lt 1 || $# -gt 3 ]]; then
  echo "usage: $0 <function-name> [file] [batch-size]" >&2
  exit 2
fi

function_name="$1"
file="${2:-$(dirname "$0")/../data/imported-charities.json}"
batch="${3:-100}"
# Lambda's synchronous payload limit is 6 MB; stay well under it.
max_payload=$((5 * 1024 * 1024))

[[ "$function_name" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "error: '$function_name' is not a function name" >&2; exit 2; }
[[ "$batch" =~ ^[0-9]+$ && "$batch" -ge 1 && "$batch" -le 200 ]] || { echo "error: batch size must be 1-200" >&2; exit 2; }
[[ -f "$file" ]] || { echo "error: $file does not exist" >&2; exit 2; }
command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 2; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

total="$(jq 'length' "$file")"
echo "importing $total charities from $file into $function_name, $batch per call"

# invoke <payload-file> <label>: the response lands in $work/out.json; fails on any error.
invoke() {
  local meta
  meta="$(aws lambda invoke \
    --function-name "$function_name" \
    --cli-binary-format raw-in-base64-out \
    --payload "fileb://$1" \
    "$work/out.json")"
  if grep -q '"FunctionError"' <<<"$meta"; then
    echo "error: $2: the function failed: $(cat "$work/out.json")" >&2
    return 1
  fi
  if ! jq -e '.ok == true' "$work/out.json" >/dev/null 2>&1; then
    echo "error: $2: $(cat "$work/out.json")" >&2
    return 1
  fi
}

imported=0 created=0 updated=0 refused=0
for ((from = 0; from < total; from += batch)); do
  label="items $from-$((from + batch - 1 < total - 1 ? from + batch - 1 : total - 1))"
  jq -c --argjson from "$from" --argjson n "$batch" '{task: "import-charities", items: .[$from:($from + $n)]}' "$file" > "$work/payload.json"
  size="$(wc -c < "$work/payload.json" | tr -d ' ')"
  if [[ "$size" -gt "$max_payload" ]]; then
    echo "error: $label: payload is $size bytes; use a smaller batch size" >&2
    exit 1
  fi
  invoke "$work/payload.json" "$label" || { echo "stopped after $imported imported; re-run to continue" >&2; exit 1; }
  read -r i c u r < <(jq -r '.data | "\(.imported) \(.created) \(.updated) \(.refused | length)"' "$work/out.json")
  imported=$((imported + i)) created=$((created + c)) updated=$((updated + u)) refused=$((refused + r))
  echo "  $label: imported $i (new $c, updated $u, refused $r)"
done

echo '{"task":"rebuild-snapshot"}' > "$work/payload.json"
invoke "$work/payload.json" "rebuild-snapshot" || { echo "the charities are imported but the snapshot was not rebuilt; run again" >&2; exit 1; }

echo "done: $imported of $total imported (new $created, updated $updated, refused $refused); snapshot rebuilt"
if [[ "$refused" -gt 0 ]]; then
  echo "warning: $refused ids belong to charities that were not imported and were left alone" >&2
fi
