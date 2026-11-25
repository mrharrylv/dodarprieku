#!/usr/bin/env bash
# Tests for .github/scripts/check-zone-secrets.sh, the guard every job that
# writes DNS at Zone.ee runs first, and for the workflows that must call it.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/scripts/check-zone-secrets.sh"
TFV="$SANDBOX/env.tfvars"

run() {
  OUT="$(TFVARS="$TFV" ENV_NAME=dev GITHUB_REPOSITORY=owner/repo bash "$SCRIPT" 2>&1)"
  ST=$?
}

echo "check-zone-secrets.sh"

echo " a zone with both secrets"
printf 'domain_name = "a.hagroup.lv"\nzone_dns_zone  = "hagroup.lv"\n' > "$TFV"
ZONE_USERNAME=user ZONE_API_KEY=secret-value run
assert_status "$ST" 0 "passes"
assert_silent "$OUT" "secret-value" "never prints the key"
assert_silent "$OUT" "user " "never prints the username"

echo " a zone with an empty username"
ZONE_USERNAME="" ZONE_API_KEY=secret-value run
assert_status "$ST" 1 "fails"
assert_says "$OUT" "::error" "with a workflow error"
assert_says "$OUT" "ZONE_USERNAME is empty" "naming the empty secret"
assert_says "$OUT" "zone-secrets.sh dev owner/repo" "with the one way to set it"
assert_silent "$OUT" "secret-value" "without the key"

echo " a zone with a whitespace-only key"
ZONE_USERNAME=user ZONE_API_KEY="  " run
assert_status "$ST" 1 "fails"
assert_says "$OUT" "ZONE_API_KEY is empty" "naming the key"

echo " a zone with neither"
(unset ZONE_USERNAME ZONE_API_KEY; run; printf '%s\n%s' "$ST" "$OUT") > "$SANDBOX/neither"
assert_eq "$(head -1 "$SANDBOX/neither")" "1" "fails"
assert_says "$(cat "$SANDBOX/neither")" "ZONE_USERNAME and ZONE_API_KEY is empty" "naming both"

echo " no zone"
printf 'zone_dns_zone = ""\n' > "$TFV"
ZONE_USERNAME="" ZONE_API_KEY="" run
assert_status "$ST" 0 "passes: records are added by hand"

echo " a missing tfvars"
OUT="$(TFVARS="$SANDBOX/none.tfvars" bash "$SCRIPT" 2>&1)"; ST=$?
assert_status "$ST" 1 "fails"

echo " the workflows that write DNS"
# They must also call the guard above; that edit waits on infra*.yaml being
# writable (they are locked read-only in this checkout).
for wf in infra.yaml infra-cloudfront-toggle.yaml; do
  W="$(cat "$REPO_ROOT/.github/workflows/$wf")"
  assert_says "$W" 'environment: ${{ github.event.inputs.environment }}' "$wf runs in the GitHub environment"
  assert_says "$W" 'ZONE_USERNAME: ${{ secrets.ZONE_USERNAME }}' "$wf maps ZONE_USERNAME"
  assert_says "$W" 'ZONE_API_KEY: ${{ secrets.ZONE_API_KEY }}' "$wf maps ZONE_API_KEY"
done
assert_silent "$(cat "$REPO_ROOT/infrastructure/bootstrap.sh")" "gh secret set ZONE" "bootstrap never sets the Zone secrets by hand"
assert_says "$(cat "$REPO_ROOT/infrastructure/bootstrap.sh")" "zone-secrets.sh" "bootstrap uses zone-secrets.sh"

finish
