#!/usr/bin/env bash
#
# Deletes the objects a build no longer contains: every key in the bucket (or
# under PREFIX) that the build's manifest does not name. Run last, after the
# invalidation, so no visitor is served a page naming a file just deleted.
#
# Except the previous build's assets/: a visitor who loaded the page before
# this deploy still fetches its lazy chunks, and a 404 there blanks the page.
# Each run records its manifest at <PREFIX>.deploy/previous-manifest.txt, and
# the next run keeps the assets/ keys it names. With no record (the first run
# of this script), no assets/ key is deleted at all.
#
# Inputs (environment):
#   BUCKET         the bucket
#   MANIFEST       the build's file list, as `find . -type f | sort` writes it
#   PREFIX         optional: only keys under it are considered, and the
#                  manifest's paths are taken as relative to it (admin/)
#   KEEP_PREFIXES  optional, space-separated: keys under these are never
#                  deleted. The website deploy keeps admin/, which a separate
#                  build owns and cleans with PREFIX=admin/.
#
# Tests: .github/tests/deploy-cleanup.test.sh
set -euo pipefail

: "${BUCKET:?BUCKET is required}" "${MANIFEST:?MANIFEST is required}"
PREFIX="${PREFIX:-}"
KEEP_PREFIXES="${KEEP_PREFIXES:-}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "🧹 Removing files no longer in the build${PREFIX:+ under $PREFIX}..."

STATE_KEY="${PREFIX}.deploy/previous-manifest.txt"
ASSETS="${PREFIX}assets/"

aws s3api list-objects-v2 --bucket "$BUCKET" ${PREFIX:+--prefix "$PREFIX"} \
  --query 'Contents[].Key' --output text \
  | tr '\t' '\n' | sed '/^None$/d' | sed '/^$/d' | sort > "$WORK/s3-files.txt"

sed 's|^\./||' "$MANIFEST" | sed '/^$/d' | sed "s|^|${PREFIX}|" | sort > "$WORK/new-files.txt"

# The previous build's assets, or every asset when there is no record of it.
if aws s3api get-object --bucket "$BUCKET" --key "$STATE_KEY" "$WORK/previous.txt" >/dev/null 2>"$WORK/get.err"; then
  grep "^${ASSETS}" "$WORK/previous.txt" | sort -u > "$WORK/keep-assets.txt" || true
else
  echo "   No record of the previous build ($(tr -d '\n' < "$WORK/get.err" | cut -c1-120)): keeping every ${ASSETS} key this time"
  grep "^${ASSETS}" "$WORK/s3-files.txt" > "$WORK/keep-assets.txt" || true
fi

{ cat "$WORK/new-files.txt"; printf '%s\n' "$STATE_KEY"; } | sort -u > "$WORK/live.txt"
comm -23 "$WORK/s3-files.txt" "$WORK/live.txt" > "$WORK/unlisted.txt" || true
comm -23 "$WORK/unlisted.txt" "$WORK/keep-assets.txt" > "$WORK/orphans.txt" || true
previous="$(comm -12 "$WORK/unlisted.txt" "$WORK/keep-assets.txt" | grep -c . || true)"
[ "$previous" -eq 0 ] || echo "   Kept ${previous} asset(s) of the previous build: pages opened before this deploy still load them"

# This build is the previous one for the next deploy.
aws s3api put-object --bucket "$BUCKET" --key "$STATE_KEY" --body "$WORK/new-files.txt" \
  --content-type 'text/plain; charset=utf-8' --cache-control 'no-store' >/dev/null

kept=0
: > "$WORK/delete.txt"
while IFS= read -r key; do
  [ -n "$key" ] || continue
  keep=0
  for p in $KEEP_PREFIXES; do
    case "$key" in "$p"*) keep=1 ;; esac
  done
  if [ "$keep" -eq 1 ]; then kept=$((kept + 1)); else printf '%s\n' "$key" >> "$WORK/delete.txt"; fi
done < "$WORK/orphans.txt"

[ "$kept" -eq 0 ] || echo "   Kept ${kept} object(s) under ${KEEP_PREFIXES}: another build owns them"

COUNT="$(grep -c . "$WORK/delete.txt" || true)"
if [ "$COUNT" -eq 0 ]; then
  echo "   No orphaned files to remove"
  exit 0
fi

echo "   Removing ${COUNT} orphaned file(s)..."
while IFS= read -r key; do
  aws s3api delete-object --bucket "$BUCKET" --key "$key" >/dev/null
done < "$WORK/delete.txt"
echo "✅ ${COUNT} orphaned file(s) removed"
