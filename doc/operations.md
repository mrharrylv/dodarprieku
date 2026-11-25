# Operations

Day-to-day running: deploying, rolling back, turning it off, and looking at what
went wrong.

## Deploying

| What | How |
| --- | --- |
| Deploy to dev | Push to `main`. Automatic, every push. |
| Deploy to prod | Actions → **Build & Deploy Website** → environment: `prod` |
| Change infrastructure | Edit the tfvars, push, then Actions → **Terraform Infrastructure** |
| Plan without applying | Same workflow, untick `apply` |

There is no paths filter on the deploy workflow, so a change to a doc rebuilds
and redeploys dev too. That is deliberate: a filter that decides what "counts"
as a code change is a filter that will one day skip a deploy you needed.

### What one deploy ships

A push to `main` (or a dispatch) runs four builds and one deploy:

| Package | Checks | Goes to |
| --- | --- | --- |
| `services/shared` | types, tests | nothing on its own: it gates the others |
| `services/api` | lint, types, tests with coverage, esbuild bundle | `aws lambda update-function-code` on `<env>-dodarprieku-api`, then a wait until it serves |
| `services/frontend/admin` | lint, types, tests with coverage, build | `admin/` in the website bucket: hashed assets immutable, `index.html` no-cache |
| `services/frontend/website` | as before | the bucket root, through `.github/actions/deploy-site` |

Plus `services/shared/data/parcel-lockers.json` to
`s3://<env>-dodarprieku-media/data/parcel-lockers.json` (one day's cache).
The website's orphan cleanup keeps `admin/` (`keep-prefixes`), and the admin
build cleans its own folder after the invalidation. The function's
configuration (environment variables, memory, role) is Terraform's, never
the deploy's.

The first admin: `make admin-invite EMAIL=<address> ENV=dev` (needs AWS
credentials: it invokes the function directly).

## Rolling back

The bucket is versioned and the build is deterministic, so the fastest rollback
is to redeploy the previous commit.

```bash
git revert <bad-sha>
git push                     # dev redeploys immediately
```

For prod, or when you need it now and the revert is messy: **Actions → Build &
Deploy Website → Run workflow**, and pick the last good tag or SHA from the
branch selector. The workflow builds from that ref and deploys it.

Note that the build is environment-specific, baking in that environment's
`VITE_*` variables, so a rollback rebuilds rather than re-uploading a stored
artifact. That is slower by a minute and correct, which is the right trade.

On a site upgraded from an older copy of the template, do not roll back past
the commit that introduced prerendering while the Terraform still has the
CloudFront Function: that older build has one `index.html` and no page files,
so every URL but the home page would answer 404.

## Turning the site off

**Actions → CloudFront Toggle → state: `off`.**

The distribution is disabled: it stops serving, and stops costing anything per
request or per gigabyte. The distribution, its CloudFront domain name, the
aliases and the ACM certificate are all preserved, so **no DNS changes are
needed** and toggling `on` restores the exact same URLs. Allow five to fifteen
minutes either way for the change to reach every edge.

`cloudfront_enabled` is passed on the command line for that run only, so the
toggle leaves no diff in the repo, and the next ordinary infra apply restores
whatever the tfvars say. If you want the site to stay off, set
`cloudfront_enabled = false` in the tfvars too.

### Not the same as destroying

`infra-destroy` deletes the distribution, which **releases its CloudFront domain
name**. Re-applying gives you a different one, and every DNS record has to be
recreated against it. It exists for tearing down an environment you are finished
with, not for taking a site offline.

It requires typing the environment name to confirm, and the confirmation is
checked in a separate job that runs before any AWS credentials are issued.

## Costs

For a small site with a custom domain, in `eu-north-1` with `PriceClass_100`:

| | Roughly |
| --- | --- |
| S3 storage + requests | cents |
| CloudFront (first 1 TB/month free tier, then ~$0.085/GB) | $0–2 |
| CloudFront Function (runs on every request, $0.10 per million) | cents |
| ACM certificate | free |
| Spike alarms (`cost_guards.tf`): SNS topic and two CloudWatch alarms | about $0.20 |
| Route 53 hosted zone, if used | $0.50 |
| Lambda + SES, if the contact add-on is installed | cents |

There is no AWS WAF (about $9 a month per site, turned off by owner decision).
Instead `cost_guards.tf` emails `alert_email` when the distribution serves
more than `alarm_requests_per_hour` requests (default 50,000) or
`alarm_gb_per_hour` GB (default 5) in one hour, and again once traffic is back
to normal. AWS sends a confirmation email on the first apply: nothing is
delivered until its link is clicked. Re-run `infrastructure/aws/setup.sh`
before that apply, since it grants the deploy role the SNS and CloudWatch
permissions. If a flood is running up the bill, set `cloudfront_enabled =
false` (see "Turning the site off").

CloudFront invalidations are free for the first 1,000 paths per month. Every
deploy invalidates `/*`, which counts as one path.

## Looking at what happened

### The deploy

Each run writes a summary (bucket, distribution, commit) to the workflow's
summary page. The four deploy phases log what they uploaded and what they
removed.

### CloudFront

Access logging is off by default. It is worth turning on only if you have a
question it will answer; otherwise it is a bucket that fills up.

```bash
DIST=$(aws cloudfront list-distributions \
  --query "DistributionList.Items[?Comment=='prod - <slug> website'].Id | [0]" \
  --output text)

aws cloudfront get-distribution --id "$DIST" \
  --query 'Distribution.{Status:Status,Enabled:DistributionConfig.Enabled,Aliases:DistributionConfig.Aliases.Items}'
```

`Status: InProgress` means a change is still propagating. Wait before concluding
anything is broken.

### The contact form, if installed

```bash
aws logs tail /aws/lambda/prod-<slug>-contact --follow --since 1h
```

The handler logs one line per delivered message (address and locale, not the
body) and the full error on a failure. Retention is 30 days.

A message that "sends" but never arrives is almost always SES: either the DKIM
records are not in DNS, or the account is still in the sandbox and can only send
to verified addresses. Check both before looking anywhere else:

```bash
aws sesv2 get-email-identity --email-identity example.com \
  --query '{verified:VerifiedForSendingStatus,dkim:DkimAttributes.Status}'
aws sesv2 get-account --query '{sandbox:ProductionAccessEnabled,sent:SentLast24Hours}'
```

## When a deploy fails

**"CloudFront distribution not found."** The infrastructure does not exist yet,
or it exists in the other environment. Run the Terraform Infrastructure workflow
for this environment first.

**"No canonical origin" on the Resolve site URL step.** The run stopped before
building, because the build would have had no origin for its canonical links,
sitemap and `llms.txt`. The message names the cause:

- `VITE_SITE_URL` on the Environment is not an https origin: `www.example.com`
  without `https://`, or a URL with a path. Set it to `https://www.example.com`
  and nothing after the host
  ([`deployment.md`](deployment.md#then-name-the-domain-as-canonical)). A
  domain with letters like ā or ī is not the problem: it is accepted as
  written (`https://kafejnīca.lv`) or in punycode
  (`https://xn--kafejnca-fjb.lv`), and the site publishes the punycode form.
  A made-up `xn--` label that is not valid punycode is refused, because the
  build would refuse it too.
- The step says `node is not on PATH`: it reads the value with Node's URL
  parser, as the build does, so it must run after **Setup Node.js** in
  `deploy.yaml`.
- The CloudFront lookup failed. The AWS error is on the line above the
  message; a throttle or a transient error clears on a re-run.
- There is no distribution for this environment yet: run the Terraform
  Infrastructure workflow for it first, as for "CloudFront distribution not
  found" above.

**"Build has no canonical origin" in Phase 0 of the deploy.** The build reached
the deploy without `sitemap.xml` or `llms.txt`, or with the committed
`robots.txt` that names no sitemap: it writes all three only when it has an
origin. Nothing was uploaded, so the live site is untouched. The Build
step's `[config]` and `[crawler-files]` lines about `VITE_SITE_URL` say why
the build could not use the origin it was given.

**"Not authorized to perform sts:AssumeRoleWithWebIdentity."** The trust policy
does not match the token's subject. Almost always because `setup.sh` ran before
the GitHub repository existed, so it could not resolve the numeric owner and
repo IDs. Re-run it now that the repo is there. The real subject is only visible
in CloudTrail, which is why the error itself says nothing useful.

**The Terraform apply fails with AccessDenied on `cloudfront:CreateFunction`.**
The role predates the CloudFront Function. Re-run `infrastructure/aws/setup.sh`
with the site's `FEATURES`, then apply again. See
[`deployment.md`](deployment.md#2-bootstrap-aws-once-per-project-needs-admin-credentials).
If the denied function is not `<env>-<slug>-rewrite`, it is a new one in
`main.tf`: the role is granted functions by exact name, so add its name to
`setup.sh` first, then re-run it.

**Every page but the home page is a 404.** The Terraform that points page URLs
at their prerendered files was applied before a build containing those files
was deployed, or a pre-prerender build was redeployed. Deploy the current
build; `aws s3 ls s3://<env>-<slug>-website/en/` should list a folder per page.

**`terraform plan` wants to destroy the OAC.** The Origin Access Control exists
in AWS but not in state, usually after a destroy that failed part-way. The
`terraform-setup` composite action adopts it automatically on the next run; if
you are running Terraform locally, do the same import by hand.

**A green deploy but the old page.** Check the invalidation actually completed
(phase 3 waits for it, so this is rare), then check you are not looking at your
own browser cache. `curl -I` is the honest test.

**A page's canonical, or a search result, names the CloudFront domain.** `VITE_SITE_URL`
is not set on that GitHub Environment, so the build took the distribution's
domain as canonical. Set it and redeploy
([`deployment.md`](deployment.md#then-name-the-domain-as-canonical)).

## Secrets

There are none in this repository, and there is no reason to add any. The
few that exist live in AWS or on the GitHub environment:

- **The session secret** (HMAC key of the `dodar_session` cookie) is
  generated by Terraform (`random_password`) into the SSM SecureString
  `/<env>/dodarprieku/session-secret`. Nobody types it. Rotating it logs
  everyone out: `terraform apply -replace=random_password.session_secret`.
- **The admin notification address** is the SSM String
  `/<env>/dodarprieku/admin-notify-email`, created as `none` (no mail).
  Terraform ignores its value afterwards, so set it by hand:
  `aws ssm put-parameter --overwrite --name /dev/dodarprieku/admin-notify-email --value <address>`.
- **The Zone.ee login and key** are environment secrets on `dev`, written
  only by `~/Dev/Unveil/scripts/zone-secrets.sh dev mrharrylv/dodarprieku`
  ([`dns.md`](dns.md)).

- AWS access is GitHub OIDC only, through `github-oidc-<slug>-dev` and `-prod`.
  There are no static AWS keys anywhere.
- `VITE_*` values are **public**: Vite inlines them into the bundle that ships
  to every visitor. They belong in GitHub Actions *variables* on the environment,
  not in secrets. Marking a public URL as a secret gains nothing and only makes
  it harder to see what is deployed.
- `.env.local` is gitignored and must stay uncommitted regardless.

If a credential ever does become necessary (a third-party API key used
server-side), it belongs in the Lambda's environment or in Secrets Manager, and
never in a `VITE_` variable.
