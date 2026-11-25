---
name: deploy-dev
description: Phase 4 of the do-this process. Put a site made from HA Group's WEBSITE_TEMPLATE online in AWS dev at https://<slug>.hagroup.lv, DNS included, and register it in the CRM. Use when Harry says "deploy to dev", "deploy it to AWS dev" or "put it online" for a project folder. Never before he says so.
---

# Deploy to dev

"Deploy to dev" is one command, run on Harry's Mac from the project folder:

```bash
./infrastructure/bootstrap.sh --yes
```

It is idempotent: re-running skips what exists. In order it

1. uses the attached `origin` (or creates a private GitHub repo and attaches it);
2. runs `infrastructure/aws/setup.sh` with the Mac's admin AWS credentials:
   the shared state bucket, the OIDC provider, the roles
   `github-oidc-<slug>-dev` and `-prod` trusting that repository, plus the
   Lambda/SES or DynamoDB grants when `contact.tf` or `consent.tf` is present;
3. pushes `main` (an empty `[skip ci]` commit when `main` is not on origin
   yet) and sets the repo secrets `ZONE_USERNAME` and `ZONE_API_KEY` from the
   Mac's Keychain item `zone.eu-api`;
4. runs the **Terraform Infrastructure** workflow for dev with `apply=true` and
   waits: bucket, CloudFront, certificate, cost alarms, and the DNS records at
   Zone.ee (`zone_dns.tf`: the ACM validation CNAME, then the
   `<slug>.hagroup.lv` CNAME), then sets `VITE_SITE_URL` on the dev Environment;
5. runs **Build & Deploy** for dev and waits;
6. prints `https://<slug>.hagroup.lv` and the run links.

About ten to fifteen minutes. Prod is never touched: it stays a manual
`workflow_dispatch` (`doc/deployment.md`).

## Before running it

- Harry said "deploy to dev" for this site in this conversation. Phases 1 to 3
  of `do-this` are done: the Phase 3 report went out and he answered it.
- The workflow triggers are enabled: no `#@site ` or `@template-guard` left in
  `.github/workflows/` (`init-site.sh` does this; bootstrap refuses otherwise).
- The folder is a template copy: `infrastructure/bootstrap.sh`,
  `.github/workflows/infra.yaml` and `infrastructure/terraform/zone_dns.tf`
  exist. An older site without `zone_dns.tf` first gets the Zone.ee kit
  (`doc/dns.md`, and the shared copy in the project files, `zone-dns/`).
- `infrastructure/terraform/environments/dev.tfvars` says
  `domain_name = "<slug>.hagroup.lv"`, `zone_dns_zone = "hagroup.lv"` and
  `enable_custom_domain = true`. Dev is always `<slug>.hagroup.lv` (Harry,
  2026-11-06); `init-site.sh` writes this, so fix it only if someone changed it.
- `make verify` is green and the tree is clean on `main`; bootstrap refuses a
  dirty tree. Commit straight to `main` first (Harry: no branches, no PRs).
- `origin`, if attached, is the GitHub repository. A bundle path as origin
  makes bootstrap stop with the `git remote set-url` line to run.
- The Mac has `gh` logged in, admin AWS credentials for account
  `561341419749` as the default profile, and the Keychain item `zone.eu-api`
  (ZoneID login as account, API key as password). Harry types that one himself,
  once per Mac: `security add-generic-password -U -s zone.eu-api -a '<ZoneID login>' -w`.

## Where to run it

- In a session on the Mac, in the project folder: run it directly.
- From a cloud session: start a Remote Control session on `~/Dev/HAGroup` with
  the instruction to run `cd ~/Dev/HAGroup/<slug> && ./infrastructure/bootstrap.sh --yes`
  and report the "Live" section and both run links. The allow rules in
  `.claude/settings.json` (the template's, copied into every project, and
  `~/Dev/HAGroup/.claude/settings.json`) pre-approve that command and the `gh`,
  `aws` read and `git` commands around it. Avoid env-prefixed forms such as
  `PROJECT=x ./setup.sh`: the rules match command prefixes, and that shape was
  refused on 2026-11-06.
- If the Mac's safety check still refuses, give Harry the one command to paste
  and carry on from its output. Re-running bootstrap is safe.
- Never run `setup.sh` from the cloud container: it has no admin credentials,
  by design.

## When a step fails

| Symptom | Cause and fix |
| --- | --- |
| Preflight: "aws credentials are for account …" or "no credentials" | Wrong or missing AWS profile on the Mac. Harry: `aws sso login` or `aws configure`, then re-run. |
| Step 2: `AccessDenied` on `iam:` | The credentials are not admin. Harry runs `./infrastructure/bootstrap.sh --yes` with his admin profile. |
| Step 3b: "No Zone.ee key found" | Keychain item missing and the repo has no secrets yet. Harry types the `security add-generic-password` line above, then re-runs. (A repo that already has both secrets passes this step with a warning.) |
| Infra run stops at "Zone.ee secrets missing" | `zone_dns_zone` is set but the repo has no secrets. Re-run bootstrap (step 3b sets them), or on the Mac: `gh secret set ZONE_USERNAME --repo mrharrylv/<repo> --body '<ZoneID login>'` and `security find-generic-password -s zone.eu-api -w \| tr -d '\n' \| gh secret set ZONE_API_KEY --repo mrharrylv/<repo>`. |
| Infra run: "Zone.ee refused the credentials (401)" | Key wrong or expired. Harry makes a new key in My Zone (Account settings, Security, API keys), updates the Keychain item, then the two secrets. |
| Infra run waits on the certificate for more than 15 minutes | The validation CNAME is not resolving. `dig +short CNAME _<hash>.<slug>.hagroup.lv` (the name is in the run log under `dns_records_required`). If Zone.ee shows no record, re-run the infra workflow; the script creates what is missing. |
| Deploy run: "No canonical origin" | `VITE_SITE_URL` on the dev Environment is not an https origin. `gh variable set VITE_SITE_URL --env dev --repo mrharrylv/<repo> --body https://<slug>.hagroup.lv`, re-run the deploy workflow. |
| A deploy run that started from the push in step 3 fails before step 4 | Expected: no bucket yet. Ignore it; step 5 runs the real one. |
| `AssumeRoleWithWebIdentity` denied in a workflow | The roles trust another repository than the one running. `gh repo view` to confirm the name, then re-run bootstrap: setup.sh rewrites the trust policy for the attached origin. |

## After it finishes

- **Register the site in the CRM** so its visits reach the lead's page
  (`ha-agent` SPEC 3.9: the collector only accepts hosts in the `sites` table):

  ```bash
  cd ~/Dev/HAGroup/ha-agent/scripts && python3 -I register_site.py https://<slug>.hagroup.lv --lead <COUNTRY>/<REGCODE>
  ```

  `COUNTRY/REGCODE` is the lead found in `do-this` 1.2 (in the site's
  `doc/source-content.md`). No lead in the CRM: register without `--lead` and
  say so in the report. Re-running updates the row. `--list` shows every site.
  Do not commit in `ha-agent` (its rules); the database is not tracked.
- Tell Harry the link to send carries a ref: `https://<slug>.hagroup.lv/?ref=offer-<yyyy-mm>`.
  The CRM shows that open on the lead once `crm.hagroup.lv/api/track` is live;
  until then page views are dropped silently (SPEC 3.9, gap 2).
- Report `https://<slug>.hagroup.lv`, the infra run link and the deploy run link.
- Verify: `curl -I https://<slug>.hagroup.lv` answers 200; `dig +short CNAME <slug>.hagroup.lv` answers `d….cloudfront.net.`. DNS can take a few minutes.
- The first apply makes AWS send a subscription confirmation email for the cost
  alarms to the alert address; Harry must click it, or no alarm is delivered.
- Dev sends `X-Robots-Tag: noindex, nofollow` on purpose; it is not indexed.
- From now on every push to `main` deploys dev. A Terraform change needs the
  infra workflow run by hand: `gh workflow run infra.yaml -f environment=dev -f apply=true`.
