#!/usr/bin/env bash
# Tests for .github/actions/deploy-site/cleanup.sh, Phase 4 of the deploy:
# it deletes what the build no longer has, and must leave alone what another
# build owns (the admin portal under admin/) and the previous build's assets/
# (a visitor with the old page open still loads its lazy chunks).
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/actions/deploy-site/cleanup.sh"
ACTION="$REPO_ROOT/.github/actions/deploy-site/action.yml"
DEPLOY="$REPO_ROOT/.github/workflows/deploy.yaml"
export S3_KEYS_FILE="$SANDBOX/keys.txt"
export S3_OBJECTS="$SANDBOX/objects"
mkdir -p "$S3_OBJECTS"

# list-objects-v2 answers from $S3_KEYS_FILE (one key a line), honouring
# --prefix, tab-separated as --output text prints it. get-object and
# put-object keep object bodies under $S3_OBJECTS; a missing one is NoSuchKey.
# delete-object takes the key out of the listing.
stub aws <<'EOF_AWS'
#!/usr/bin/env bash
printf 'aws %s\n' "$*" >> "$AWS_LOG"
arg() { local want="$1"; shift; while [ $# -gt 0 ]; do [ "$1" = "$want" ] && { printf '%s' "$2"; return; }; shift; done; }
case "$1 $2" in
  "s3api list-objects-v2")
    prefix="$(arg --prefix "$@")"
    keys="$(grep "^$prefix" "$S3_KEYS_FILE" | paste -sd '\t' -)"
    [ -n "$keys" ] && printf '%s\n' "$keys" || echo None ;;
  "s3api get-object")
    key="$(arg --key "$@")"; out="${!#}"
    [ -f "$S3_OBJECTS/$key" ] || { echo "An error occurred (NoSuchKey)" >&2; exit 254; }
    cp "$S3_OBJECTS/$key" "$out" ;;
  "s3api put-object")
    key="$(arg --key "$@")"; mkdir -p "$(dirname "$S3_OBJECTS/$key")"
    cp "$(arg --body "$@")" "$S3_OBJECTS/$key"
    grep -qxF "$key" "$S3_KEYS_FILE" || printf '%s\n' "$key" >> "$S3_KEYS_FILE" ;;
  "s3api delete-object")
    key="$(arg --key "$@")"
    grep -vxF "$key" "$S3_KEYS_FILE" > "$S3_KEYS_FILE.tmp"; mv "$S3_KEYS_FILE.tmp" "$S3_KEYS_FILE" ;;
esac
exit 0
EOF_AWS
require_stubbed_aws

MANIFEST="$SANDBOX/manifest.txt"
run() {
  : > "$AWS_LOG"
  OUT="$(BUCKET=b MANIFEST="$MANIFEST" "$@" bash "$SCRIPT" 2>&1)"
  ST=$?
  DELETED="$(sed -n 's/.*delete-object --bucket b --key //p' "$AWS_LOG" | sort | paste -sd ' ' -)"
}

echo "cleanup.sh"

STATE=".deploy/previous-manifest.txt"
# seed_previous KEY...: the manifest the last deploy left in the bucket.
seed_previous() {
  mkdir -p "$S3_OBJECTS/$(dirname "$STATE")"
  printf '%s\n' "$@" > "$S3_OBJECTS/$STATE"
  printf '%s\n' "$STATE" >> "$S3_KEYS_FILE"
}

printf '%s\n' index.html assets/new.js assets/prev.js assets/old.js admin/index.html admin/assets/a.js old.html > "$S3_KEYS_FILE"
printf '%s\n' ./index.html ./assets/new.js > "$MANIFEST"
seed_previous index.html assets/prev.js old.html

echo " the website build"
run env KEEP_PREFIXES="admin/"
assert_status "$ST" 0 "succeeds"
assert_eq "$DELETED" "assets/old.js old.html" "deletes only its own orphans"
assert_silent "$DELETED" "admin/" "never the admin portal"
assert_silent "$DELETED" "assets/prev.js" "nor a chunk of the build it replaces, which an open page may still load"
assert_silent "$DELETED" "$STATE" "nor its own record of the build"
assert_says "$OUT" "Kept 2 object(s)" "and says what it kept"
assert_says "$OUT" "Kept 1 asset(s) of the previous build" "and the previous build's assets"
assert_eq "$(cat "$S3_OBJECTS/$STATE")" "$(printf '%s\n' assets/new.js index.html)" "records this build for the next deploy"

echo " the next deploy"
printf '%s\n' ./index.html ./assets/newer.js > "$MANIFEST"
printf '%s\n' assets/newer.js >> "$S3_KEYS_FILE"
run env KEEP_PREFIXES="admin/"
assert_eq "$DELETED" "assets/prev.js" "deletes the chunk two builds old, keeps the one just replaced"

echo " the first deploy with no record of the previous build"
rm -f "$S3_OBJECTS/$STATE"
printf '%s\n' index.html assets/new.js assets/old.js old.html > "$S3_KEYS_FILE"
printf '%s\n' ./index.html ./assets/new.js > "$MANIFEST"
run env
assert_status "$ST" 0 "succeeds"
assert_eq "$DELETED" "old.html" "keeps every asset, since any of them may be the live page's"
assert_says "$OUT" "No record of the previous build" "and says why"
assert_says "$(cat "$S3_OBJECTS/$STATE")" "assets/new.js" "then records this build"
printf '%s\n' index.html assets/new.js assets/old.js admin/index.html admin/assets/a.js old.html > "$S3_KEYS_FILE"
printf '%s\n' ./index.html ./assets/new.js > "$MANIFEST"
seed_previous index.html

echo " without keep-prefixes"
run env KEEP_PREFIXES=""
assert_says "$DELETED" "admin/index.html" "the admin portal would go: which is why deploy.yaml passes admin/"

echo " the admin build (PREFIX=admin/)"
printf '%s\n' index.html admin/index.html admin/assets/a.js > "$S3_KEYS_FILE"
printf '%s\n' ./index.html > "$MANIFEST"
mkdir -p "$S3_OBJECTS/admin/.deploy" && printf '%s\n' admin/index.html > "$S3_OBJECTS/admin/$STATE"
run env PREFIX="admin/"
assert_eq "$DELETED" "admin/assets/a.js" "deletes only admin/ orphans"
assert_says "$(cat "$AWS_LOG")" "--prefix admin/" "and lists only admin/"
assert_says "$(cat "$AWS_LOG")" "--key admin/$STATE" "and keeps its own record under admin/"

echo " nothing to delete"
printf '%s\n' index.html > "$S3_KEYS_FILE"
printf '%s\n' ./index.html > "$MANIFEST"
seed_previous index.html
run env
assert_eq "$DELETED" "" "deletes nothing"
assert_says "$OUT" "No orphaned files" "and says so"

echo " an empty bucket"
: > "$S3_KEYS_FILE"
run env
assert_status "$ST" 0 "is fine"

echo " the wiring"
assert_says "$(cat "$ACTION")" 'run: bash "$GITHUB_ACTION_PATH/cleanup.sh"' "Phase 4 runs this script"
assert_says "$(cat "$ACTION")" 'KEEP_PREFIXES: ${{ inputs.keep-prefixes }}' "with the action's keep-prefixes"
assert_says "$(cat "$DEPLOY")" 'keep-prefixes: admin/' "deploy.yaml keeps admin/"

finish
