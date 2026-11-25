#!/usr/bin/env bash
# Tests for .github/scripts/zone-dns.sh, which creates the sites' DNS records at
# Zone.ee. A stub curl plays the Zone.ee API v2 from a JSON file, so nothing
# here reaches the network and no real key is needed.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/scripts/zone-dns.sh"
export ZONE_STATE="$SANDBOX/zone.json"
export CURL_LOG="$SANDBOX/curl.log"

# The stub keeps every record in $ZONE_STATE as [{id, type, name, destination}].
# STUB_STATUS forces an answer for every call (401, 429, ...).
stub curl <<'EOF_CURL'
#!/usr/bin/env bash
set -uo pipefail
method=GET out=/dev/null data="" page=1 limit=10
cfg="$(cat)"
url="$(sed -n 's/^url = "\(.*\)"$/\1/p' <<<"$cfg")"
user="$(sed -n 's/^user = "\(.*\)"$/\1/p' <<<"$cfg")"
while [ $# -gt 0 ]; do
  case "$1" in
    -X) method="$2"; shift 2 ;;
    -o) out="$2"; shift 2 ;;
    -w) shift 2 ;;
    --data) data="$2"; shift 2 ;;
    -H) case "$2" in
          "x-pager-page: "*) page="${2#x-pager-page: }" ;;
          "x-pager-limit: "*) limit="${2#x-pager-limit: }" ;;
        esac; shift 2 ;;
    --config) shift 2 ;;
    *) shift ;;
  esac
done
path="${url#https://zone.test/v2/}"
printf '%s %s %s\n' "$method" "$path" "$data" >> "$CURL_LOG"
if [ "$user" != "harry@example.com:test-key" ]; then echo '{"message":"Unauthorized"}' > "$out"; printf 401; exit 0; fi
if [ -n "${STUB_STATUS:-}" ]; then echo '{"message":"stub"}' > "$out"; printf '%s' "$STUB_STATUS"; exit 0; fi
IFS=/ read -r _dns zone type id <<<"$path"
[ "$zone" = "hagroup.lv" ] || { echo '{"message":"Not found"}' > "$out"; printf 404; exit 0; }
state="$(cat "$ZONE_STATE")"
case "$method" in
  GET)
    jq -c --arg t "$type" --argjson p "$page" --argjson l "$limit" \
      '[.[] | select(.type == $t)] | .[($p - 1) * $l : $p * $l]' <<<"$state" > "$out"; printf 200 ;;
  POST)
    new="$(jq -c --arg t "$type" --argjson d "$data" '{id: ((length + 1000) | tostring), type: $t} + $d' <<<"$state")"
    jq -c --argjson n "$new" '. + [$n]' <<<"$state" > "$ZONE_STATE"
    jq -c --argjson n "$new" -n '[$n]' > "$out"; printf 201 ;;
  PUT)
    jq -c --arg i "$id" --argjson d "$data" 'map(if .id == $i then . + $d else . end)' <<<"$state" > "$ZONE_STATE"
    echo '[]' > "$out"; printf 201 ;;
  DELETE)
    jq -c --arg i "$id" 'map(select(.id != $i))' <<<"$state" > "$ZONE_STATE"
    : > "$out"; printf 204 ;;
esac
EOF_CURL

# run ACTION NAME [VALUE] [TYPE]: sets OUT, ST, CALLS.
run() {
  : > "$CURL_LOG"
  OUT="$(ZONE_USERNAME="${USER_OVERRIDE-harry@example.com}" ZONE_API_KEY="${KEY_OVERRIDE-test-key}" \
    ZONE_API_URL=https://zone.test/v2 ZONE_RETRY_SECONDS=0 ZONE_DNS_ZONE="${ZONE_OVERRIDE:-hagroup.lv}" \
    RECORD_TYPE="${4:-CNAME}" RECORD_NAME="$2" RECORD_VALUE="${3:-}" bash "$SCRIPT" "$1" 2>&1)"
  ST=$?
  CALLS="$(cat "$CURL_LOG")"
}
seed() { printf '%s' "$1" > "$ZONE_STATE"; }
records() { jq -c --arg n "$1" '[.[] | select(.name == $n) | .destination]' "$ZONE_STATE"; }

echo "zone-dns.sh"

echo " upsert"
seed '[{"id":"1","type":"cname","name":"dev.hagroup.lv","destination":"d1.cloudfront.net"}]'
run upsert westamarine.hagroup.lv. d2abc.cloudfront.net.
assert_status "$ST" 0 "creates a missing record"
assert_says "$OUT" "created cname westamarine.hagroup.lv -> d2abc.cloudfront.net" "says what it created"
assert_eq "$(records westamarine.hagroup.lv)" '["d2abc.cloudfront.net"]' "without the trailing dots"
assert_eq "$(records dev.hagroup.lv)" '["d1.cloudfront.net"]' "and leaves the other records alone"

run upsert WestaMarine.hagroup.lv d2abc.cloudfront.net
assert_status "$ST" 0 "a second run succeeds"
assert_says "$OUT" "already points at" "and changes nothing"
assert_silent "$CALLS" "POST" "creates no duplicate"

run upsert westamarine.hagroup.lv d3new.cloudfront.net
assert_says "$OUT" "updated cname westamarine.hagroup.lv -> d3new.cloudfront.net (was d2abc.cloudfront.net)" "repoints a changed record"
assert_says "$CALLS" "PUT dns/hagroup.lv/cname/1001" "in place, by its id"
assert_eq "$(records westamarine.hagroup.lv)" '["d3new.cloudfront.net"]' "to the new value"

echo " pagination"
seed "$(jq -cn '[range(0; 150) | {id: (. | tostring), type: "cname", name: "h\(.).hagroup.lv", destination: "x.example"}]')"
run upsert h140.hagroup.lv x.example
assert_says "$OUT" "already points at" "finds a record on the second page"
assert_says "$CALLS" "GET dns/hagroup.lv/cname" "by listing"

echo " delete"
seed '[{"id":"1","type":"cname","name":"westamarine.hagroup.lv","destination":"d2.cloudfront.net"},{"id":"2","type":"cname","name":"dev.hagroup.lv","destination":"d1.cloudfront.net"}]'
run delete westamarine.hagroup.lv
assert_status "$ST" 0 "deletes"
assert_eq "$(records westamarine.hagroup.lv)" '[]' "the named record"
assert_eq "$(records dev.hagroup.lv)" '["d1.cloudfront.net"]' "and only that one"
run delete westamarine.hagroup.lv
assert_status "$ST" 0 "a missing record is fine"
assert_says "$OUT" "already gone" "and says so"

echo " refusals"
seed '[]'
USER_OVERRIDE="" run upsert a.hagroup.lv x.example
assert_status "$ST" 1 "no credentials fail"
assert_says "$OUT" "ZONE_USERNAME and ZONE_API_KEY must be set" "with the fix"
assert_eq "$CALLS" "" "before any request"

KEY_OVERRIDE="wrong" run upsert a.hagroup.lv x.example
assert_status "$ST" 1 "a rejected key fails"
assert_says "$OUT" "refused the credentials (401)" "with the cause"
assert_silent "$OUT" "wrong" "and never prints the key"

ZONE_OVERRIDE="other.lv" run upsert a.other.lv x.example
assert_says "$OUT" "has no DNS zone other.lv" "an unknown zone is named"

run upsert hagroup.lv x.example
assert_status "$ST" 1 "the apex is refused"
assert_says "$OUT" "zone apex" "with the reason"

run upsert westamarine.example.com x.example
assert_says "$OUT" "is not inside the zone hagroup.lv" "a name outside the zone is refused"

run upsert a.hagroup.lv x.example A
assert_says "$OUT" "only cname and txt" "other record types are refused"

run upsert a.hagroup.lv ""
assert_says "$OUT" "RECORD_VALUE is required" "upsert needs a value"

seed '[{"id":"1","type":"cname","name":"a.hagroup.lv","destination":"x"},{"id":"2","type":"cname","name":"a.hagroup.lv","destination":"y"}]'
run upsert a.hagroup.lv z
assert_status "$ST" 1 "duplicate records stop it"
assert_says "$OUT" "has 2 cname records" "and says how many"

seed '[]'
STUB_STATUS=429 run upsert a.hagroup.lv x.example
assert_status "$ST" 1 "a lasting rate limit fails"
assert_eq "$(grep -c GET "$CURL_LOG")" "5" "after five tries"

STUB_STATUS=500 run upsert a.hagroup.lv x.example
assert_says "$OUT" "answered 500" "a server error is reported"

echo " wiring"
TF="$REPO_ROOT/infrastructure/terraform/zone_dns.tf"
assert_says "$(cat "$TF")" ".github/scripts/zone-dns.sh" "Terraform runs this script"
INFRA="$(cat "$REPO_ROOT/.github/workflows/infra.yaml")"
assert_says "$INFRA" 'ZONE_API_KEY: ${{ secrets.ZONE_API_KEY }}' "the infra workflow passes the key"
assert_says "$(cat "$REPO_ROOT/.github/workflows/infra-destroy.yaml")" 'ZONE_API_KEY: ${{ secrets.ZONE_API_KEY }}' "and so does destroy"
DEV_TFVARS="$(tr -s ' ' < "$REPO_ROOT/infrastructure/terraform/environments/dev.tfvars")"
assert_says "$DEV_TFVARS" 'zone_dns_zone = "hagroup.lv"' "dev lives in the hagroup.lv zone"
assert_says "$DEV_TFVARS" 'domain_name = "' "dev has a hostname"
case "$(sed -n 's/^domain_name *= *"\(.*\)"/\1/p' "$REPO_ROOT/infrastructure/terraform/environments/dev.tfvars")" in
  ?*.hagroup.lv) ok "and it is <site>.hagroup.lv" ;;
  *) bad "and it is <site>.hagroup.lv" "dev domain_name is not under hagroup.lv" ;;
esac

finish
