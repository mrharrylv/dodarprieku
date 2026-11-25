#!/usr/bin/env bash
# Tests for .github/scripts/package-checks.sh, which `make verify`, ci.yaml
# and deploy.yaml run for every package. A stub npm records each call, so no
# package is installed or built here.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SCRIPT="$REPO_ROOT/.github/scripts/package-checks.sh"
export NPM_LOG="$SANDBOX/npm.log"

stub npm <<'EOF_NPM'
#!/usr/bin/env bash
printf '%s npm %s\n' "$(basename "$PWD")" "$*" >> "$NPM_LOG"
case " $* " in *" ${NPM_FAIL:-none} "*) exit 1 ;; esac
exit 0
EOF_NPM

pkg() { # pkg NAME JSON [lockfile]
  mkdir -p "$SANDBOX/w/$1"
  printf '%s' "$2" > "$SANDBOX/w/$1/package.json"
  [ "${3:-}" = lock ] && echo '{}' > "$SANDBOX/w/$1/package-lock.json"
  return 0
}
run() {
  : > "$NPM_LOG"
  OUT="$(cd "$SANDBOX/w" && bash "$SCRIPT" "$@" 2>&1)"
  ST=$?
  CALLS="$(cat "$NPM_LOG")"
}

echo "package-checks.sh"

pkg api '{"scripts":{"lint":"x","build":"y"},"devDependencies":{"a":"1"}}' lock
pkg loose '{"scripts":{"test":"x"},"dependencies":{"a":"1"}}'
pkg bare '{"scripts":{"test":"x"}}'

echo " a package with a lockfile"
run api install lint build
assert_status "$ST" 0 "passes"
assert_eq "$CALLS" "api npm ci --no-audit --no-fund
api npm run --silent lint
api npm run --silent build" "runs npm ci, then each script in order"

echo " a script the package does not define"
run api typecheck
assert_status "$ST" 0 "is not a failure"
assert_says "$OUT" "SKIPPED" "but says so loudly"
assert_eq "$CALLS" "" "and runs nothing"

echo " a failing step"
NPM_FAIL=lint run api lint build
assert_status "$ST" 1 "fails"
assert_says "$OUT" "api: npm run lint" "naming the step"
assert_silent "$CALLS" "build" "and stops there"

echo " no lockfile"
run loose install
assert_status "$ST" 0 "installs"
assert_says "$CALLS" "npm install" "with npm install"
assert_says "$OUT" "not pinned" "and warns"

echo " no dependencies"
run bare install test
assert_eq "$CALLS" "bare npm run --silent test" "installs nothing"

echo " a missing package"
run missing install test
assert_status "$ST" 0 "is skipped locally"
assert_says "$OUT" "does not exist yet" "with a warning"
OUT="$(cd "$SANDBOX/w" && REQUIRE_PACKAGES=1 bash "$SCRIPT" missing test 2>&1)"; ST=$?
assert_status "$ST" 1 "fails in CI (REQUIRE_PACKAGES=1)"

echo " GitHub annotations"
OUT="$(cd "$SANDBOX/w" && GITHUB_ACTIONS=true bash "$SCRIPT" api typecheck 2>&1)"
assert_says "$OUT" "::warning title=Skipped check::" "a skip is a workflow warning"

finish
