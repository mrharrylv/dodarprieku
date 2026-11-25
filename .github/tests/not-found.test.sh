#!/usr/bin/env bash
# The website's 404 function (infrastructure/terraform/functions/not-found):
# its node:test suite, so `make test-pipeline` and CI's pipeline job run it.
set -uo pipefail
cd "$(dirname "$0")/../../infrastructure/terraform/functions/not-found" || exit 1
echo "== not-found function"
node --test index.node-test.mjs
