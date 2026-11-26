#!/usr/bin/env bash
# Made-up needs for a demonstration of the map, never on production: invokes
# the API Lambda's demo-needs or clear-demo-needs task once. Both rebuild the
# public snapshot. The API refuses them when its ENVIRONMENT is prod; this
# script refuses a prod-* function before it calls anything.
#
#   scripts/demo-needs.sh <function-name> apply <source> [fraction] [seed]
#   scripts/demo-needs.sh <function-name> clear
#
# Needs jq and the AWS CLI.
set -euo pipefail

usage() {
  echo "usage: $0 <function-name> apply <source> [fraction] [seed]" >&2
  echo "       $0 <function-name> clear" >&2
  exit 2
}

[[ $# -ge 2 ]] || usage
function_name="$1"
mode="$2"

[[ "$function_name" =~ ^[A-Za-z0-9_-]+$ ]] || { echo "error: '$function_name' is not a function name" >&2; exit 2; }
[[ "$function_name" != prod-* ]] || { echo "error: demo needs are never written to production" >&2; exit 2; }
command -v jq >/dev/null || { echo "error: jq is required" >&2; exit 2; }

case "$mode" in
  apply)
    [[ $# -ge 3 && $# -le 5 ]] || usage
    import_source="$3"
    fraction="${4:-0.25}"
    seed="${5:-1}"
    # Each goes into a JSON payload: only the shapes the API accepts.
    [[ "$import_source" =~ ^import:[a-z0-9-]+$ ]] || { echo "error: source must look like import:<dataset>" >&2; exit 2; }
    [[ "$fraction" =~ ^(0?\.[0-9]+|1(\.0+)?)$ ]] || { echo "error: fraction must be a share like 0.25" >&2; exit 2; }
    [[ "$seed" =~ ^[0-9]{1,9}$ ]] || { echo "error: seed must be a whole number" >&2; exit 2; }
    payload="$(jq -nc --arg s "$import_source" --argjson f "$fraction" --argjson n "$seed" '{task: "demo-needs", source: $s, fraction: $f, seed: $n}')"
    ;;
  clear)
    [[ $# -eq 2 ]] || usage
    payload='{"task":"clear-demo-needs"}'
    ;;
  *) usage ;;
esac

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
printf '%s\n' "$payload" > "$work/payload.json"

meta="$(aws lambda invoke \
  --function-name "$function_name" \
  --cli-binary-format raw-in-base64-out \
  --payload "fileb://$work/payload.json" \
  "$work/out.json")"
if grep -q '"FunctionError"' <<<"$meta" || ! jq -e '.ok == true' "$work/out.json" >/dev/null 2>&1; then
  echo "error: $(cat "$work/out.json")" >&2
  exit 1
fi
if [[ "$mode" == apply ]]; then
  echo "done: $(jq -r '.data | "\(.picked) charities have demo needs (\(.cleared) from an earlier run cleared)"' "$work/out.json"); snapshot rebuilt"
else
  echo "done: $(jq -r '.data.cleared' "$work/out.json") charities back to no needs; snapshot rebuilt"
fi
