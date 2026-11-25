#!/usr/bin/env bash
#
# Runs one package's checks, in the order given, stopping at the first that
# fails. Shared by `make verify`, ci.yaml and deploy.yaml, so the three cannot
# run different checks for the same package.
#
#   package-checks.sh <dir> <step>...
#
# Steps: `install` (npm ci with a lockfile; npm install, loudly, without one;
# nothing when the package has no dependencies), or the name of an npm script
# (lint, typecheck, test, test:coverage, build ...).
#
# A missing package directory, or a script the package does not define, is
# SKIPPED with a warning, so `make verify` keeps working while a package is
# still being written. REQUIRE_PACKAGES=1 (CI and deploy) turns a missing
# directory into a failure: a pipeline must never ship around a package that
# disappeared.
#
# Tests: .github/tests/package-checks.test.sh
set -uo pipefail

DIR="${1:-}"
[ -n "$DIR" ] || { echo "usage: package-checks.sh <dir> <step>..." >&2; exit 2; }
shift

y=$'\e[1;33m'; r=$'\e[1;31m'; g=$'\e[1;32m'; z=$'\e[0m'
warn() { printf '%s!! SKIPPED%s %s\n' "$y" "$z" "$*"; [ -z "${GITHUB_ACTIONS:-}" ] || printf '::warning title=Skipped check::%s\n' "$*"; }
fail() { printf '%sFAILED%s %s\n' "$r" "$z" "$*" >&2; [ -z "${GITHUB_ACTIONS:-}" ] || printf '::error title=Check failed::%s\n' "$*"; exit 1; }

if [ ! -f "$DIR/package.json" ]; then
  [ "${REQUIRE_PACKAGES:-0}" = 1 ] && fail "$DIR has no package.json"
  warn "$DIR does not exist yet (no package.json): its checks did not run"
  exit 0
fi

has_script() { node -e 'const p=require(process.argv[1]);process.exit(p.scripts&&p.scripts[process.argv[2]]?0:1)' "$PWD/$DIR/package.json" "$1"; }
has_deps() { node -e 'const p=require(process.argv[1]);process.exit(Object.keys({...p.dependencies,...p.devDependencies}).length?0:1)' "$PWD/$DIR/package.json"; }

for step in "$@"; do
  case "$step" in
    install)
      if [ -f "$DIR/package-lock.json" ]; then
        (cd "$DIR" && npm ci --no-audit --no-fund) || fail "$DIR: npm ci"
      elif has_deps; then
        warn "$DIR has no package-lock.json: ran npm install, so versions are not pinned"
        (cd "$DIR" && npm install --no-audit --no-fund) || fail "$DIR: npm install"
      else
        echo "$DIR: no dependencies, nothing to install"
      fi ;;
    *)
      if has_script "$step"; then
        printf '%s==>%s %s: npm run %s\n' "$g" "$z" "$DIR" "$step"
        (cd "$DIR" && npm run --silent "$step") || fail "$DIR: npm run $step"
      else
        warn "$DIR defines no \"$step\" script"
      fi ;;
  esac
done
