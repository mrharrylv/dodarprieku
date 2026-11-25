# Shared by the *.test.sh files beside it. Sourced, never run on its own.
#
# The scripts under test call the AWS CLI. Every test puts a stub `aws` first
# on PATH and exports credentials that cannot sign anything, so even a stub
# that failed to shadow the real CLI could not reach the account.

PASS=0
FAIL=0

ok()  { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  FAIL %s: %s\n' "$1" "${2:-}"; }

assert_status() { if [ "$1" -eq "$2" ]; then ok "$3"; else bad "$3" "exit $1, wanted $2"; fi; }
assert_eq()     { if [ "$1" = "$2" ]; then ok "$3"; else bad "$3" "got '$1', wanted '$2'"; fi; }
assert_says()   { case "$1" in *"$2"*) ok "$3" ;; *) bad "$3" "no '$2' in: $1" ;; esac; }
assert_silent() { case "$1" in *"$2"*) bad "$3" "unexpected '$2' in: $1" ;; *) ok "$3" ;; esac; }

# Prints the summary line and fails the file when any assertion failed.
finish() {
  printf '  %d passed, %d failed\n' "$PASS" "$FAIL"
  [ "$FAIL" -eq 0 ]
}

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SANDBOX="$(mktemp -d "${TMPDIR:-/tmp}/pipeline-test.XXXXXX")"
trap 'rm -rf "$SANDBOX"' EXIT

STUBS="$SANDBOX/bin"
mkdir -p "$STUBS"
export AWS_LOG="$SANDBOX/aws.log"
: > "$AWS_LOG"

export AWS_ACCESS_KEY_ID="stub-not-a-key"
export AWS_SECRET_ACCESS_KEY="stub-not-a-secret"
export AWS_SESSION_TOKEN="stub-not-a-token"
export AWS_CONFIG_FILE=/dev/null
export AWS_SHARED_CREDENTIALS_FILE=/dev/null
unset AWS_PROFILE AWS_ROLE_ARN AWS_WEB_IDENTITY_TOKEN_FILE
export PATH="$STUBS:$PATH"

# stub NAME: writes stdin as an executable NAME first on PATH.
stub() {
  cat > "$STUBS/$1"
  chmod +x "$STUBS/$1"
}

# Refuses to run a single test unless the `aws` on PATH is the stub.
require_stubbed_aws() {
  if [ "$(command -v aws)" != "$STUBS/aws" ]; then
    echo "  the aws on PATH is $(command -v aws), not the stub: refusing to run" >&2
    exit 2
  fi
}
