#!/usr/bin/env bash
# Tests for the deploy roles' policy that infrastructure/aws/setup.sh writes.
# The script runs against a stub `aws` that records each policy document
# instead of sending it, so this needs no account and changes nothing.
#
# The CloudFront Function grant is the one confined by name alone (functions
# cannot be tagged), so it must name exactly the functions main.tf creates: a
# <env>-<project>-* wildcard also matches a neighbouring project whose slug
# starts with this one's, `shop` reaching `shop-eu`'s live edge code.
set -uo pipefail
. "$(dirname "$0")/assert.sh"

SETUP="$REPO_ROOT/infrastructure/aws/setup.sh"
TF_DIR="$REPO_ROOT/infrastructure/terraform"
ACCOUNT=123456789012
CAPTURE="$SANDBOX/policies"
mkdir -p "$CAPTURE"

stub aws <<'EOF'
#!/usr/bin/env bash
printf 'aws %s\n' "$*" >> "$AWS_LOG"
case "$1 $2" in
  "sts get-caller-identity") echo "123456789012" ;;
  "iam put-role-policy")
    role=""; doc=""; name=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --role-name) role="$2"; shift ;;
        --policy-name) name="$2"; shift ;;
        --policy-document) doc="${2#file://}"; shift ;;
      esac
      shift
    done
    # The cost guards are a second inline policy on the same role.
    case "$name" in
      *-cost-guards) cp "$doc" "$CAPTURE/$role-cost-guards.json" ;;
      *) cp "$doc" "$CAPTURE/$role.json" ;;
    esac ;;
  "iam get-role") echo "arn:aws:iam::123456789012:role/stub" ;;
  *) ;;
esac
exit 0
EOF
stub gh <<'EOF'
#!/usr/bin/env bash
exit 1
EOF
require_stubbed_aws
if ! command -v jq >/dev/null 2>&1; then
  echo "  jq is required" >&2
  exit 2
fi

# The functions main.tf creates, as name suffixes after <env>-<project>-.
FUNCTION_SUFFIXES="$(awk '
  /^resource "aws_cloudfront_function"/ { in_fn = 1; next }
  in_fn && /^[[:space:]]*name[[:space:]]*=/ {
    if (match($0, /"\$\{local\.name_prefix\}-\$\{var\.project\}-[a-z0-9-]+"/)) {
      name = substr($0, RSTART + 1, RLENGTH - 2)
      sub(/^\$\{local\.name_prefix\}-\$\{var\.project\}-/, "", name)
      print name
    } else {
      print "UNRECOGNISED:" $0
    }
    in_fn = 0
  }
' "$TF_DIR/main.tf")"

echo "setup.sh deploy-role policy"

echo " the functions main.tf creates"
if [ -n "$FUNCTION_SUFFIXES" ]; then ok "are found"; else bad "are found" "no aws_cloudfront_function in main.tf"; fi
assert_silent "$FUNCTION_SUFFIXES" "UNRECOGNISED" "are all named <name_prefix>-<project>-<suffix>"
for env in dev prod; do
  prefix="$(sed -n 's/^resource_prefix *= *"\(.*\)"/\1/p' "$TF_DIR/environments/$env.tfvars")"
  assert_eq "$prefix" "$env" "$env.tfvars names them with the environment, as setup.sh does"
done

# run PROJECT FEATURES: runs setup.sh and leaves each role's policy in $CAPTURE.
run() {
  rm -f "$CAPTURE"/*.json
  : > "$AWS_LOG"
  OUT="$(PROJECT="$1" REPO="$1" FEATURES="$2" GITHUB_OWNER=owner GITHUB_OWNER_ID=1 GITHUB_REPO_ID=2 \
    CAPTURE="$CAPTURE" bash "$SETUP" 2>&1)"
  ST=$?
}

# Every Allow that grants a CloudFront Function action other than listing.
function_grants() {
  jq -c '[.Statement[]
    | select(.Effect == "Allow")
    | select([.Action] | flatten | any(test("^cloudfront:(\\*|[A-Za-z]*Function)$") and . != "cloudfront:ListFunctions"))]' "$1"
}

check_project() {
  local project="$1" neighbour="$2" env policy grants resources actions expected r
  for env in dev prod; do
    policy="$CAPTURE/github-oidc-$project-$env.json"
    echo " $project, $env"
    if [ -f "$policy" ] && jq -e . "$policy" >/dev/null 2>&1; then
      ok "writes a valid policy"
    else
      bad "writes a valid policy" "no parseable $policy"
      continue
    fi
    grants="$(function_grants "$policy")"
    assert_eq "$(jq 'length' <<<"$grants")" "1" "grants function actions in one statement"
    resources="$(jq -r '.[0].Resource | [.] | flatten | sort | .[]' <<<"$grants")"
    expected="$(for s in $FUNCTION_SUFFIXES; do
      echo "arn:aws:cloudfront::$ACCOUNT:function/$env-$project-$s"
    done | sort)"
    assert_eq "$resources" "$expected" "on exactly the functions main.tf creates"
    assert_silent "$resources" "*" "with no wildcard"
    assert_silent "$resources" "?" "with no single-character wildcard"
    for r in $resources; do
      # shellcheck disable=SC2053
      if [[ "arn:aws:cloudfront::$ACCOUNT:function/$env-$neighbour-rewrite" == $r ]]; then
        bad "cannot reach $neighbour's function" "$r matches it"
      else
        ok "cannot reach $neighbour's function"
      fi
    done
    actions="$(jq -r '.[0].Action | [.] | flatten | sort | join(" ")' <<<"$grants")"
    assert_eq "$actions" \
      "cloudfront:CreateFunction cloudfront:DeleteFunction cloudfront:DescribeFunction cloudfront:GetFunction cloudfront:PublishFunction cloudfront:UpdateFunction" \
      "only what Terraform calls on its function"
    assert_eq "$(jq -r '[.Statement[] | select(.Effect == "Allow") | select([.Action] | flatten | index("cloudfront:ListFunctions")) | .Resource] | flatten | join(" ")' "$policy")" \
      "*" "lists functions, which IAM cannot scope to one"
    guards="$CAPTURE/github-oidc-$project-$env-cost-guards.json"
    if [ -f "$guards" ] && jq -e . "$guards" >/dev/null 2>&1; then
      ok "writes a valid cost guards policy"
      assert_eq "$(jq -r '[.Statement[] | select(.Sid == "CostGuardsTopic") | .Resource] | join(" ")' "$guards")" \
        "arn:aws:sns:*:$ACCOUNT:$env-$project-*" "cost guards reach only this project's topics"
      assert_silent "$(jq -c '[.Statement[].Action] | flatten' "$guards")" "wafv2:" "cost guards grant no WAF action"
    else
      bad "writes a valid cost guards policy" "no parseable $guards"
    fi
  done
}

run shop ""
assert_status "$ST" 0 "setup.sh runs against the stub"
check_project shop shop-eu

run shop "contact,consent"
assert_status "$ST" 0 "setup.sh runs with every feature"
check_project shop shop-eu

finish
