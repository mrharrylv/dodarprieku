#!/usr/bin/env bash
#
# Deletes the objects a build no longer contains: every key in the bucket (or
# under PREFIX) that the build's manifest does not name. Run last, after the
# invalidation, so no visitor is served a page naming a file just deleted.
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

aws s3api list-objects-v2 --bucket "$BUCKET" ${PREFIX:+--prefix "$PREFIX"} \
  --query 'Contents[].Key' --output text \
  | tr '\t' '\n' | sed '/^None$/d' | sed '/^$/d' | sort > "$WORK/s3-files.txt"

sed 's|^\./||' "$MANIFEST" | sed '/^$/d' | sed "s|^|${PREFIX}|" | sort > "$WORK/new-files.txt"

comm -23 "$WORK/s3-files.txt" "$WORK/new-files.txt" > "$WORK/orphans.txt" || true

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
