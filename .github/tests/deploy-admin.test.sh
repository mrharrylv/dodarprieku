#!/usr/bin/env bash
# Tests for .github/scripts/deploy-admin.sh, which puts the admin portal under
# admin/ in the website bucket. A stub aws records every call.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/scripts/deploy-admin.sh"

stub aws <<'EOF_AWS'
#!/usr/bin/env bash
printf 'aws %s\n' "$*" >> "$AWS_LOG"
[ "$1 $2" = "s3api list-objects-v2" ] && echo "admin/index.html	admin/assets/old.js"
exit 0
EOF_AWS
require_stubbed_aws

DIST="$SANDBOX/admin-dist"
MANIFEST="$SANDBOX/admin-manifest.txt"
build() { # build INDEX_HTML
  rm -rf "$DIST"; mkdir -p "$DIST/assets"
  printf '%s' "$1" > "$DIST/index.html"
  echo x > "$DIST/assets/index-abc.js"
  echo x > "$DIST/favicon.svg"
  (cd "$DIST" && find . -type f | sort) > "$MANIFEST"
}
run() {
  : > "$AWS_LOG"
  OUT="$(BUCKET=web DIST="$DIST" MANIFEST="$MANIFEST" bash "$SCRIPT" "$@" 2>&1)"
  ST=$?
  CALLS="$(cat "$AWS_LOG")"
}

echo "deploy-admin.sh"

echo " a build with base /admin/"
build '<script type="module" src="/admin/assets/index-abc.js"></script>'
run upload
assert_status "$ST" 0 "uploads"
assert_says "$CALLS" "s3://web/admin/assets --exclude * --include *.js" "assets go under admin/assets"
assert_says "$CALLS" "immutable" "hashed assets are immutable"
assert_says "$(grep 'admin/index.html' <<<"$CALLS")" "--cache-control no-cache" "index.html is no-cache"
assert_eq "$(tail -1 <<<"$CALLS" | grep -c 'admin/index.html')" "1" "index.html goes last"
assert_silent "$CALLS" "s3://web/assets" "never writes the website's assets/"
assert_silent "$CALLS" "--delete" "never syncs with --delete"

echo " a build without base /admin/"
build '<script type="module" src="/assets/index-abc.js"></script>'
run upload
assert_status "$ST" 1 "is refused"
assert_says "$OUT" "base: '/admin/'" "with the fix"
assert_eq "$CALLS" "" "before anything is uploaded"

echo " no build"
rm -rf "$DIST"; mkdir -p "$DIST"
run upload
assert_status "$ST" 1 "is refused"

echo " cleanup"
build '<script src="/admin/assets/index-abc.js"></script>'
run cleanup
assert_status "$ST" 0 "succeeds"
assert_says "$CALLS" "--prefix admin/" "looks only under admin/"
assert_says "$CALLS" "delete-object --bucket web --key admin/assets/old.js" "deletes the stale admin asset"
assert_silent "$CALLS" "--key admin/index.html" "keeps the live page"

echo " usage"
run bogus
assert_status "$ST" 1 "an unknown action fails"

finish
