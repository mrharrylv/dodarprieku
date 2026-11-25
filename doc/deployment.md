# Deployment

From an empty repository to a live site, in order. Skipping a step here fails
loudly at best and silently at worst, so the order matters.

## The shape of it

```
        push to main
             │
             ▼
   ┌─────────────────────┐      ┌──────────────────┐
   │  Build & Deploy     │      │  Terraform       │
   │  (auto → dev)       │      │  Infrastructure  │
   │  (manual → prod)    │      │  (manual only)   │
   └──────────┬──────────┘      └────────┬─────────┘
              │ OIDC                     │ OIDC
              ▼                          ▼
        ┌──────────┐               ┌──────────────┐
        │    S3    │◄──── OAC ─────│  CloudFront  │◄── ACM cert
        └──────────┘               └──────────────┘
```

No AWS keys exist anywhere. Both workflows assume an IAM role through GitHub's
OIDC provider, scoped to this project by name and by resource tag.

Dod ar prieku adds, in the same Terraform and the same distribution: the
DynamoDB table `<env>-dodarprieku-data`, the media bucket
`<env>-dodarprieku-media` (`/media/*` and `/data/*`), the API function
`<env>-dodarprieku-api` behind an HTTP API (`/api/*`), two SSM parameters, and
the `admin.` host. The deploy roles need the `app` grants for them:
`bootstrap.sh` detects `infrastructure/terraform/api.tf` and passes
`FEATURES=app` to `setup.sh`. **An existing role must be re-run with it**
(`FEATURES=app ./infrastructure/aws/setup.sh`, admin credentials) before the
first infra apply that includes the API, or the apply stops at the table
with AccessDenied.

The same grants cover `<env>-dodarprieku-not-found`, a small function with a
URL that serves the website's `404.html` with a real 404 status
(`infrastructure/terraform/not_found.tf`). The default behaviour fails over to
it from the bucket on 403 or 404; no other path does, so the API's own 403 and
404 answers reach the browser with their JSON error codes. A role set up
before this function existed needs the same re-run.

## First run

### 1. Create the repository

```bash
gh repo create <owner>/<repo> --private --source=. --remote=origin
git push -u origin main
```

That push triggers a deploy, and the deploy **will fail**: there is no bucket
and no distribution to upload to. That is expected and harmless. Do step 2
before pushing if you would rather not have a red run in the history.

### 2. Bootstrap AWS (once per project, needs admin credentials)

```bash
PROJECT=<slug> REPO=<repo> GITHUB_OWNER=<owner> ./infrastructure/aws/setup.sh
```

Creates the shared Terraform state bucket if it does not exist, the GitHub OIDC
provider if it does not exist, and two IAM roles:
`github-oidc-<slug>-dev` and `-prod`.

The script is idempotent and re-runnable. **Re-run it on an existing site
before the first Terraform apply that adds a resource type the roles have not
managed before.** The CloudFront Function that maps each page's URL to its
prerendered file (`aws_cloudfront_function.rewrite`) is one: a role created
before it was added lacks `cloudfront:CreateFunction`, and the apply fails with
AccessDenied until the script has refreshed the role's policy.

The role may manage that one function by its exact name, `<env>-<slug>-rewrite`,
and no other. Functions cannot carry the `Project` tag the other grants lean
on, and a name wildcard would reach a neighbouring site whose slug starts with
this one's (`shop` reaching `shop-eu`'s live edge code). A new
`aws_cloudfront_function` in `main.tf` therefore needs its name added to
`setup.sh`, and a re-run; `bash .github/tests/run.sh` fails until the two
agree.

Re-run it with the same `FEATURES` the site was set up with
(`FEATURES=contact`, `FEATURES=contact,consent`). The script writes each role's
policy from that list, so a bare re-run on a site with the contact form takes
the Lambda and SES permissions away again.

**On a site already live from an older copy of the template, the order matters:
re-run this script, then deploy the new build, then apply the Terraform.** The
build adds a file for every page and a `404.html`; the Terraform then points
page URLs at those files and answers a missing one with `404.html` and a 404
status. Applied first, it would send every page but the home page to a 404
page that is not in the bucket yet. Deployed first, the new files sit
harmlessly behind the old configuration until the apply.

The script deliberately will **not** rewrite the settings of a state bucket
that already exists: that bucket is shared with
every other project in the account, and a stray `put-bucket-policy` would land
on all of them.

It needs the repository to exist first, so it can resolve the numeric owner and
repo IDs that GitHub now puts in the OIDC subject claim. Without those it falls
back to the legacy subject shape, which still works but is weaker. If a later
deploy fails with a bare *"Not authorized to perform
sts:AssumeRoleWithWebIdentity"*, that is the cause. Re-run the script now that
the repo exists.

### 3. Create the infrastructure

**Actions → Terraform Infrastructure → environment: `dev` → Run workflow.**

Creates the bucket, the distribution, the OAC, the security-headers policy
and the CloudFront Function that points each page's URL at its prerendered
file. Takes about five minutes, most of it CloudFront.

On `dev` the headers policy also sends `X-Robots-Tag: noindex, nofollow` on
every response; only `prod` is left indexable. A URL with no page is answered
with `404.html` and a real 404 status, not the home page. Every other
spelling of a page's address is answered by the function with a 301 to the
page: `/en/about/` and `/en/about/index.html` to `/en/about`, `/index.html` to
`/`, and an old unprefixed link (`/services`) or an unpublished language
(`/de/services`) to the default language's page, `/en/services`. The function
is part of the infrastructure, so a change to it goes live on this workflow,
not on a deploy.

Leave `apply` ticked. Unticking it plans without applying, which is the safe way
to see what a change would do.

### 4. Deploy

**Actions → Build & Deploy Website → environment: `dev`.** Or just push to
`main`; every push deploys to dev.

The site is now live on its CloudFront URL. Read it from the infra workflow's
output (`website_url`), or:

```bash
aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='dev - <slug> website'].DomainName | [0]" \
  --output text
```

At this point you have a working site with no DNS involved at all. If you only
needed a staging URL, stop here. Either way, check what a crawler gets from it:
see [Checking what a crawler sees](#checking-what-a-crawler-sees).

## Adding a custom domain

Two phases, and they must be done in order. The reason is circular: CloudFront
will not accept an alias without a valid certificate, and ACM will not issue a
certificate until it can see a DNS record proving you control the domain, which
you can only add once you know what the record is.

So: **phase 1 creates the certificate and prints the records. You add them.
Phase 2 attaches everything.**

### Phase 1: request the certificate

In `infrastructure/terraform/environments/<env>.tfvars`:

```hcl
domain_name          = "example.com"
domain_aliases       = ["www.example.com"]   # optional
enable_custom_domain = false                 # ← phase 1
```

Commit, push, then run the **Terraform Infrastructure** workflow.

The site keeps serving from its CloudFront URL throughout. Nothing is attached
yet, so nothing can break.

The workflow's summary now contains a table of every DNS record required: the
ACM validation CNAMEs, and the CNAMEs pointing your hostnames at CloudFront.

### Phase 2: add DNS, then attach

Add the **ACM validation CNAMEs** at your DNS provider. Then wait for the
certificate to be issued, and check rather than assume:

```bash
aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='example.com'].[DomainName,Status]" \
  --output text
# expect → example.com  ISSUED
```

`us-east-1` is not a typo. CloudFront can only use a certificate from that
region, whatever region the rest of the stack is in.

Validation usually completes within a few minutes of the record propagating. If
it is still `PENDING_VALIDATION` after an hour, the record is wrong. See
[`dns.md`](dns.md), which covers the two ways it is usually wrong.

Only once it says `ISSUED`:

```hcl
enable_custom_domain = true    # ← phase 2
```

Push, run the infra workflow again, and add the site CNAMEs from its output.
CloudFront takes five to fifteen minutes to deploy the change to every edge.

```bash
curl -I https://example.com    # expect HTTP/2 200
```

### Then name the domain as canonical

The canonical origin comes from the `VITE_SITE_URL` variable on the GitHub
Environment. With none set, the deploy reads the distribution's CloudFront
domain instead, which is right for a site that has only that URL and wrong the
moment a custom domain answers: every canonical, `hreflang`, `og:url`, sitemap
and `llms.txt` URL would still name `*.cloudfront.net`, telling search engines
the real domain is a duplicate.

```bash
gh variable set VITE_SITE_URL --env prod --body https://example.com
gh workflow run deploy.yaml -f environment=prod
```

One host, apex or `www`, whichever [`dns.md`](dns.md) settled on; the other
alias serves the same pages, whose canonical then points here.

The value is an https origin and nothing else: `https://www.example.com`, not
`www.example.com`, not `http://`, not a URL with a path or a port. An
internationalised domain may be written as it is (`https://kafejnīca.lv`) or
in punycode (`https://xn--kafejnca-fjb.lv`): the step reads it with Node's URL
parser, as the build does, and every URL the site publishes uses the punycode
form. Anything else fails the deploy at **Resolve site URL**, before it builds,
rather than shipping a site with relative links (see
[How a deploy works](#how-a-deploy-works)).

### Why not do it in one apply?

Because `aws_acm_certificate_validation` blocks until the certificate is issued,
and the certificate cannot be issued until a record exists that only a human can
add. A single-phase apply sits there until it times out, having created a
certificate you then have to find in the console.

The flag makes the wait explicit and puts the records in front of you.

## Production

Identical, with `prod.tfvars` and `environment: prod`, except that prod is
**never automatic**. Both workflows are manual for prod, and that stays true.

Prod is also the only environment without the `noindex` header, so it is the
only one a search engine will list. Set its `VITE_SITE_URL` (above) before the
first announcement, not after.

If prod is an apex domain (`example.com`, exactly two labels), read
[`dns.md`](dns.md) before starting. Apex domains cannot CNAME, and the fix is a
DNS decision, not a Terraform one.

## How a deploy works

**No canonical origin, no deploy.** A build without one still exits 0, but
every canonical, `hreflang`, `og:url` and `og:image` in it is relative, and it
has no `sitemap.xml` or `llms.txt`. So the build job settles the origin first
(`.github/scripts/resolve-site-url.sh`): the Environment's `VITE_SITE_URL`, or,
when that is unset, the distribution's CloudFront domain. A value that is not
an https origin, a lookup that errors and a missing distribution each fail
the run there, with an error annotation saying which.

Then the deploy, in this order, for a reason:

0. **Check the build carries its origin.** Its manifest must name
   `robots.txt`, `sitemap.xml` and `llms.txt`, and `robots.txt` must name an
   absolute sitemap. Otherwise the run stops before anything is uploaded:
   phase 4 deletes whatever the manifest does not name, so deploying such a
   build would also take the live `sitemap.xml` and `llms.txt` down.
1. **Upload assets, additively.** Nothing is deleted, so the old build keeps
   working for anyone mid-session. Hashed `assets/` get a one-year immutable
   cache; everything copied from `public/` under a fixed name gets one hour and
   must revalidate. Marking those immutable would keep a replaced logo off a
   returning visitor's screen for a year.
2. **Upload every page.** The build prerenders each route in each language into
   its own HTML file (`<locale>/<route>/index.html`, plus `index.html` and
   `404.html`), as `text/html; charset=utf-8` with a short cache. They are the
   only files naming the new hashes, so writing them after every asset is what
   makes the cutover safe; the root `index.html` goes last.
3. **Invalidate CloudFront, and wait for it.**
4. **Delete orphans:** files in the bucket that the new build does not contain.
   Last, after the invalidation, so nobody is served a page referencing a file
   that has just been deleted.

Two concurrent deploys to one bucket would corrupt it: the older run's cleanup
diffs S3 against its own manifest and deletes the newer run's fresh assets. The
workflow's `concurrency` group queues rather than cancels, because cancelling
mid-deploy leaves the bucket half-swapped, which is worse than waiting.

## Turning the site off

Use **CloudFront Toggle**, not destroy.

Toggling `off` disables the distribution: it stops serving and stops costing
anything per request, while the distribution, its CloudFront domain name, the
aliases and the certificate all survive. No DNS changes, and toggling back on
restores the exact same URLs.

`infra-destroy` deletes the distribution, which **releases its CloudFront domain
name**. Re-applying later produces a different one, and every DNS record has to
be recreated. Only use it when you mean it.

## Checking what a crawler sees

Every page is prerendered, so what a crawler reads is in the raw HTML, and
`curl` shows it exactly. Use it rather than the browser's inspector, which
shows the head after JavaScript has rewritten it.

```bash
SITE=https://example.com

# A page's own head: its canonical, the three hreflang alternates plus
# x-default, og:url and the share card, all absolute, on SITE's host
curl -s "$SITE/lv/about" | grep -oE '<html[^>]*>|<title>[^<]*|rel="canonical"[^>]*|hreflang="[^"]*"|og:(url|image)" content="[^"]*"'

# Structured data: Organization everywhere, WebSite on a home page,
# BreadcrumbList elsewhere, services on the services page
curl -s "$SITE/en" | grep -c 'application/ld+json'

# The page body is there without JavaScript: exactly one h1
curl -s "$SITE/en/services" | grep -o '<h1[^>]*>[^<]*'

# A URL with no page is a real 404, and says noindex
curl -s -o /dev/null -w '%{http_code}\n' "$SITE/en/no-such-page"     # 404
curl -s "$SITE/en/no-such-page" | grep -o '<meta name="robots"[^>]*>'

# Every other spelling of a page's address is a 301 to it, query string kept
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$SITE/services?utm_source=x"   # 301 .../en/services?utm_source=x
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$SITE/de/services"             # 301 .../en/services
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$SITE/en/about/index.html"     # 301 .../en/about
curl -s --path-as-is -o /dev/null -w '%{http_code} %{redirect_url}\n' "$SITE//en//about" # 301 .../en/about

# Crawler files: a Sitemap line, every page that is its own canonical, in
# every locale, and the head of llms.txt
curl -s "$SITE/robots.txt" | tail -3
curl -s "$SITE/sitemap.xml" | grep -c '<loc>'
curl -s "$SITE/llms.txt" | head -5

# Dev must say noindex; prod must not
curl -sI "$SITE/" | grep -i x-robots-tag
```

Before a deploy, the same checks run against the local build:
`make sitemap SITE_URL=https://example.com`, then `make preview`, then the
commands above with `SITE=http://localhost:4173`. The preview answers through
the same CloudFront Function file, so a 301 or a 404 there is a 301 or a 404
in production. It has no response headers policy, so the `X-Robots-Tag` check
is for the live site only.

### Share-preview checklist

Run it for every site before launch, and again after changing the card, the
logo, or the home page's copy. The build's share guard
(`scripts/verify-share.mjs`, last step of `npm run build`) already checks the
structure of every page and the files in `dist/`; this is the check of what is
actually served.

```bash
SITE=https://example.com

# 1. The page names an absolute https og:image, with a version query
IMG=$(curl -s "$SITE/en" | grep -oE 'og:image" content="[^"]*' | sed 's/.*content="//')
echo "$IMG"

# 2. The image is served as image/png (or image/jpeg), 200, and under 300 KB
#    (WhatsApp drops larger ones; aim below 200 KB)
curl -s -o /tmp/og.png -w '%{http_code} %{content_type} %{size_download} bytes\n' "$IMG"

# 3. It is 1200x630 and opaque
file /tmp/og.png    # PNG image data, 1200 x 630, 8-bit/color RGB, non-interlaced

# 4. Tab icons and manifest answer
for f in favicon.ico favicon.svg favicon-96x96.png apple-touch-icon.png site.webmanifest; do
  curl -s -o /dev/null -w "%{http_code} %{content_type} $f\n" "$SITE/$f"
done
```

Then look at it where it will be seen:

- **Facebook Sharing Debugger** (developers.facebook.com/tools/debug): paste a
  page URL, press "Scrape Again", read the warnings. Facebook's scraper is
  also what Instagram and Messenger use.
- **LinkedIn Post Inspector** (linkedin.com/post-inspector): same, and it
  refreshes LinkedIn's cache for that URL.
- **WhatsApp, iMessage, Telegram and Slack have no debugger.** Send the link to
  yourself in each. They cache a link's card for days (WhatsApp up to a week or
  more), keyed on the URL of the image, so a card changed on the same URL keeps
  showing the old one. The template names the card as
  `/og-image.png?v=<hash of its content>`: redraw the card, deploy, and the
  next link has a new image URL. A link already shared keeps its cached card;
  share a fresh one to test. Telegram's `@WebpageBot` re-scrapes a URL on request.
- **X** no longer has a card validator; the `twitter:*` tags are the same ones
  the guard checks, and the card is the same image.

If the card is blank or has no picture: the image is over 300 KB, is
not `https`, is not served as an image, or the page was shared before the card
existed (see above). A development or staging site that sends
`X-Robots-Tag: noindex` still shows cards; only indexing is blocked.

What a curl cannot tell you is whether a search engine has taken it in. Once
prod is live on its domain:

- **Google Search Console**: verify the domain (a DNS TXT record), submit
  `sitemap.xml`, and read the Pages report a few days later. URL Inspection on
  one page shows the HTML Google rendered.
- **Bing Webmaster Tools**: import the property from Search Console or verify
  it the same way, and submit the sitemap. Bing's index feeds Copilot and is
  one of the sources behind ChatGPT's search, so skipping it costs more than
  Bing's own share of searches.
