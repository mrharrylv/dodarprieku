#!/usr/bin/env bash
#
# dodarprieku AWS bootstrap
# ─────────────────────
# Idempotent one-time setup. Safe to re-run: it refreshes what it owns and
# never rewrites the settings of the shared state bucket.
#
# Creates:
#   • the shared S3 Terraform state bucket (only if it does not exist yet)
#   • the GitHub OIDC identity provider (an AWS singleton per account)
#   • two IAM roles: github-oidc-dodarprieku-dev and github-oidc-dodarprieku-prod
#
# Usage:
#   ./setup.sh
#   FEATURES=contact ./setup.sh          # also grant Lambda + SES + logs
#   FEATURES=contact,consent ./setup.sh  # ... and DynamoDB
#   FEATURES=app ./setup.sh              # Dodar prieku's API: DynamoDB, Lambda,
#                                        # API Gateway, SSM, the media bucket
#
# Environment overrides:
#   AWS_REGION        default eu-north-1
#   GITHUB_OWNER      default mrharrylv
#   REPO              default dodarprieku
#   PROJECT           default dodarprieku
#   GITHUB_OWNER_ID   numeric owner id, if `gh` is unavailable
#   GITHUB_REPO_ID    numeric repo id, if `gh` is unavailable
#   FEATURES          comma list: contact, consent, app
#
# Requires admin AWS credentials. See ../doc.md for the full procedure.

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
REGION="${AWS_REGION:-eu-north-1}"
GITHUB_OWNER="${GITHUB_OWNER:-mrharrylv}"
REPO="${REPO:-dodarprieku}"
PROJECT="${PROJECT:-dodarprieku}"
FEATURES="${FEATURES:-}"
ENVIRONMENTS=("dev" "prod")

has_feature() { [[ ",${FEATURES}," == *",$1,"* ]]; }

# ── Derived ───────────────────────────────────────────────────────────────
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
STATE_BUCKET="ha-terraform-state-${ACCOUNT_ID}"
OIDC_HOST="token.actions.githubusercontent.com"
OIDC_ARN="arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_HOST}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# GitHub now issues ID-qualified OIDC subjects: the sub claim is
#   repo:<owner>@<ownerId>/<repo>@<repoId>:<context>
# not the historical repo:<owner>/<repo>:<context>. A trust policy written for
# only the old shape fails with a bare "Not authorized to perform
# sts:AssumeRoleWithWebIdentity", which says nothing about why. The real
# subject is visible only in CloudTrail. Trust BOTH shapes: the ID-qualified one
# is the stronger (immutable if the repo or account is renamed), and the legacy
# one keeps working if GitHub serves it.
OWNER_ID="${GITHUB_OWNER_ID:-}"
REPO_ID="${GITHUB_REPO_ID:-}"
if [ -z "$OWNER_ID" ] || [ -z "$REPO_ID" ]; then
  if command -v gh >/dev/null 2>&1; then
    OWNER_ID="$(gh api "repos/${GITHUB_OWNER}/${REPO}" --jq '.owner.id' 2>/dev/null || true)"
    REPO_ID="$(gh api "repos/${GITHUB_OWNER}/${REPO}" --jq '.id' 2>/dev/null || true)"
  fi
fi

if [ -n "$OWNER_ID" ] && [ -n "$REPO_ID" ]; then
  SUB_PATTERNS="\"repo:${GITHUB_OWNER}@${OWNER_ID}/${REPO}@${REPO_ID}:*\", \"repo:${GITHUB_OWNER}/${REPO}:*\""
else
  SUB_PATTERNS="\"repo:${GITHUB_OWNER}/${REPO}:*\""
fi

# ── Output helpers ────────────────────────────────────────────────────────
b=$'\e[1;34m'; g=$'\e[1;32m'; y=$'\e[1;33m'; z=$'\e[0m'
section() { printf '\n%s━━ %s%s\n' "$b" "$*" "$z"; }
ok()      { printf '  %s✓%s %s\n' "$g" "$z" "$*"; }
skip()    { printf '  %s·%s %s (already exists)\n' "$y" "$z" "$*"; }
warn()    { printf '  %s!%s %s\n' "$y" "$z" "$*"; }

# ── Banner ────────────────────────────────────────────────────────────────
section "${PROJECT} · account ${ACCOUNT_ID} · region ${REGION}"
echo "  GitHub repo:  ${GITHUB_OWNER}/${REPO}"
echo "  Environments: ${ENVIRONMENTS[*]}"
echo "  Features:     ${FEATURES:-none (static site only)}"
if [ -n "$OWNER_ID" ] && [ -n "$REPO_ID" ]; then
  echo "  OIDC subject: repo:${GITHUB_OWNER}@${OWNER_ID}/${REPO}@${REPO_ID}:* (+ legacy form)"
else
  warn "could not resolve the numeric GitHub IDs, so trusting only the legacy"
  printf '    subject shape. If AssumeRoleWithWebIdentity is denied, set\n'
  printf '    GITHUB_OWNER_ID and GITHUB_REPO_ID and re-run.\n'
fi

# ══════════════════════════════════════════════════════════════════════════
# 1. Terraform state bucket
# ══════════════════════════════════════════════════════════════════════════
# THE BUCKET IS SHARED across every project in this account. This script will
# CREATE and configure it if missing, but it will never rewrite the settings of
# a bucket that already exists: a stray put-bucket-policy here would land on
# every other project's state. When it is already there we verify and report.
section "1. Terraform state bucket: s3://${STATE_BUCKET}"

configure_new_bucket() {
  aws s3api put-public-access-block \
    --bucket "$STATE_BUCKET" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  ok "public access blocked"

  aws s3api put-bucket-versioning \
    --bucket "$STATE_BUCKET" \
    --versioning-configuration Status=Enabled
  ok "versioning enabled"

  aws s3api put-bucket-encryption \
    --bucket "$STATE_BUCKET" \
    --server-side-encryption-configuration \
      '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
  ok "SSE-S3 encryption enabled"

  aws s3api put-bucket-lifecycle-configuration \
    --bucket "$STATE_BUCKET" \
    --lifecycle-configuration '{
      "Rules":[
        {"ID":"expire-noncurrent-versions","Status":"Enabled","Filter":{},
         "NoncurrentVersionExpiration":{"NoncurrentDays":90}},
        {"ID":"abort-incomplete-multipart","Status":"Enabled","Filter":{},
         "AbortIncompleteMultipartUpload":{"DaysAfterInitiation":1}}
      ]
    }'
  ok "lifecycle rules applied"

  cat > "${TMP}/bucket-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::${STATE_BUCKET}",
        "arn:aws:s3:::${STATE_BUCKET}/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    },
    {
      "Sid": "DenyUnencryptedUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::${STATE_BUCKET}/*",
      "Condition": {
        "StringNotEquals": { "s3:x-amz-server-side-encryption": "AES256" }
      }
    }
  ]
}
EOF
  aws s3api put-bucket-policy --bucket "$STATE_BUCKET" --policy "file://${TMP}/bucket-policy.json"
  ok "bucket policy applied (TLS + SSE required)"
}

verify_existing_bucket() {
  local versioning encryption policy
  versioning="$(aws s3api get-bucket-versioning --bucket "$STATE_BUCKET" \
    --query 'Status' --output text 2>/dev/null || echo 'unknown')"
  encryption="$(aws s3api get-bucket-encryption --bucket "$STATE_BUCKET" \
    --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' \
    --output text 2>/dev/null || echo 'none')"
  policy="$(aws s3api get-bucket-policy --bucket "$STATE_BUCKET" \
    --query 'Policy' --output text 2>/dev/null || echo '')"

  printf '    versioning : %s\n' "$versioning"
  printf '    encryption : %s\n' "$encryption"
  if printf '%s' "$policy" | grep -q DenyInsecureTransport; then
    printf '    policy     : TLS-only enforced\n'
  else
    warn "policy does NOT enforce TLS. Fix it deliberately, not from this script"
  fi

  [ "$versioning" = "Enabled" ] || warn "versioning is not Enabled on the shared state bucket"
}

if aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null; then
  skip "bucket"
  echo "    shared with the other projects in this account. Left untouched, verifying only:"
  verify_existing_bucket
else
  aws s3api create-bucket \
    --bucket "$STATE_BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=${REGION}" \
    >/dev/null
  ok "bucket created"
  configure_new_bucket
fi

# ══════════════════════════════════════════════════════════════════════════
# 2. GitHub OIDC identity provider
# ══════════════════════════════════════════════════════════════════════════
section "2. GitHub OIDC identity provider"

if aws iam get-open-id-connect-provider \
     --open-id-connect-provider-arn "$OIDC_ARN" >/dev/null 2>&1; then
  skip "$OIDC_HOST"
else
  aws iam create-open-id-connect-provider \
    --url "https://${OIDC_HOST}" \
    --client-id-list "sts.amazonaws.com" \
    >/dev/null
  ok "$OIDC_HOST"
fi

# ══════════════════════════════════════════════════════════════════════════
# 3. Per-environment IAM deploy roles
# ══════════════════════════════════════════════════════════════════════════
section "3. Deploy roles"

for env in "${ENVIRONMENTS[@]}"; do
  role="github-oidc-${PROJECT}-${env}"
  bucket="${env}-${PROJECT}-website"
  media_bucket="${env}-${PROJECT}-media"

  # The buckets this role may touch besides the state. The media bucket only
  # exists with the app feature (infrastructure/terraform/app_data.tf).
  OWN_BUCKET_ARNS="\"arn:aws:s3:::${bucket}\",
        \"arn:aws:s3:::${bucket}/*\""
  if has_feature app; then
    OWN_BUCKET_ARNS="${OWN_BUCKET_ARNS},
        \"arn:aws:s3:::${media_bucket}\",
        \"arn:aws:s3:::${media_bucket}/*\""
  fi

  cat > "${TMP}/trust.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "${OIDC_ARN}" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "${OIDC_HOST}:aud": "sts.amazonaws.com"
      },
      "StringLike": {
        "${OIDC_HOST}:sub": [${SUB_PATTERNS}]
      }
    }
  }]
}
EOF

  # Least privilege. State access is confined to this project's prefix, an
  # explicit Deny blocks every other project's state, and the CloudFront/ACM
  # denies stop this role from touching a resource another project has tagged as
  # its own. CloudFront Functions cannot be tagged, so theirs are confined by
  # exact name instead (see TerraformCloudFrontFunctions below).
  #
  # The tag denies use StringNotEqualsIfExists rather than StringNotEquals: if a
  # CloudFront call ever arrives without aws:ResourceTag in its context, the
  # bare form would deny our own deploy. IfExists still protects the other
  # projects, whose distributions are tagged, and stays out of the way otherwise.
  #
  # The CloudFront Function grant names the one function main.tf creates,
  # aws_cloudfront_function.rewrite, "<resource_prefix>-<project>-rewrite",
  # whose resource_prefix is the environment. Not <env>-<project>-*: a slug may
  # contain hyphens, so `shop`'s wildcard would also match `prod-shop-eu-rewrite`,
  # and one site's workflow could update and publish another site's live
  # viewer-request code. A function added to main.tf needs its exact ARN added
  # here too; .github/tests/setup-policy.test.sh fails until it is. The actions
  # are the ones Terraform calls on it (DescribeFunction and GetFunction to
  # read, the rest to create, change, publish and destroy it). TestFunction is
  # left out: nothing calls it. ListFunctions cannot be scoped to a resource,
  # and only lists names.
  FUNCTION_ARN="arn:aws:cloudfront::${ACCOUNT_ID}:function/${env}-${PROJECT}-rewrite"

  STATEMENTS=$(cat <<EOF
    {
      "Sid": "TerraformStateBucketList",
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketVersioning"],
      "Resource": "arn:aws:s3:::${STATE_BUCKET}",
      "Condition": {
        "StringLike": { "s3:prefix": ["${PROJECT}", "${PROJECT}/*"] }
      }
    },
    {
      "Sid": "TerraformStateObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::${STATE_BUCKET}/${PROJECT}/${env}/*"
    },
    {
      "Sid": "DenyOtherProjectsState",
      "Effect": "Deny",
      "Action": "s3:*",
      "NotResource": [
        "arn:aws:s3:::${STATE_BUCKET}",
        "arn:aws:s3:::${STATE_BUCKET}/${PROJECT}/*",
        ${OWN_BUCKET_ARNS}
      ]
    },
    {
      "Sid": "TerraformS3Website",
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": [
        ${OWN_BUCKET_ARNS}
      ]
    },
    {
      "Sid": "STSIdentity",
      "Effect": "Allow",
      "Action": ["sts:GetCallerIdentity"],
      "Resource": "*"
    },
    {
      "Sid": "TerraformCloudFront",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:DeleteDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:GetDistributionConfig",
        "cloudfront:UpdateDistribution",
        "cloudfront:TagResource",
        "cloudfront:UntagResource",
        "cloudfront:ListTagsForResource",
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations",
        "cloudfront:CreateOriginAccessControl",
        "cloudfront:DeleteOriginAccessControl",
        "cloudfront:GetOriginAccessControl",
        "cloudfront:UpdateOriginAccessControl",
        "cloudfront:CreateResponseHeadersPolicy",
        "cloudfront:DeleteResponseHeadersPolicy",
        "cloudfront:GetResponseHeadersPolicy",
        "cloudfront:GetResponseHeadersPolicyConfig",
        "cloudfront:UpdateResponseHeadersPolicy",
        "cloudfront:ListResponseHeadersPolicies",
        "cloudfront:ListDistributions",
        "cloudfront:ListOriginAccessControls"
      ],
      "Resource": "*"
    },
    {
      "Sid": "TerraformCloudFrontFunctions",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateFunction",
        "cloudfront:DescribeFunction",
        "cloudfront:GetFunction",
        "cloudfront:UpdateFunction",
        "cloudfront:PublishFunction",
        "cloudfront:DeleteFunction"
      ],
      "Resource": "${FUNCTION_ARN}"
    },
    {
      "Sid": "TerraformCloudFrontListFunctions",
      "Effect": "Allow",
      "Action": ["cloudfront:ListFunctions"],
      "Resource": "*"
    },
    {
      "Sid": "DenyChangingOtherProjectsDistributions",
      "Effect": "Deny",
      "Action": [
        "cloudfront:DeleteDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:CreateInvalidation",
        "cloudfront:UntagResource"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEqualsIfExists": { "aws:ResourceTag/Project": "${PROJECT}" }
      }
    },
    {
      "Sid": "TerraformACM",
      "Effect": "Allow",
      "Action": [
        "acm:RequestCertificate",
        "acm:DeleteCertificate",
        "acm:DescribeCertificate",
        "acm:ListCertificates",
        "acm:GetCertificate",
        "acm:ListTagsForCertificate",
        "acm:AddTagsToCertificate"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyChangingOtherProjectsCertificates",
      "Effect": "Deny",
      "Action": ["acm:DeleteCertificate", "acm:AddTagsToCertificate"],
      "Resource": "*",
      "Condition": {
        "StringNotEqualsIfExists": { "aws:ResourceTag/Project": "${PROJECT}" }
      }
    }
EOF
)

  # ── Optional: contact form (Lambda behind a Function URL, sending via SES) ──
  if has_feature contact; then
    STATEMENTS="${STATEMENTS},
    {
      \"Sid\": \"TerraformLambda\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"lambda:CreateFunction\",
        \"lambda:DeleteFunction\",
        \"lambda:GetFunction\",
        \"lambda:GetFunctionConfiguration\",
        \"lambda:GetFunctionUrlConfig\",
        \"lambda:CreateFunctionUrlConfig\",
        \"lambda:UpdateFunctionUrlConfig\",
        \"lambda:DeleteFunctionUrlConfig\",
        \"lambda:UpdateFunctionCode\",
        \"lambda:UpdateFunctionConfiguration\",
        \"lambda:AddPermission\",
        \"lambda:RemovePermission\",
        \"lambda:GetPolicy\",
        \"lambda:TagResource\",
        \"lambda:UntagResource\",
        \"lambda:ListTags\"
      ],
      \"Resource\": \"arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${env}-${PROJECT}-*\"
    },
    {
      \"Sid\": \"TerraformLambdaExecutionRole\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"iam:CreateRole\",
        \"iam:DeleteRole\",
        \"iam:GetRole\",
        \"iam:PassRole\",
        \"iam:TagRole\",
        \"iam:PutRolePolicy\",
        \"iam:DeleteRolePolicy\",
        \"iam:GetRolePolicy\",
        \"iam:ListRolePolicies\",
        \"iam:AttachRolePolicy\",
        \"iam:DetachRolePolicy\",
        \"iam:ListAttachedRolePolicies\"
      ],
      \"Resource\": \"arn:aws:iam::${ACCOUNT_ID}:role/${env}-${PROJECT}-*\"
    },
    {
      \"Sid\": \"TerraformLogs\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"logs:CreateLogGroup\",
        \"logs:DeleteLogGroup\",
        \"logs:DescribeLogGroups\",
        \"logs:PutRetentionPolicy\",
        \"logs:TagResource\",
        \"logs:ListTagsForResource\"
      ],
      \"Resource\": \"arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${env}-${PROJECT}-*\"
    },
    {
      \"Sid\": \"TerraformSES\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"ses:GetEmailIdentity\",
        \"ses:CreateEmailIdentity\",
        \"ses:DeleteEmailIdentity\",
        \"ses:PutEmailIdentityMailFromAttributes\",
        \"ses:TagResource\",
        \"ses:ListTagsForResource\",
        \"ses:GetAccount\"
      ],
      \"Resource\": \"*\"
    }"
  fi

  # ── Optional: consent records in DynamoDB ─────────────────────────────────
  if has_feature consent; then
    STATEMENTS="${STATEMENTS},
    {
      \"Sid\": \"TerraformDynamoDB\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"dynamodb:CreateTable\",
        \"dynamodb:DeleteTable\",
        \"dynamodb:DescribeTable\",
        \"dynamodb:DescribeTimeToLive\",
        \"dynamodb:UpdateTimeToLive\",
        \"dynamodb:UpdateTable\",
        \"dynamodb:TagResource\",
        \"dynamodb:UntagResource\",
        \"dynamodb:ListTagsOfResource\",
        \"dynamodb:DescribeContinuousBackups\",
        \"dynamodb:UpdateContinuousBackups\"
      ],
      \"Resource\": \"arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${env}-${PROJECT}-*\"
    }"
  fi

  # ── Optional: Dodar prieku's API (infrastructure/terraform/api.tf) ────────
  # Each grant names the one resource Terraform creates, by the
  # <env>-<project>-<name> names api.tf and app_data.tf use. API Gateway IDs
  # are random, so those grants cannot name the API; a Deny keeps the role off
  # any API another project has tagged as its own.
  if has_feature app; then
    API_FN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${env}-${PROJECT}-api"
    API_ROLE="arn:aws:iam::${ACCOUNT_ID}:role/${env}-${PROJECT}-api"
    API_LOGS="arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${env}-${PROJECT}-api"
    # The website's 404 page (not_found.tf): a second function, with a URL
    # CloudFront reaches through OAC.
    NF_FN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${env}-${PROJECT}-not-found"
    NF_ROLE="arn:aws:iam::${ACCOUNT_ID}:role/${env}-${PROJECT}-not-found"
    NF_LOGS="arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/lambda/${env}-${PROJECT}-not-found"
    APP_TABLE="arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${env}-${PROJECT}-data"
    APP_PARAMS="arn:aws:ssm:${REGION}:${ACCOUNT_ID}:parameter/${env}/${PROJECT}/*"
    STATEMENTS="${STATEMENTS},
    {
      \"Sid\": \"AppDynamoDB\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"dynamodb:CreateTable\",
        \"dynamodb:DeleteTable\",
        \"dynamodb:DescribeTable\",
        \"dynamodb:UpdateTable\",
        \"dynamodb:DescribeTimeToLive\",
        \"dynamodb:UpdateTimeToLive\",
        \"dynamodb:DescribeContinuousBackups\",
        \"dynamodb:UpdateContinuousBackups\",
        \"dynamodb:TagResource\",
        \"dynamodb:UntagResource\",
        \"dynamodb:ListTagsOfResource\"
      ],
      \"Resource\": [\"${APP_TABLE}\", \"${APP_TABLE}/index/*\"]
    },
    {
      \"Sid\": \"AppLambda\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"lambda:CreateFunction\",
        \"lambda:DeleteFunction\",
        \"lambda:GetFunction\",
        \"lambda:GetFunctionConfiguration\",
        \"lambda:GetFunctionCodeSigningConfig\",
        \"lambda:GetFunctionConcurrency\",
        \"lambda:GetFunctionRecursionConfig\",
        \"lambda:ListVersionsByFunction\",
        \"lambda:UpdateFunctionCode\",
        \"lambda:UpdateFunctionConfiguration\",
        \"lambda:AddPermission\",
        \"lambda:RemovePermission\",
        \"lambda:GetPolicy\",
        \"lambda:TagResource\",
        \"lambda:UntagResource\",
        \"lambda:ListTags\",
        \"lambda:GetFunctionUrlConfig\",
        \"lambda:CreateFunctionUrlConfig\",
        \"lambda:UpdateFunctionUrlConfig\",
        \"lambda:DeleteFunctionUrlConfig\"
      ],
      \"Resource\": [\"${API_FN}\", \"${NF_FN}\"]
    },
    {
      \"Sid\": \"AppLambdaRole\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"iam:CreateRole\",
        \"iam:DeleteRole\",
        \"iam:GetRole\",
        \"iam:TagRole\",
        \"iam:UntagRole\",
        \"iam:PutRolePolicy\",
        \"iam:DeleteRolePolicy\",
        \"iam:GetRolePolicy\",
        \"iam:ListRolePolicies\",
        \"iam:ListAttachedRolePolicies\",
        \"iam:ListInstanceProfilesForRole\"
      ],
      \"Resource\": [\"${API_ROLE}\", \"${NF_ROLE}\"]
    },
    {
      \"Sid\": \"AppPassRoleToLambda\",
      \"Effect\": \"Allow\",
      \"Action\": \"iam:PassRole\",
      \"Resource\": [\"${API_ROLE}\", \"${NF_ROLE}\"],
      \"Condition\": { \"StringEquals\": { \"iam:PassedToService\": \"lambda.amazonaws.com\" } }
    },
    {
      \"Sid\": \"AppLogs\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"logs:CreateLogGroup\",
        \"logs:DeleteLogGroup\",
        \"logs:PutRetentionPolicy\",
        \"logs:DeleteRetentionPolicy\",
        \"logs:TagResource\",
        \"logs:UntagResource\",
        \"logs:ListTagsForResource\",
        \"logs:TagLogGroup\",
        \"logs:ListTagsLogGroup\"
      ],
      \"Resource\": [\"${API_LOGS}\", \"${API_LOGS}:*\", \"${NF_LOGS}\", \"${NF_LOGS}:*\"]
    },
    {
      \"Sid\": \"AppLogsDescribe\",
      \"Effect\": \"Allow\",
      \"Action\": [\"logs:DescribeLogGroups\"],
      \"Resource\": \"arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:*\"
    },
    {
      \"Sid\": \"AppApiGateway\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"apigateway:GET\",
        \"apigateway:POST\",
        \"apigateway:PUT\",
        \"apigateway:PATCH\",
        \"apigateway:DELETE\",
        \"apigateway:TagResource\",
        \"apigateway:UntagResource\"
      ],
      \"Resource\": [
        \"arn:aws:apigateway:${REGION}::/apis\",
        \"arn:aws:apigateway:${REGION}::/apis/*\",
        \"arn:aws:apigateway:${REGION}::/tags/*\"
      ]
    },
    {
      \"Sid\": \"DenyChangingOtherProjectsApis\",
      \"Effect\": \"Deny\",
      \"Action\": [\"apigateway:PUT\", \"apigateway:PATCH\", \"apigateway:DELETE\"],
      \"Resource\": \"arn:aws:apigateway:${REGION}::/apis/*\",
      \"Condition\": {
        \"StringNotEqualsIfExists\": { \"aws:ResourceTag/Project\": \"${PROJECT}\" }
      }
    },
    {
      \"Sid\": \"AppParameters\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"ssm:PutParameter\",
        \"ssm:GetParameter\",
        \"ssm:GetParameters\",
        \"ssm:DeleteParameter\",
        \"ssm:AddTagsToResource\",
        \"ssm:RemoveTagsFromResource\",
        \"ssm:ListTagsForResource\"
      ],
      \"Resource\": \"${APP_PARAMS}\"
    },
    {
      \"Sid\": \"AppParametersDescribe\",
      \"Effect\": \"Allow\",
      \"Action\": [\"ssm:DescribeParameters\"],
      \"Resource\": \"*\"
    },
    {
      \"Sid\": \"AppParametersKmsViaSsm\",
      \"Effect\": \"Allow\",
      \"Action\": [\"kms:Decrypt\", \"kms:Encrypt\", \"kms:GenerateDataKey\"],
      \"Resource\": \"*\",
      \"Condition\": {
        \"StringEquals\": { \"kms:ViaService\": \"ssm.${REGION}.amazonaws.com\" },
        \"StringLike\": { \"kms:EncryptionContext:PARAMETER_ARN\": \"${APP_PARAMS}\" }
      }
    },
    {
      \"Sid\": \"AppCachePolicies\",
      \"Effect\": \"Allow\",
      \"Action\": [
        \"cloudfront:CreateCachePolicy\",
        \"cloudfront:GetCachePolicy\",
        \"cloudfront:GetCachePolicyConfig\",
        \"cloudfront:UpdateCachePolicy\",
        \"cloudfront:DeleteCachePolicy\",
        \"cloudfront:ListCachePolicies\",
        \"cloudfront:GetOriginRequestPolicy\",
        \"cloudfront:ListOriginRequestPolicies\"
      ],
      \"Resource\": \"*\"
    }"
  fi

  printf '{\n  "Version": "2012-10-17",\n  "Statement": [\n%s\n  ]\n}\n' "$STATEMENTS" > "${TMP}/perm.json"

  if aws iam get-role --role-name "$role" >/dev/null 2>&1; then
    aws iam update-assume-role-policy \
      --role-name "$role" \
      --policy-document "file://${TMP}/trust.json"
    skip "role ${role} (trust policy refreshed)"
  else
    aws iam create-role \
      --role-name "$role" \
      --assume-role-policy-document "file://${TMP}/trust.json" \
      --description "GitHub Actions OIDC role - ${PROJECT} ${env}" \
      >/dev/null
    ok "role ${role}"
  fi

  aws iam put-role-policy \
    --role-name "$role" \
    --policy-name "${role}-policy" \
    --policy-document "file://${TMP}/perm.json"
  ok "  policy ${role}-policy"

  cat > "${TMP}/cost-guards.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostGuardsTopic",
      "Effect": "Allow",
      "Action": [
        "sns:CreateTopic",
        "sns:DeleteTopic",
        "sns:GetTopicAttributes",
        "sns:SetTopicAttributes",
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:GetSubscriptionAttributes",
        "sns:SetSubscriptionAttributes",
        "sns:ListSubscriptionsByTopic",
        "sns:TagResource",
        "sns:UntagResource",
        "sns:ListTagsForResource"
      ],
      "Resource": "arn:aws:sns:*:${ACCOUNT_ID}:${env}-${PROJECT}-*"
    },
    {
      "Sid": "CostGuardsAlarms",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DeleteAlarms",
        "cloudwatch:TagResource",
        "cloudwatch:UntagResource",
        "cloudwatch:ListTagsForResource"
      ],
      "Resource": "arn:aws:cloudwatch:*:${ACCOUNT_ID}:alarm:${env}-${PROJECT}-*"
    },
    {
      "Sid": "CostGuardsList",
      "Effect": "Allow",
      "Action": ["cloudwatch:DescribeAlarms"],
      "Resource": "*"
    }
  ]
}
EOF

  aws iam put-role-policy \
    --role-name "$role" \
    --policy-name "${role}-cost-guards" \
    --policy-document "file://${TMP}/cost-guards.json"
  ok "  policy ${role}-cost-guards"

  # Tags are how this project is told apart from the others sharing the account.
  # They also back the ResourceTag denies above, and make "what does this project
  # own?" answerable with a tag query rather than by reading names.
  aws iam tag-role \
    --role-name "$role" \
    --tags "Key=Project,Value=${PROJECT}" \
           "Key=Environment,Value=${env}" \
           "Key=Owner,Value=${GITHUB_OWNER}" \
           "Key=Repository,Value=${GITHUB_OWNER}/${REPO}" \
           "Key=ManagedBy,Value=setup.sh" \
           "Key=Component,Value=github-oidc-deploy-role" \
           "Key=StatePrefix,Value=${PROJECT}/${env}"
  ok "  tags Project=${PROJECT} Environment=${env}"
done

# ══════════════════════════════════════════════════════════════════════════
# Summary
# ══════════════════════════════════════════════════════════════════════════
section "Done"
echo
printf '  %-20s s3://%s (region %s)\n' "State bucket:" "$STATE_BUCKET" "$REGION"
printf '  %-20s %s\n' "OIDC provider:" "$OIDC_ARN"
echo
echo "  Role ARNs:"
for env in "${ENVIRONMENTS[@]}"; do
  arn="$(aws iam get-role --role-name "github-oidc-${PROJECT}-${env}" \
         --query 'Role.Arn' --output text 2>/dev/null || echo 'n/a')"
  printf '    %-10s %s\n' "${env}" "$arn"
done
echo
echo "  Next: run the 'Terraform Infrastructure' workflow in GitHub Actions"
echo "  (environment: dev). See infrastructure/doc.md."
echo
