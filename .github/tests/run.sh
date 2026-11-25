#!/usr/bin/env bash
# Runs every *.test.sh beside this file: the deploy pipeline's shell, which the
# website's Vitest suite does not reach. CI's `pipeline` job runs it on every
# pull request, and `make verify` runs it locally. Needs bash, jq and node,
# and no AWS credentials: each test stubs the AWS CLI.
#
#   make test-pipeline      (or: bash .github/tests/run.sh)
set -uo pipefail
cd "$(dirname "$0")"

failed=0
total=0
for t in *.test.sh; do
  total=$((total + 1))
  bash "$t" || failed=$((failed + 1))
done

if [ "$failed" -eq 0 ]; then
  echo "pipeline tests: ${total} file(s) passed"
else
  echo "pipeline tests: ${failed} of ${total} file(s) failed"
  exit 1
fi
