#!/usr/bin/env bash
#
# The canonical origin a deploy build bakes into every page: its canonical,
# hreflang, og:url and og:image, the structured data, and robots.txt,
# sitemap.xml and llms.txt. Writes `url=https://<host>` to $GITHUB_OUTPUT, or
# fails the step. There is no third outcome.
#
# A build with no origin exits 0 and ships relative URLs and no sitemap.xml or
# llms.txt, and the deploy's cleanup phase would then delete the live copies of
# both as orphans. So a value the build would reject, and a lookup that did not
# answer, fail here instead of becoming an empty origin.
#
# Inputs (environment):
#   CONFIGURED     the Environment's VITE_SITE_URL variable, empty when unset
#   ENV, PROJECT   which distribution to read the domain from when it is unset
#   GITHUB_OUTPUT  set by the runner
#
# Tests: .github/tests/resolve-site-url.test.sh
set -euo pipefail

CONFIGURED="${CONFIGURED:-}"
: "${ENV:?ENV is required}" "${PROJECT:?PROJECT is required}" "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"

# An error annotation, escaped the way workflow commands require, so a value
# carrying a newline cannot end the annotation and start a command of its own.
fail() {
  local pct='%' msg
  msg="${1//$pct/%25}"
  msg="${msg//$'\r'/%0D}"
  msg="${msg//$'\n'/%0A}"
  printf '::error title=No canonical origin::%s\n' "$msg"
  exit 1
}

# An origin and nothing else: https, a DNS name with at least one dot, no
# port, path, query or user. A path would be dropped by the build anyway, and
# says the value was meant as something other than the site's own origin.
LABEL='[a-z0-9]([a-z0-9-]*[a-z0-9])?'
ORIGIN_RE="^https://(${LABEL}\\.)+${LABEL}\$"

# The build reads VITE_SITE_URL with Node's URL parser (vite.config.ts,
# src/config/env.ts), so the value is read the same way here, by the Node.js
# that "Setup Node.js" put on PATH: the scheme and host lower-cased, a Unicode
# host in its punycode form (https://kafejnīca.lv is https://xn--kafejnca-fjb.lv),
# the default port dropped. Everything else it keeps, for the pattern above to
# judge. Surrounding whitespace is trimmed; whitespace inside is refused here,
# because the parser would quietly delete a tab or a line break.
normalise() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  case "$value" in *[[:space:]]*) return 1 ;; esac
  # `--` first: a value such as --require=file must reach the script as its
  # argument, never be read by node as an option of its own.
  value="$(node -e 'process.stdout.write(new URL(process.argv[1]).href)' -- "$value" 2>/dev/null)" || return 1
  printf '%s' "${value%/}"
}

if ! command -v node >/dev/null 2>&1; then
  fail "node is not on PATH, and it reads VITE_SITE_URL the way the build will. Run this step after Setup Node.js."
fi

publish() {
  echo "url=$1" >> "$GITHUB_OUTPUT"
  echo "🔗 Site URL ($2): $1"
}

if [ -n "$CONFIGURED" ]; then
  if [ -z "${CONFIGURED//[[:space:]]/}" ]; then
    fail "VITE_SITE_URL on the ${ENV} Environment is set but blank. Set it to the site's origin, e.g. https://www.example.com, or delete it to use the CloudFront domain."
  fi
  url="$(normalise "$CONFIGURED")" || url=""
  if ! [[ "$url" =~ $ORIGIN_RE ]]; then
    fail "VITE_SITE_URL on the ${ENV} Environment is \"${CONFIGURED}\", which is not an https origin. It must look like https://www.example.com: https, the host, nothing after it. An internationalised domain is fine as written (https://kafejnīca.lv) or in punycode (https://xn--kafejnca-fjb.lv)."
  fi
  publish "$url" configured
  exit 0
fi

# No variable: the distribution's own domain, which is what a site still on its
# CloudFront URL is served from. The lookup's error is left on stderr, where
# the log shows it, and fails the step.
if ! DOMAIN="$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='${ENV} - ${PROJECT} website'].DomainName | [0]" \
  --output text)"; then
  fail "Could not read the ${ENV} CloudFront domain (the AWS error is above), so this build would have no canonical origin. Re-run the workflow, or set VITE_SITE_URL on the ${ENV} Environment."
fi

if [ -z "$DOMAIN" ] || [ "$DOMAIN" = "None" ] || [ "$DOMAIN" = "null" ]; then
  fail "No CloudFront distribution '${ENV} - ${PROJECT} website' to take the origin from. Run the Terraform Infrastructure workflow for ${ENV} first, or set VITE_SITE_URL on the ${ENV} Environment."
fi

url="$(normalise "https://${DOMAIN}")" || url=""
if ! [[ "$url" =~ $ORIGIN_RE ]]; then
  fail "The ${ENV} CloudFront lookup answered \"${DOMAIN}\", which is not a host name."
fi
publish "$url" "from CloudFront"
