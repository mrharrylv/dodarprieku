#!/usr/bin/env bash
#
# Phase 0 of the deploy action: refuse a build that has no canonical origin,
# before anything reaches the bucket.
#
# The build writes robots.txt (with an absolute Sitemap line), sitemap.xml and
# llms.txt only when it has an origin. Without one it still exits 0, with
# relative canonical, hreflang and og URLs on every page, and Phase 4 would
# then delete the live sitemap.xml and llms.txt because this build's manifest
# does not name them. deploy.yaml already refuses to build without an origin;
# this is the check at the point of harm, for any build that reaches the
# action another way.
#
# Reads local files only: DIST (the built dist/) and MANIFEST (its file list,
# `find . -type f | sort` from inside dist/).
#
# Tests: .github/tests/deploy-preflight.test.sh
set -euo pipefail

: "${DIST:?DIST is required}" "${MANIFEST:?MANIFEST is required}"

CRAWLER_FILES="robots.txt sitemap.xml llms.txt"

refuse() {
  printf '::error title=Build has no canonical origin::%s\n' "$1"
  echo "Nothing was uploaded. Set VITE_SITE_URL on this Environment to the site's https origin, or"
  echo "leave it unset and let the build use the CloudFront domain, then deploy again."
  exit 1
}

if [ ! -s "$MANIFEST" ]; then
  refuse "The build's manifest ($MANIFEST) is missing or empty, so Phase 4 would delete every file in the bucket."
fi

missing=""
for f in $CRAWLER_FILES; do
  if ! grep -q -x -F -e "./$f" -e "$f" "$MANIFEST"; then
    missing="${missing:+$missing, }$f"
  fi
done
if [ -n "$missing" ]; then
  refuse "This build is missing ${missing}: it was built without a VITE_SITE_URL it could use. Deploying it would serve relative canonical, hreflang and og:url links, and Phase 4 would delete the live copies of ${missing}."
fi

if ! grep -q -E '^Sitemap: https://[^/[:space:]]+/' "$DIST/robots.txt"; then
  refuse "This build's robots.txt names no absolute Sitemap: it is the committed fallback, written when the build had no VITE_SITE_URL it could use."
fi

echo "✅ Phase 0 complete: the build carries its canonical origin ($(grep -m1 -E '^Sitemap: ' "$DIST/robots.txt" | cut -d' ' -f2))"
