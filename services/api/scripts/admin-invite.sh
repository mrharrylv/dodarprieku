#!/usr/bin/env bash
# Creates (or re-invites) an admin of the Dodar prieku admin portal by invoking
# the API Lambda directly. Only an IAM principal allowed lambda:InvokeFunction
# on the function can do this; there is no HTTP route for it.
#
#   scripts/admin-invite.sh <function-name> <email>
#
# The admin receives a 7-day link to https://admin.<host>/parole?token=...
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <function-name> <email>" >&2
  exit 2
fi

function_name="$1"
email="$2"

# The email goes into a JSON payload: accept only a plain address, so nothing
# in it can break out of the string.
if [[ ! "$email" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "error: '$email' is not a plain email address" >&2
  exit 2
fi

out="$(mktemp)"
trap 'rm -f "$out"' EXIT

aws lambda invoke \
  --function-name "$function_name" \
  --cli-binary-format raw-in-base64-out \
  --payload "{\"task\":\"invite-admin\",\"email\":\"$email\"}" \
  "$out" > /dev/null

cat "$out"
echo

if grep -q '"ok":true' "$out"; then
  if grep -q '"mailSent":false' "$out"; then
    echo "warning: the account exists but the email was not sent; check SES and run again" >&2
    exit 1
  fi
  echo "invite sent to $email"
else
  echo "error: the invite failed (see the function's logs)" >&2
  exit 1
fi
