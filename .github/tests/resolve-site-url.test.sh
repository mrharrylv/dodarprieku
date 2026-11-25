#!/usr/bin/env bash
# Tests for .github/scripts/resolve-site-url.sh, the deploy build's canonical
# origin. A build without one ships relative canonical, hreflang and og URLs
# and no sitemap.xml or llms.txt, so every way of arriving at no origin, or at
# one the build would reject, has to fail the job instead.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/scripts/resolve-site-url.sh"
WORKFLOW="$REPO_ROOT/.github/workflows/deploy.yaml"

stub aws <<'EOF'
#!/usr/bin/env bash
printf 'aws %s\n' "$*" >> "$AWS_LOG"
case "$1 $2" in
  "cloudfront list-distributions")
    case "${STUB_LOOKUP:-found}" in
      found) echo "d111111abcdef8.cloudfront.net" ;;
      none)  echo "None" ;;
      empty) ;;
      error)
        echo "An error occurred (Throttling) when calling the ListDistributions operation (reached max retries: 2): Rate exceeded" >&2
        exit 254 ;;
    esac ;;
  *) echo "unexpected aws call: $*" >&2; exit 99 ;;
esac
EOF
require_stubbed_aws

# run CONFIGURED [LOOKUP]: sets OUT (stdout+stderr), ST (exit), URL_OUT
# (everything the step wrote to $GITHUB_OUTPUT) and CALLS (the aws calls).
run() {
  local github_output="$SANDBOX/github_output"
  : > "$github_output"
  : > "$AWS_LOG"
  OUT="$(CONFIGURED="$1" ENV=prod PROJECT=dodarprieku GITHUB_OUTPUT="$github_output" \
    STUB_LOOKUP="${2:-found}" bash "$SCRIPT" 2>&1)"
  ST=$?
  URL_OUT="$(cat "$github_output")"
  CALLS="$(cat "$AWS_LOG")"
}

echo "resolve-site-url.sh"

echo " a configured origin"
run "https://www.example.lv"
assert_status "$ST" 0 "is accepted"
assert_eq "$URL_OUT" "url=https://www.example.lv" "is the build's origin"
assert_eq "$CALLS" "" "needs no AWS lookup"

run "https://www.example.lv/"
assert_eq "$URL_OUT" "url=https://www.example.lv" "loses a trailing slash"

run "HTTPS://WWW.Example.LV"
assert_eq "$URL_OUT" "url=https://www.example.lv" "is lower-cased"

run "  https://www.example.lv
"
assert_eq "$URL_OUT" "url=https://www.example.lv" "loses surrounding whitespace"

run "https://xn--kafejnca-fjb.lv"
assert_eq "$URL_OUT" "url=https://xn--kafejnca-fjb.lv" "may be an IDN in its punycode form"

# The build's new URL(raw).origin takes a Unicode host and punycodes it, so
# this deployed before the step checked the value. It still has to.
run "https://kafejnīca.lv"
assert_status "$ST" 0 "may be an IDN as it is written"
assert_eq "$URL_OUT" "url=https://xn--kafejnca-fjb.lv" "is then the punycode form the build would use"

run "https://Kafejnīca.LV/"
assert_eq "$URL_OUT" "url=https://xn--kafejnca-fjb.lv" "an IDN is lower-cased and loses a trailing slash too"

run "https://www.rīga.lv:443"
assert_eq "$URL_OUT" "url=https://www.xn--rga-uta.lv" "the default https port is no port at all"

echo " a configured value that is not an https origin"
# xn--ka-hla is not valid punycode: Node's URL parser refuses it, so the build
# would have ignored it and shipped no origin.
for bad_value in \
  "www.example.lv" \
  "example.lv" \
  "http://www.example.lv" \
  "https://www.example.lv/about" \
  "https://www.example.lv?x=1" \
  "https://www.example.lv:8443" \
  "https://user@www.example.lv" \
  "https://localhost" \
  "https://" \
  "https://exa mple.lv" \
  "https://exa	mple.lv" \
  "https://www.example.lv
.lv" \
  "https://-example.lv" \
  "https://xn--ka-hla.lv" \
  "https://kafejnīca.lv/about" \
  "kafejnīca.lv" \
  "https://www.example.lv//" \
  "https://www.example.lv#top" \
  "   "; do
  run "$bad_value"
  assert_status "$ST" 1 "'$bad_value' fails the step"
  assert_eq "$URL_OUT" "" "'$bad_value' writes no url"
done
run "www.example.lv"
assert_says "$OUT" "::error" "raises an error annotation"
assert_says "$OUT" "www.example.lv" "names the rejected value"
assert_says "$OUT" "https://" "says what the value should look like"
assert_says "$OUT" "punycode" "says an internationalised domain is fine, as written or in punycode"
assert_eq "$CALLS" "" "does not fall back to the CloudFront domain"

echo " a value node could read as one of its own options"
printf 'require("fs").writeFileSync(process.env.MARKER, "ran")\n' > "$SANDBOX/marker.js"
export MARKER="$SANDBOX/marker.ran"
run "--require=$SANDBOX/marker.js"
assert_status "$ST" 1 "fails the step"
if [ -e "$MARKER" ]; then bad "runs nothing it names" "node loaded $SANDBOX/marker.js"; else ok "runs nothing it names"; fi
unset MARKER

echo " without node"
# The step runs after Setup Node.js; without it, say so rather than reject
# a value that is fine.
NODELESS="$SANDBOX/nodeless"
mkdir -p "$NODELESS"
for tool in bash cat tr printf; do
  path="$(command -v "$tool")" && [ "$path" != "$tool" ] && ln -sf "$path" "$NODELESS/$tool"
done
: > "$SANDBOX/github_output"
OUT="$(PATH="$STUBS:$NODELESS" CONFIGURED="https://www.example.lv" ENV=prod PROJECT=dodarprieku \
  GITHUB_OUTPUT="$SANDBOX/github_output" "$NODELESS/bash" "$SCRIPT" 2>&1)"
ST=$?
assert_status "$ST" 1 "fails the step"
assert_says "$OUT" "Setup Node.js" "says the step needs Node.js first"
assert_eq "$(cat "$SANDBOX/github_output")" "" "writes no url"

echo " no configured origin"
run "" found
assert_status "$ST" 0 "uses the distribution's domain"
assert_eq "$URL_OUT" "url=https://d111111abcdef8.cloudfront.net" "as an https origin"
assert_says "$CALLS" "Comment=='prod - dodarprieku website'" "found by the distribution's Comment"

run "" error
assert_status "$ST" 1 "a failed lookup fails the step"
assert_eq "$URL_OUT" "" "a failed lookup writes no url"
assert_says "$OUT" "Throttling" "a failed lookup shows the AWS error"
assert_says "$OUT" "::error" "a failed lookup raises an error annotation"

for lookup in none empty; do
  run "" "$lookup"
  assert_status "$ST" 1 "no distribution ($lookup) fails the step"
  assert_eq "$URL_OUT" "" "no distribution ($lookup) writes no url"
done
assert_says "$OUT" "Terraform Infrastructure" "no distribution says to create the infrastructure"
assert_says "$OUT" "VITE_SITE_URL" "no distribution names the variable that would do instead"

echo " the deploy workflow"
line_of() { grep -n -F -- "$1" "$WORKFLOW" | head -1 | cut -d: -f1; }
resolve_line="$(line_of 'run: bash .github/scripts/resolve-site-url.sh')"
build_line="$(line_of 'run: npm run build')"
node_line="$(line_of 'uses: actions/setup-node@')"
if [ -n "$resolve_line" ]; then ok "runs this script"; else bad "runs this script" "not found in deploy.yaml"; fi
if [ -n "$resolve_line" ] && [ -n "$node_line" ] && [ "$node_line" -lt "$resolve_line" ]; then
  ok "runs it after Setup Node.js, which it needs"
else
  bad "runs it after Setup Node.js, which it needs" "setup-node at line ${node_line:-none}, resolve at ${resolve_line:-none}"
fi
if [ -n "$resolve_line" ] && [ -n "$build_line" ] && [ "$resolve_line" -lt "$build_line" ]; then
  ok "runs it before the build"
else
  bad "runs it before the build" "resolve at line ${resolve_line:-none}, build at ${build_line:-none}"
fi
assert_says "$(cat "$WORKFLOW")" 'VITE_SITE_URL: ${{ steps.site.outputs.url }}' "builds with its output"

finish
