#!/usr/bin/env bash
#
# Turns a copy of the website template into a site that deploys itself.
#
# The template repository (mrharrylv/ha_website_template) is only the source
# new sites are copied from, so nothing in it may ever build or deploy. Its
# workflows carry every automatic trigger commented out with a `#@site ` prefix,
# and every entry job of those two workflows has an `if:` line ending in `# @template-guard` that skips
# it in the template repository even on a manual dispatch. `#@template-note`
# lines explain this in place and are deleted too.
#
# This script strips the prefix and deletes the guard lines, so a copy gets
# `push: main` on deploy.yaml and `pull_request: main` on ci.yaml back.
# bin/init-site.sh runs it on every new copy and infrastructure/bootstrap.sh
# runs it again before the first push. Running it twice changes nothing.
#
# Usage: .github/scripts/enable-site-triggers.sh [SITE_ROOT]   (default: this repo)
# Tests: .github/tests/enable-site-triggers.test.sh
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
DIR="$ROOT/.github/workflows"

if ! ls "$DIR"/*.y*ml >/dev/null 2>&1; then
  echo "enable-site-triggers: no workflows under $DIR" >&2
  exit 1
fi

for f in "$DIR"/*.y*ml; do
  tmp="$(mktemp)"
  sed -e '/# @template-guard$/d' -e '/#@template-note/d' -e 's/#@site //' "$f" > "$tmp"
  if cmp -s "$tmp" "$f"; then rm -f "$tmp"; else cat "$tmp" > "$f"; rm -f "$tmp"; fi
done

if grep -rn -e '#@site' -e '@template-' "$DIR" >&2; then
  echo "enable-site-triggers: markers left above; fix them by hand" >&2
  exit 1
fi
echo "enable-site-triggers: workflow triggers enabled in $DIR"
