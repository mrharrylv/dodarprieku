#!/usr/bin/env bash
#
# Put a freshly scaffolded site online. One command, one confirmation.
#
#   ./infrastructure/bootstrap.sh            # asks once, then runs everything
#   ./infrastructure/bootstrap.sh --yes      # no prompt (for a session that already asked)
#   ./infrastructure/bootstrap.sh --env dev  # the only environment this touches by default
#   ./infrastructure/bootstrap.sh --features contact   # grants for optional modules;
#                                 # detected from infrastructure/terraform/*.tf when omitted
#
# In order, idempotently (re-running skips what already exists):
#   1. gh repo create <owner>/<repo> --private, with this checkout as origin;
#      an origin that is already attached is used as it is, and the roles
#      trust THAT repository
#   2. infrastructure/aws/setup.sh: state bucket, OIDC provider, the two roles,
#      plus Lambda/SES (contact.tf), DynamoDB (consent.tf) and the API's
#      DynamoDB, Lambda, API Gateway, SSM and media bucket (api.tf) grants
#      when those files are present
#   3. an empty "[skip ci]" commit, pushed, so the workflows exist on main
#      without triggering a deploy that would fail for lack of infrastructure
#   3b. the Zone.ee API secrets (ZONE_USERNAME, ZONE_API_KEY) on the dev
#      ENVIRONMENT, from the macOS Keychain, through
#      ~/Dev/Unveil/scripts/zone-secrets.sh, when dev.tfvars sets zone_dns_zone
#   4. the Terraform Infrastructure workflow, dev, apply=true; waits for it.
#      With zone_dns_zone set it also creates the DNS records at Zone.ee
#   4b. VITE_SITE_URL = https://<domain> on the dev Environment, when the
#      domain's records were created in step 4, so the build's canonical,
#      hreflang, og:url and sitemap name the real host
#   5. the Build & Deploy workflow, dev; waits for it
#   6. prints the site's URL, and where the DNS records are if any are left
#      to create by hand
#
# Needs: gh (logged in), aws (ADMIN credentials, for step 2 only), git.
# Zone.ee key, once per Mac (the Keychain item every site reads):
#   security add-generic-password -U -s zone.eu-api -a '<ZoneID username>' -w
# (prompts for the key, so it never lands in the shell history). The secrets
# are only ever set by ZONE_SECRETS_SCRIPT (default
# ~/Dev/Unveil/scripts/zone-secrets.sh), which cleans the values first.
# Costs: a bucket, a distribution, two roles. Cents per month while idle.
#
# It never touches prod. Prod is a manual workflow_dispatch and stays that way.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

YES=0
ENVIRONMENT="dev"
FEATURES="${FEATURES:-}"
while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y)   YES=1; shift ;;
    --env)      ENVIRONMENT="${2:-dev}"; shift 2 ;;
    --features) FEATURES="${2:-}"; shift 2 ;;
    -h|--help) sed -n '3,41p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ "$ENVIRONMENT" = "dev" ] || { echo "bootstrap only handles dev. Prod is deliberately manual: see doc/deployment.md." >&2; exit 2; }

b=$'\e[1;34m'; g=$'\e[1;32m'; y=$'\e[1;33m'; r=$'\e[1;31m'; z=$'\e[0m'
section() { printf '\n%s━━ %s%s\n' "$b" "$*" "$z"; }
ok()      { printf '  %s✓%s %s\n' "$g" "$z" "$*"; }
warn()    { printf '  %s!%s %s\n' "$y" "$z" "$*"; }
die()     { printf '\n%s✗ %s%s\n\n' "$r" "$*" "$z" >&2; exit 1; }

# ── What this site is ──────────────────────────────────────────────────────
# init-site.sh substituted the slug into the workflow, so read it back from
# there rather than asking again.
PROJECT="$(sed -n 's/^  PROJECT: *//p' .github/workflows/deploy.yaml | head -1 | tr -d '"')"
[ -n "$PROJECT" ] || die "Could not read PROJECT from .github/workflows/deploy.yaml"
AWS_ACCOUNT_ID="$(sed -n 's/^  AWS_ACCOUNT_ID: *//p' .github/workflows/deploy.yaml | head -1 | tr -d '"')"
AWS_REGION="$(sed -n 's/^  AWS_REGION: *//p' .github/workflows/deploy.yaml | head -1 | tr -d '"')"
GITHUB_OWNER="${GITHUB_OWNER:-$(sed -n 's/^GITHUB_OWNER="${GITHUB_OWNER:-\(.*\)}"/\1/p' infrastructure/aws/setup.sh | head -1)}"
REPO="${REPO:-$PROJECT}"

# An origin that is already attached wins over the slug: the OIDC trust policy
# setup.sh writes must name the repository the workflows actually run in.
ORIGIN_URL="$(git remote get-url origin 2>/dev/null || true)"
if [ -n "$ORIGIN_URL" ]; then
  case "$ORIGIN_URL" in
    *github.com[:/]*)
      ORIGIN_PATH="$(printf '%s' "$ORIGIN_URL" | sed -E 's#^.*github\.com[:/]##; s#\.git$##; s#/+$##')"
      GITHUB_OWNER="${ORIGIN_PATH%%/*}"
      REPO="${ORIGIN_PATH#*/}"
      [ -n "$GITHUB_OWNER" ] && [ -n "$REPO" ] && [ "$REPO" != "$ORIGIN_PATH" ] \
        || die "Cannot read owner/repo from origin: $ORIGIN_URL" ;;
    *)
      die "origin is not a GitHub repository: $ORIGIN_URL
  Point it at the real one first:  git remote set-url origin https://github.com/${GITHUB_OWNER}/${REPO}.git" ;;
  esac
fi

# Optional modules bring their own Terraform file; the roles need the matching
# grants, or the first apply fails on the Lambda or the table.
if [ -z "$FEATURES" ]; then
  [ -f infrastructure/terraform/contact.tf ] && FEATURES="contact"
  [ -f infrastructure/terraform/consent.tf ] && FEATURES="${FEATURES:+$FEATURES,}consent"
  [ -f infrastructure/terraform/api.tf ] && FEATURES="${FEATURES:+$FEATURES,}app"
fi
ZONE_SECRETS_SCRIPT="${ZONE_SECRETS_SCRIPT:-$HOME/Dev/Unveil/scripts/zone-secrets.sh}"
DOMAIN="$(sed -n 's/^domain_name *= *"\(.*\)"/\1/p' infrastructure/terraform/environments/${ENVIRONMENT}.tfvars | head -1)"
ZONE_DNS_ZONE="$(sed -n 's/^zone_dns_zone *= *"\(.*\)"/\1/p' infrastructure/terraform/environments/${ENVIRONMENT}.tfvars | head -1)"

# ── Preflight ──────────────────────────────────────────────────────────────
section "Preflight"
command -v gh  >/dev/null || die "gh is not installed"
command -v aws >/dev/null || die "aws is not installed"
gh auth status >/dev/null 2>&1 || die "gh is not logged in. Run: gh auth login"
IDENTITY="$(aws sts get-caller-identity --query Account --output text 2>/dev/null || true)"
[ -n "$IDENTITY" ] || die "aws has no credentials. Run: aws sso login (or aws configure)"
[ "$IDENTITY" = "$AWS_ACCOUNT_ID" ] || die "aws credentials are for account $IDENTITY, the site expects $AWS_ACCOUNT_ID"
[ "$(git branch --show-current)" = "main" ] || die "Not on main. Every workflow triggers on main."
# The template repository ships its workflow triggers disabled. A copy that
# still has them would push, deploy nothing, and look fine.
if grep -rqs -e '#@site ' -e '@template-guard' .github/workflows; then
  die "The workflow triggers are still disabled (template markers). Run .github/scripts/enable-site-triggers.sh, commit, and re-run."
fi
[ -z "$(git status --porcelain)" ] || die "Working tree is not clean. Commit first."
ok "gh logged in, aws account $IDENTITY, on main, tree clean"

printf '\n  %-14s %s\n' "project" "$PROJECT"
printf '  %-14s %s\n' "repo"    "${GITHUB_OWNER}/${REPO} (private)"
printf '  %-14s %s\n' "aws"     "account ${AWS_ACCOUNT_ID}, region ${AWS_REGION}"
printf '  %-14s %s\n' "env"     "$ENVIRONMENT"
printf '  %-14s %s\n' "domain"  "${DOMAIN:-none (CloudFront URL)}"
printf '  %-14s %s\n' "features" "${FEATURES:-none (static site only)}"

if [ "$YES" -ne 1 ]; then
  printf '\n  This creates a GitHub repository, two IAM roles, an S3 bucket and a\n'
  printf '  CloudFront distribution, and deploys the site to %s.\n\n' "$ENVIRONMENT"
  printf '  Proceed? [y/N] '
  read -r answer
  case "$answer" in y|Y|yes|YES) ;; *) echo "Stopped. Nothing was created."; exit 0 ;; esac
fi

# ── 1. Repository ──────────────────────────────────────────────────────────
section "1. GitHub repository"
if git remote get-url origin >/dev/null 2>&1; then
  ok "origin already set: $(git remote get-url origin)"
elif gh repo view "${GITHUB_OWNER}/${REPO}" >/dev/null 2>&1; then
  git remote add origin "https://github.com/${GITHUB_OWNER}/${REPO}.git"
  ok "repo exists; origin added"
else
  gh repo create "${GITHUB_OWNER}/${REPO}" --private --source=. --remote=origin >/dev/null
  ok "created ${GITHUB_OWNER}/${REPO}"
fi

# ── 2. AWS roles ───────────────────────────────────────────────────────────
# After the repo exists, so setup.sh can resolve the numeric IDs GitHub puts
# in the OIDC subject claim. Before it exists, the trust policy is weaker.
section "2. AWS bootstrap (state bucket, OIDC provider, roles)"
PROJECT="$PROJECT" REPO="$REPO" GITHUB_OWNER="$GITHUB_OWNER" AWS_REGION="$AWS_REGION" \
  FEATURES="$FEATURES" ./infrastructure/aws/setup.sh
ok "roles ready"

# ── 3. Push, without deploying ─────────────────────────────────────────────
# The workflows must exist on main before gh can dispatch them. A plain push
# would also trigger the deploy, which fails with nowhere to upload to; the
# [skip ci] marker in the commit message stops that run from starting.
section "3. Push main"
if ! git ls-remote --exit-code --heads origin main >/dev/null 2>&1; then
  git commit --allow-empty -q -m "chore: bootstrap infrastructure [skip ci]"
  git push -q -u origin main
  ok "pushed main (deploy skipped on purpose)"
else
  git push -q -u origin main 2>/dev/null || true
  ok "main already on origin"
fi

# ── 3b. Zone.ee secrets ────────────────────────────────────────────────────
# Terraform creates the DNS records in zone_dns_zone itself, and needs the
# ZoneID login and API key to do it. They are GitHub ENVIRONMENT secrets on
# the environment the infra job runs in, and are only ever written by
# zone-secrets.sh: it reads the Keychain item zone.eu-api, cleans both values
# (the account is known to carry typographic quotes) and pipes them to gh, so
# they are never on a command line, in a log or typed by hand.
if [ -n "$ZONE_DNS_ZONE" ]; then
  section "3b. Zone.ee secrets ($ZONE_DNS_ZONE, environment $ENVIRONMENT)"
  [ -x "$ZONE_SECRETS_SCRIPT" ] || [ -f "$ZONE_SECRETS_SCRIPT" ] || die "$ZONE_SECRETS_SCRIPT is missing.
  It is the one way the Zone.ee secrets are set (it lives in the Unveil checkout).
  Clone mrharrylv/Unveil to ~/Dev/Unveil, or point ZONE_SECRETS_SCRIPT at it, then re-run."
  # gh cannot put a secret on an environment that does not exist yet.
  gh api -X PUT "repos/${GITHUB_OWNER}/${REPO}/environments/${ENVIRONMENT}" >/dev/null \
    || die "Could not create the $ENVIRONMENT environment on ${GITHUB_OWNER}/${REPO}."
  bash "$ZONE_SECRETS_SCRIPT" "$ENVIRONMENT" "${GITHUB_OWNER}/${REPO}" \
    || die "zone-secrets.sh failed; nothing was applied. Fix the Keychain item it names and re-run."
  SECRETS_NOW="$(gh secret list --env "$ENVIRONMENT" --repo "${GITHUB_OWNER}/${REPO}" 2>/dev/null | cut -f1 || true)"
  grep -qx ZONE_USERNAME <<<"$SECRETS_NOW" && grep -qx ZONE_API_KEY <<<"$SECRETS_NOW" \
    || die "ZONE_USERNAME and ZONE_API_KEY are not both on the $ENVIRONMENT environment after zone-secrets.sh."
  ok "ZONE_USERNAME and ZONE_API_KEY set on ${GITHUB_OWNER}/${REPO}, environment $ENVIRONMENT"
fi

# ── 4. Infrastructure ──────────────────────────────────────────────────────
section "4. Terraform Infrastructure ($ENVIRONMENT)"
run_and_wait() {
  local workflow="$1"; shift
  local before
  before="$(gh run list --workflow="$workflow" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")"
  gh workflow run "$workflow" "$@"
  local id=""
  for _ in $(seq 1 30); do
    sleep 3
    id="$(gh run list --workflow="$workflow" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || echo "")"
    [ -n "$id" ] && [ "$id" != "$before" ] && break
    id=""
  done
  [ -n "$id" ] || die "Could not find the run for $workflow. Check: gh run list --workflow=$workflow"
  printf '  run %s: %s\n' "$id" "$(gh run view "$id" --json url --jq .url)"
  gh run watch "$id" --exit-status >/dev/null || die "$workflow failed. Read it: gh run view $id --log-failed"
  echo "$id"
}
INFRA_RUN="$(run_and_wait infra.yaml -f environment="$ENVIRONMENT" -f apply=true | tail -1)"
ok "infrastructure applied"

# ── 4b. Canonical origin ───────────────────────────────────────────────────
# The build bakes VITE_SITE_URL into every canonical, hreflang, og:url and
# sitemap URL. Without it they all name the CloudFront domain. Set it once the
# host resolves, which step 4 just arranged, and leave a value someone chose
# by hand alone. The Environment exists now: the infra run created it.
if [ -n "$DOMAIN" ] && [ -n "$ZONE_DNS_ZONE" ] && [[ "$DOMAIN" == *."$ZONE_DNS_ZONE" ]]; then
  section "4b. Canonical origin ($ENVIRONMENT Environment)"
  EXISTING="$(gh variable get VITE_SITE_URL --env "$ENVIRONMENT" --repo "${GITHUB_OWNER}/${REPO}" 2>/dev/null || true)"
  if [ -n "$EXISTING" ]; then
    ok "VITE_SITE_URL already set: $EXISTING"
  elif gh variable set VITE_SITE_URL --env "$ENVIRONMENT" --repo "${GITHUB_OWNER}/${REPO}" --body "https://$DOMAIN" >/dev/null 2>&1; then
    ok "VITE_SITE_URL = https://$DOMAIN"
  else
    warn "could not set VITE_SITE_URL; the build names the CloudFront domain until it is set:"
    warn "  gh variable set VITE_SITE_URL --env $ENVIRONMENT --repo ${GITHUB_OWNER}/${REPO} --body https://$DOMAIN"
  fi
fi

# ── 5. Deploy ──────────────────────────────────────────────────────────────
section "5. Build & Deploy ($ENVIRONMENT)"
DEPLOY_RUN="$(run_and_wait deploy.yaml -f environment="$ENVIRONMENT" | tail -1)"
ok "deployed"

# ── 6. Where it is ─────────────────────────────────────────────────────────
section "Live"
CF_DOMAIN="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${ENVIRONMENT} - ${PROJECT} website'].DomainName | [0]" \
  --output text 2>/dev/null || true)"
if [ -n "$CF_DOMAIN" ] && [ "$CF_DOMAIN" != "None" ]; then
  printf '\n  https://%s\n\n' "$CF_DOMAIN"
else
  warn "distribution not found by comment; check the infra run summary"
fi
if [ -n "$DOMAIN" ] && [ -n "$ZONE_DNS_ZONE" ] && [[ "$DOMAIN" == *."$ZONE_DNS_ZONE" ]]; then
  printf '  https://%s  (DNS created at Zone.ee; allow a few minutes to resolve)\n\n' "$DOMAIN"
elif [ -n "$DOMAIN" ]; then
  printf '  Domain %s: certificate requested (phase 1). The DNS records to create\n' "$DOMAIN"
  printf '  are in the infrastructure run summary:\n'
  printf '    %s\n' "$(gh run view "$INFRA_RUN" --json url --jq .url)"
  printf '  Nothing further happens until they exist. Then set enable_custom_domain = true\n'
  printf '  in infrastructure/terraform/environments/%s.tfvars and re-run the infra workflow.\n\n' "$ENVIRONMENT"
fi
printf '  Deploy run: %s\n\n' "$(gh run view "$DEPLOY_RUN" --json url --jq .url)"
