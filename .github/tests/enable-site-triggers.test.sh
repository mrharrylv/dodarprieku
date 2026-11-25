#!/usr/bin/env bash
# Tests for .github/scripts/enable-site-triggers.sh. The template repository
# ships its workflows with every automatic trigger commented out and every
# entry job guarded, so nothing in it ever builds or deploys. A site copied
# from it has to get them back, or it never deploys and nothing looks wrong.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/scripts/enable-site-triggers.sh"
SITE="$SANDBOX/site"
mkdir -p "$SITE/.github"
cp -R "$REPO_ROOT/.github/workflows" "$SITE/.github/workflows"

# In the template itself (markers present), nothing may trigger on its own.
if grep -rqs '#@site ' "$REPO_ROOT/.github/workflows"; then
  active="$(grep -hE '^  (push|pull_request|schedule|workflow_run):' "$REPO_ROOT/.github/workflows/"*.yaml)"
  assert_eq "$active" "" "template workflows have no automatic trigger"
  # The infra workflows are manual only, and the AWS roles trust only each
  # site's own repository; the two with automatic triggers are also guarded.
  for f in ci.yaml deploy.yaml; do
    assert_says "$(cat "$REPO_ROOT/.github/workflows/$f")" "@template-guard" "$f guards its entry jobs"
  done
fi

OUT="$(bash "$SCRIPT" "$SITE" 2>&1)"; ST=$?
assert_status "$ST" 0 "enables the triggers"

DEPLOY="$(cat "$SITE/.github/workflows/deploy.yaml")"
CI="$(cat "$SITE/.github/workflows/ci.yaml")"
assert_says "$DEPLOY" $'on:\n  push:\n    branches:\n      - main\n  workflow_dispatch:' "deploy pushes on main"
assert_says "$CI" $'on:\n  pull_request:\n    branches:\n      - main\n  workflow_dispatch:' "ci runs on pull requests to main"

left="$(grep -rn -e '#@site' -e '@template-' "$SITE/.github/workflows" || true)"
assert_eq "$left" "" "no template marker or guard survives"

before="$(cat "$SITE/.github/workflows/"*.yaml | shasum)"
OUT="$(bash "$SCRIPT" "$SITE" 2>&1)"; ST=$?
after="$(cat "$SITE/.github/workflows/"*.yaml | shasum)"
assert_status "$ST" 0 "a second run succeeds"
assert_eq "$after" "$before" "a second run changes nothing"

if command -v ruby >/dev/null 2>&1; then
  for f in "$SITE/.github/workflows/"*.yaml; do
    ruby -ryaml -e 'YAML.load_file(ARGV[0])' "$f" 2>/dev/null
    assert_status $? 0 "$(basename "$f") still parses"
  done
fi

OUT="$(bash "$SCRIPT" "$SANDBOX/nowhere" 2>&1)"; ST=$?
assert_status "$ST" 1 "refuses a folder with no workflows"

finish
