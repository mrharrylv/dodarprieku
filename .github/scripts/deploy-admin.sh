#!/usr/bin/env bash
#
# Deploys the admin portal (services/frontend/admin, Vite base /admin/) under
# admin/ in the website bucket, where the viewer-request function sends every
# address on the admin. host.
#
#   deploy-admin.sh upload    check the build, then assets (immutable), other
#                             files (revalidated), index.html (no-cache) last
#   deploy-admin.sh cleanup   delete admin/ objects the build no longer has;
#                             run after the CloudFront invalidation
#
# Inputs (environment): BUCKET, DIST (the admin's dist/), MANIFEST (its
# `find . -type f | sort`).
#
# Tests: .github/tests/deploy-admin.test.sh
set -euo pipefail

ACTION="${1:-}"
: "${BUCKET:?BUCKET is required}" "${DIST:?DIST is required}" "${MANIFEST:?MANIFEST is required}"
PREFIX="admin"
IMMUTABLE="public, max-age=31536000, immutable"
REVALIDATE="public, max-age=3600, must-revalidate"
NO_CACHE="no-cache"
HTML_TYPE="text/html; charset=utf-8"

die() { printf '::error title=Admin deploy::%s\n' "$1" >&2; exit 1; }

preflight() {
  [ -f "$DIST/index.html" ] || die "$DIST/index.html is missing: the admin build produced no page."
  [ -f "$MANIFEST" ] || die "$MANIFEST is missing."
  # Built without base: '/admin/', the page asks for /assets/..., which is the
  # public site's folder: a blank admin portal, or the wrong code.
  grep -q '/admin/assets/' "$DIST/index.html" \
    || die "$DIST/index.html does not load from /admin/assets/: set base: '/admin/' in the admin's vite.config.ts."
}

upload() {
  preflight
  if [ -d "$DIST/assets" ]; then
    echo "📤 admin/assets (immutable)..."
    aws s3 sync "$DIST/assets/" "s3://$BUCKET/$PREFIX/assets" \
      --exclude "*" --include "*.js" --content-type "text/javascript; charset=utf-8" \
      --cache-control "$IMMUTABLE" --only-show-errors
    aws s3 sync "$DIST/assets/" "s3://$BUCKET/$PREFIX/assets" \
      --exclude "*" --include "*.css" --content-type "text/css; charset=utf-8" \
      --cache-control "$IMMUTABLE" --only-show-errors
    aws s3 sync "$DIST/assets/" "s3://$BUCKET/$PREFIX/assets" \
      --exclude "*.js" --exclude "*.css" \
      --cache-control "$IMMUTABLE" --only-show-errors
  fi

  echo "📤 admin/ unhashed files (revalidated hourly)..."
  aws s3 sync "$DIST/" "s3://$BUCKET/$PREFIX" \
    --exclude "assets/*" --exclude "*.html" \
    --cache-control "$REVALIDATE" --only-show-errors

  echo "📝 admin/index.html (no-cache), last..."
  aws s3 cp "$DIST/" "s3://$BUCKET/$PREFIX/" --recursive \
    --exclude "*" --include "*.html" --exclude "assets/*" --exclude "index.html" \
    --content-type "$HTML_TYPE" --cache-control "$NO_CACHE" --only-show-errors
  aws s3 cp "$DIST/index.html" "s3://$BUCKET/$PREFIX/index.html" \
    --content-type "$HTML_TYPE" --cache-control "$NO_CACHE" --only-show-errors
  echo "✅ admin portal uploaded"
}

case "$ACTION" in
  upload) upload ;;
  cleanup) BUCKET="$BUCKET" MANIFEST="$MANIFEST" PREFIX="$PREFIX/" KEEP_PREFIXES="" \
             bash "$(dirname "$0")/../actions/deploy-site/cleanup.sh" ;;
  *) die "usage: deploy-admin.sh upload|cleanup" ;;
esac
