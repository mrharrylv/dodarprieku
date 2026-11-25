#!/usr/bin/env bash
#
# Creates, updates or deletes one DNS record at Zone.ee (zone.eu) through its
# API v2, so Terraform can put a site's ACM validation and CloudFront records
# in place without anyone clicking through My Zone. Terraform runs it from
# infrastructure/terraform/zone_dns.tf; it is safe to run by hand too.
#
#   zone-dns.sh upsert   create the record, or point the existing one at VALUE
#   zone-dns.sh delete   remove every record of TYPE at NAME (none is fine)
#
# Inputs (environment):
#   ZONE_USERNAME   ZoneID username             (GitHub Actions secret)
#   ZONE_API_KEY    ZoneID API key              (GitHub Actions secret)
#   ZONE_DNS_ZONE   the zone, e.g. hagroup.lv
#   RECORD_TYPE     cname or txt
#   RECORD_NAME     full name, e.g. westamarine.hagroup.lv (trailing dot ok)
#   RECORD_VALUE    target, upsert only (trailing dot ok)
#   ZONE_API_URL    optional, default https://api.zone.eu/v2 (tests override it)
#
# The key never reaches the command line: curl reads it from stdin, so it is
# not in the process list or in a log.
#
# Tests: .github/tests/zone-dns.test.sh
set -euo pipefail

ACTION="${1:-}"
API="${ZONE_API_URL:-https://api.zone.eu/v2}"
PAGE_SIZE=100

die() { printf '::error title=Zone.ee DNS::%s\n' "$1" >&2; exit 1; }

case "$ACTION" in upsert|delete) ;; *) die "usage: zone-dns.sh upsert|delete" ;; esac

[ -n "${ZONE_USERNAME:-}" ] && [ -n "${ZONE_API_KEY:-}" ] ||
  die "ZONE_USERNAME and ZONE_API_KEY must be set. In GitHub: Settings, Secrets and variables, Actions, add both as repository secrets."
: "${ZONE_DNS_ZONE:?ZONE_DNS_ZONE is required}" "${RECORD_TYPE:?RECORD_TYPE is required}" "${RECORD_NAME:?RECORD_NAME is required}"

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }
ZONE="$(lower "${ZONE_DNS_ZONE%.}")"
TYPE="$(lower "$RECORD_TYPE")"
NAME="$(lower "${RECORD_NAME%.}")"
VALUE="${RECORD_VALUE:-}"
VALUE="${VALUE%.}"

case "$TYPE" in cname|txt) ;; *) die "record type '$RECORD_TYPE' is not handled: only cname and txt" ;; esac
case "$NAME" in
  "$ZONE") die "$NAME is the zone apex: Zone.ee cannot point it at CloudFront with a CNAME. Use a URL redirect to www (doc/dns.md)." ;;
  *."$ZONE") ;;
  *) die "$NAME is not inside the zone $ZONE" ;;
esac
[ "$ACTION" = delete ] || [ -n "$VALUE" ] || die "RECORD_VALUE is required for upsert"

# api METHOD PATH [BODY] [PAGE]: sets BODY_OUT and CODE. Retries a rate limit
# (60 requests a minute per IP) and a server error, five tries in all.
api() {
  local method="$1" path="$2" body="${3:-}" page="${4:-}" tries=0 out
  out="$(mktemp)"
  while :; do
    tries=$((tries + 1))
    CODE="$(
      {
        printf 'user = "%s:%s"\n' "$ZONE_USERNAME" "$ZONE_API_KEY"
        printf 'url = "%s/%s"\n' "$API" "$path"
      } | curl -sS --config - -X "$method" -o "$out" -w '%{http_code}' \
          -H 'Accept: application/json' -H 'Content-Type: application/json' \
          ${page:+-H "x-pager-page: $page" -H "x-pager-limit: $PAGE_SIZE"} \
          ${body:+--data "$body"} \
        || echo 000
    )"
    case "$CODE" in
      429|5??|000)
        if [ "$tries" -lt 5 ]; then sleep "${ZONE_RETRY_SECONDS:-$((tries * 5))}"; continue; fi ;;
    esac
    break
  done
  BODY_OUT="$(cat "$out")"
  rm -f "$out"
}

fail_api() {
  case "$CODE" in
    401|403) die "Zone.ee refused the credentials ($CODE) on $1. Check ZONE_USERNAME (the ZoneID login) and ZONE_API_KEY, and that the key has not expired." ;;
    404)     die "Zone.ee has no DNS zone $ZONE under this ZoneID ($1 answered 404)." ;;
    *)       die "Zone.ee answered $CODE on $1: $BODY_OUT" ;;
  esac
}

# Every record of TYPE in the zone, as one JSON array, page by page.
list_records() {
  local page=1 all='[]' batch
  while :; do
    api GET "dns/$ZONE/$TYPE" "" "$page"
    [ "$CODE" = 200 ] || fail_api "GET dns/$ZONE/$TYPE"
    batch="$(printf '%s' "$BODY_OUT" | jq -c 'if type == "array" then . else [] end')"
    all="$(jq -cn --argjson a "$all" --argjson b "$batch" '$a + $b')"
    [ "$(jq 'length' <<<"$batch")" -ge "$PAGE_SIZE" ] || break
    page=$((page + 1))
  done
  printf '%s' "$all"
}

RECORDS="$(list_records)"
# Matches compare lower-cased and without a trailing dot: the API is not
# documented to keep either the way they were sent.
MATCHES="$(jq -c --arg n "$NAME" '[.[] | select((.name // "" | ascii_downcase | rtrimstr(".")) == $n)]' <<<"$RECORDS")"
COUNT="$(jq 'length' <<<"$MATCHES")"
REC_JSON="$(jq -cn --arg n "$NAME" --arg d "$VALUE" '{name: $n, destination: $d}')"

if [ "$ACTION" = delete ]; then
  [ "$COUNT" -gt 0 ] || { echo "zone-dns: $TYPE $NAME is already gone"; exit 0; }
  for id in $(jq -r '.[].id' <<<"$MATCHES"); do
    api DELETE "dns/$ZONE/$TYPE/$id"
    case "$CODE" in 200|202|204|404) ;; *) fail_api "DELETE dns/$ZONE/$TYPE/$id" ;; esac
  done
  echo "zone-dns: deleted $TYPE $NAME"
  exit 0
fi

[ "$COUNT" -le 1 ] || die "$NAME has $COUNT $TYPE records at Zone.ee. Remove the extra ones in My Zone, then re-run."

if [ "$COUNT" -eq 0 ]; then
  api POST "dns/$ZONE/$TYPE" "$REC_JSON"
  case "$CODE" in 200|201|202) ;; *) fail_api "POST dns/$ZONE/$TYPE ($NAME)" ;; esac
  echo "zone-dns: created $TYPE $NAME -> $VALUE"
  exit 0
fi

CURRENT="$(jq -r '.[0].destination // "" | ascii_downcase | rtrimstr(".")' <<<"$MATCHES")"
if [ "$CURRENT" = "$(lower "$VALUE")" ]; then
  echo "zone-dns: $TYPE $NAME already points at $VALUE"
  exit 0
fi
ID="$(jq -r '.[0].id' <<<"$MATCHES")"
api PUT "dns/$ZONE/$TYPE/$ID" "$REC_JSON"
case "$CODE" in 200|201|202) ;; *) fail_api "PUT dns/$ZONE/$TYPE/$ID ($NAME)" ;; esac
echo "zone-dns: updated $TYPE $NAME -> $VALUE (was $CURRENT)"
