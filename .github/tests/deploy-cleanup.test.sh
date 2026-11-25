#!/usr/bin/env bash
# Tests for .github/actions/deploy-site/cleanup.sh, Phase 4 of the deploy:
# it deletes what the build no longer has, and must leave alone what another
# build owns (the admin portal under admin/).
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/actions/deploy-site/cleanup.sh"
ACTION="$REPO_ROOT/.github/actions/deploy-site/action.yml"
DEPLOY="$REPO_ROOT/.github/workflows/deploy.yaml"
export S3_KEYS_FILE="$SANDBOX/keys.txt"

# list-objects-v2 answers from $S3_KEYS_FILE (one key a line), honouring
# --prefix, tab-separated as --output text prints it.
stub aws <<'EOF_AWS'
#!/usr/bin/env bash
printf 'aws %s\n' "$*" >> "$AWS_LOG"
if [ "$1 $2" = "s3api list-objects-v2" ]; then
  prefix=""
  while [ $# -gt 0 ]; do [ "$1" = --prefix ] && prefix="$2"; shift; done
  keys="$(grep "^$prefix" "$S3_KEYS_FILE" | paste -sd '\t' -)"
  [ -n "$keys" ] && printf '%s\n' "$keys" || echo None
fi
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

printf '%s\n' index.html assets/new.js assets/old.js admin/index.html admin/assets/a.js old.html > "$S3_KEYS_FILE"
printf '%s\n' ./index.html ./assets/new.js > "$MANIFEST"

echo " the website build"
run env KEEP_PREFIXES="admin/"
assert_status "$ST" 0 "succeeds"
assert_eq "$DELETED" "assets/old.js old.html" "deletes only its own orphans"
assert_silent "$DELETED" "admin/" "never the admin portal"
assert_says "$OUT" "Kept 2 object(s)" "and says what it kept"

echo " without keep-prefixes"
run env KEEP_PREFIXES=""
assert_says "$DELETED" "admin/index.html" "the admin portal would go: which is why deploy.yaml passes admin/"

echo " the admin build (PREFIX=admin/)"
printf '%s\n' ./index.html > "$MANIFEST"
run env PREFIX="admin/"
assert_eq "$DELETED" "admin/assets/a.js" "deletes only admin/ orphans"
assert_says "$(cat "$AWS_LOG")" "--prefix admin/" "and lists only admin/"

echo " nothing to delete"
printf '%s\n' index.html > "$S3_KEYS_FILE"
printf '%s\n' ./index.html > "$MANIFEST"
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
