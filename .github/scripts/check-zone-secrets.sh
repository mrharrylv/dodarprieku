#!/usr/bin/env bash
#
# Fails a job that is about to write DNS at Zone.ee when the ZoneID login or
# API key is empty, in seconds, before CloudFront or ACM has been touched.
# An empty secret otherwise surfaces mid-apply, or worse, as a green tick with
# nothing written (Unveil prod, 2026-11-22).
#
# Inputs (environment):
#   TFVARS          path to the environment's tfvars
#   ZONE_USERNAME   mapped from the GitHub ENVIRONMENT secret of the same name
#   ZONE_API_KEY    mapped from the GitHub ENVIRONMENT secret of the same name
#   ENV_NAME        the GitHub environment, for the message (optional)
#
# The values are never printed: only whether each is present.
#
# Tests: .github/tests/check-zone-secrets.test.sh
set -euo pipefail

: "${TFVARS:?TFVARS is required}"
[ -f "$TFVARS" ] || { printf '::error title=tfvars missing::%s does not exist\n' "$TFVARS"; exit 1; }

ZONE="$(sed -n 's/^[[:space:]]*zone_dns_zone[[:space:]]*=[[:space:]]*"\([^"]*\)".*/\1/p' "$TFVARS" | head -1)"
if [ -z "$ZONE" ]; then
  echo "zone_dns_zone is empty in $TFVARS: DNS records are added by hand."
  exit 0
fi

trimmed() { printf '%s' "$1" | tr -d '[:space:]'; }
missing=""
[ -n "$(trimmed "${ZONE_USERNAME:-}")" ] || missing="ZONE_USERNAME"
[ -n "$(trimmed "${ZONE_API_KEY:-}")" ] || missing="${missing:+$missing and }ZONE_API_KEY"

if [ -n "$missing" ]; then
  env_name="${ENV_NAME:-<env>}"
  printf '::error title=Zone.ee secrets missing::%s sets zone_dns_zone = "%s", so this job writes DNS at Zone.ee, but %s is empty. Set both on the GitHub environment "%s" from the Mac Keychain: ~/Dev/Unveil/scripts/zone-secrets.sh %s %s, then re-run.\n' \
    "$TFVARS" "$ZONE" "$missing" "$env_name" "$env_name" "${GITHUB_REPOSITORY:-<owner>/<repo>}"
  exit 1
fi

echo "ZONE_USERNAME and ZONE_API_KEY are set: Terraform will write the records in $ZONE at Zone.ee."
