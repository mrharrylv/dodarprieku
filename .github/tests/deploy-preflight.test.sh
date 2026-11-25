#!/usr/bin/env bash
# Tests for .github/actions/deploy-site/preflight.sh, which runs before the
# deploy action uploads anything. Phase 4 deletes every object the build's
# manifest does not name, so a build made without a canonical origin (no
# sitemap.xml, no llms.txt, the committed robots.txt) would take the live
# crawler files down with it. The preflight refuses that build instead.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/actions/deploy-site/preflight.sh"
ACTION="$REPO_ROOT/.github/actions/deploy-site/action.yml"

stub aws <<'EOF'
#!/usr/bin/env bash
printf 'aws %s\n' "$*" >> "$AWS_LOG"
exit 99
EOF
require_stubbed_aws

ROBOTS_WITH_SITEMAP='User-agent: *
Allow: /

Sitemap: https://www.example.lv/sitemap.xml'
ROBOTS_COMMITTED='User-agent: *
Allow: /

# No Sitemap line: none is configured.'

# build FILE...: a fresh dist/ holding FILE..., and its manifest, written the
# way deploy.yaml writes it (find . -type f | sort).
build() {
  DIST="$SANDBOX/dist"
  MANIFEST="$SANDBOX/manifest.txt"
  rm -rf "$DIST"
  mkdir -p "$DIST/assets"
  for f in "$@"; do
    mkdir -p "$DIST/$(dirname "$f")"
    echo "x" > "$DIST/$f"
  done
  (cd "$DIST" && find . -type f | sort) > "$MANIFEST"
}

run() {
  : > "$AWS_LOG"
  OUT="$(DIST="$DIST" MANIFEST="$MANIFEST" bash "$SCRIPT" 2>&1)"
  ST=$?
  CALLS="$(cat "$AWS_LOG")"
}

COMPLETE="index.html 404.html en/about/index.html assets/index-abc123.js robots.txt sitemap.xml llms.txt"

echo "preflight.sh"

echo " a build with its canonical origin"
# shellcheck disable=SC2086
build $COMPLETE
printf '%s\n' "$ROBOTS_WITH_SITEMAP" > "$DIST/robots.txt"
run
assert_status "$ST" 0 "is deployed"
assert_eq "$CALLS" "" "without touching AWS"

# A pipe into `grep -q` under pipefail reads a long manifest as a failure
# (the writer dies of SIGPIPE once grep has its match), refusing a good build.
{ printf './llms.txt\n./robots.txt\n./sitemap.xml\n'; seq -f './assets/chunk-%g.js' 1 100000; } > "$MANIFEST"
run
assert_status "$ST" 0 "however long its manifest"

echo " a build without one"
build index.html 404.html en/about/index.html assets/index-abc123.js robots.txt
printf '%s\n' "$ROBOTS_COMMITTED" > "$DIST/robots.txt"
run
assert_status "$ST" 1 "is refused"
assert_says "$OUT" "::error" "with an error annotation"
assert_says "$OUT" "sitemap.xml" "naming the missing sitemap.xml"
assert_says "$OUT" "llms.txt" "naming the missing llms.txt"
assert_says "$OUT" "VITE_SITE_URL" "naming the variable behind it"
assert_eq "$CALLS" "" "before anything reaches the bucket"

echo " a build missing one crawler file"
for missing in robots.txt sitemap.xml llms.txt; do
  # shellcheck disable=SC2086
  build $(printf '%s\n' $COMPLETE | grep -v -x -F "$missing")
  [ -f "$DIST/robots.txt" ] && printf '%s\n' "$ROBOTS_WITH_SITEMAP" > "$DIST/robots.txt"
  run
  assert_status "$ST" 1 "without $missing is refused"
  assert_says "$OUT" "$missing" "without $missing says so"
done

echo " a robots.txt that names no absolute sitemap"
# shellcheck disable=SC2086
build $COMPLETE
printf '%s\n' "$ROBOTS_COMMITTED" > "$DIST/robots.txt"
run
assert_status "$ST" 1 "the committed fallback is refused"
assert_says "$OUT" "Sitemap" "says robots.txt has no Sitemap line"

printf 'User-agent: *\nAllow: /\nSitemap: /sitemap.xml\n' > "$DIST/robots.txt"
run
assert_status "$ST" 1 "a relative Sitemap line is refused"

echo " a missing or empty manifest"
# shellcheck disable=SC2086
build $COMPLETE
printf '%s\n' "$ROBOTS_WITH_SITEMAP" > "$DIST/robots.txt"
rm -f "$MANIFEST"
run
assert_status "$ST" 1 "no manifest is refused"
: > "$MANIFEST"
run
assert_status "$ST" 1 "an empty manifest is refused"

echo " the deploy action"
line_of() { grep -n -F -- "$1" "$ACTION" | head -1 | cut -d: -f1; }
preflight_line="$(line_of 'run: bash "$GITHUB_ACTION_PATH/preflight.sh"')"
phase1_line="$(line_of 'name: "Phase 1')"
if [ -n "$preflight_line" ] && [ -n "$phase1_line" ] && [ "$preflight_line" -lt "$phase1_line" ]; then
  ok "runs it before Phase 1 uploads anything"
else
  bad "runs it before Phase 1 uploads anything" "preflight at line ${preflight_line:-none}, Phase 1 at ${phase1_line:-none}"
fi

finish
