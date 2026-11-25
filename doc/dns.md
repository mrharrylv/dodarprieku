# DNS

Which records, exactly, and the two things that reliably go wrong.

The Terraform Infrastructure workflow prints the complete list for your
configuration in its run summary. This document explains what those records are
for, and what to do when the domain is an apex.

## Dev, and any zone at Zone.ee: Terraform creates the records

Dev is always `<site>.hagroup.lv`, in the `hagroup.lv` zone at Zone.ee.
`dev.tfvars` says so:

```hcl
domain_name          = "<site>.hagroup.lv"
zone_dns_zone        = "hagroup.lv"
enable_custom_domain = true
```

With `zone_dns_zone` set, `infrastructure/terraform/zone_dns.tf` creates every
record for a host inside that zone through the Zone.ee API, in the same apply:
the ACM validation CNAME first, so the certificate can issue while Terraform
waits for it, then the CloudFront CNAME. One infra run takes the site from
nothing to `https://<site>.hagroup.lv`. There is no phase 1 and nothing to
copy into My Zone.

What it needs, once per environment: the GitHub **environment** secrets
`ZONE_USERNAME` (the ZoneID login) and `ZONE_API_KEY` (My Zone, your name,
Account settings, Security, API keys) on `dev`, never repository secrets.
They are set in exactly one way, from the Mac's Keychain item `zone.eu-api`,
by the script every HA Group repository uses (`infrastructure/bootstrap.sh`
calls it, and stops if it is missing):

```bash
security add-generic-password -U -s zone.eu-api -a '<ZoneID username>' -w
# asks for the key, so it never lands in the shell history

~/Dev/Unveil/scripts/zone-secrets.sh dev mrharrylv/dodarprieku
gh secret list --env dev --repo mrharrylv/dodarprieku   # both names, today's date
```

Never `gh secret set` them by hand: the script cleans the typographic quotes
the Keychain account is known to carry. The job that writes DNS runs in the
`dev` environment, maps both secrets explicitly and fails in its first seconds
(`.github/scripts/check-zone-secrets.sh`) when either is empty. In a run log
the step's `env:` block must show `ZONE_USERNAME: ***`; a blank value means
nothing was written at Zone.ee, whatever the tick says.

### Dodar prieku: two hosts on one distribution

`dev.tfvars` lists the admin portal as an alias, so the one certificate covers
both names and Terraform creates four records at Zone.ee in the same apply:

| Host | Record | Value | Created by |
| --- | --- | --- | --- |
| `dodarprieku.hagroup.lv` | CNAME (ACM validation) | `_<hash>.acm-validations.aws.` | `terraform_data.zone_dns_acm_validation["dodarprieku.hagroup.lv"]` |
| `admin.dodarprieku.hagroup.lv` | CNAME (ACM validation) | `_<hash>.acm-validations.aws.` | `terraform_data.zone_dns_acm_validation["admin.dodarprieku.hagroup.lv"]` |
| `dodarprieku.hagroup.lv` | CNAME | `<dist>.cloudfront.net` | `terraform_data.zone_dns_site["dodarprieku.hagroup.lv"]` |
| `admin.dodarprieku.hagroup.lv` | CNAME | `<dist>.cloudfront.net` | `terraform_data.zone_dns_site["admin.dodarprieku.hagroup.lv"]` |

The validation names are `_<hash>.<host>`; the run's `dns_records_required`
output prints the exact values. Check them at the zone's own nameserver:

```bash
dig @ns.zone.eu +short dodarprieku.hagroup.lv CNAME
dig @ns.zone.eu +short admin.dodarprieku.hagroup.lv CNAME
```

Adding or removing a host edits the certificate's names, which replaces it:
the new validation records are created before the old certificate goes.

How it behaves:

- **Idempotent.** A record that already points at the right value is left
  alone; one that points elsewhere is updated in place; a missing one is
  created. Re-running the workflow is always safe.
- **Destroy deletes them.** `infra-destroy` removes the records it created.
  Without the secrets the destroy still completes and warns that the records
  were left behind.
- **Edits in My Zone are not seen.** Terraform remembers what it created, not
  what is at Zone.ee now. If someone deletes a record by hand, re-run with
  `-replace='terraform_data.zone_dns_site["<host>"]'` (or the
  `zone_dns_acm_validation` one), or run the script yourself:
  `ZONE_DNS_ZONE=hagroup.lv RECORD_TYPE=cname RECORD_NAME=<host> RECORD_VALUE=<dist>.cloudfront.net .github/scripts/zone-dns.sh upsert`.
- **Never the apex.** Zone.ee has no ALIAS record, so a bare `example.com`
  cannot point at CloudFront (see below). Hosts outside the zone are skipped
  too; the workflow still prints their rows.
- **One key reaches every zone in the ZoneID.** For prod, set `zone_dns_zone`
  only when the customer's domain is in that account.

Everything below is for a zone Terraform does not manage: prod at another
provider, or a domain in someone else's account.

## The records

For `example.com` with `www`, four records in total.

### ACM validation: add these first

One per hostname on the certificate. ACM issues nothing until it can see them.

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `_a1b2c3….example.com.` | `_x9y8z7….acm-validations.aws.` | 300 |
| CNAME | `_d4e5f6….www.example.com.` | `_p6q5r4….acm-validations.aws.` | 300 |

The real values come from the workflow output. They are unique per certificate
and cannot be guessed.

**Leave these in place forever.** ACM re-validates on renewal, and a certificate
whose validation record has been tidied away silently fails to renew. You find
out thirteen months later, when the site stops serving HTTPS.

### Site records: add these in phase 2

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| CNAME | `www.example.com.` | `d111111abcdef8.cloudfront.net.` | 300 |
| ?     | `example.com.` | see below | 300 |

## The apex problem

A hostname with exactly two labels (`example.com`) is the zone apex, and
**RFC 1034 forbids a CNAME at the apex**. The apex must carry SOA and NS
records, and a CNAME cannot coexist with any other record at the same name.

CloudFront gives you a hostname, not an IP address, and its IPs change without
notice, so a plain `A` record is not an option either. Something has to bridge
the two. There are three ways, and they are ranked.

### Option A: Route 53 (the clean one)

Route 53's ALIAS record is an `A` record that resolves to a hostname internally.
It is not a CNAME, so the apex restriction does not apply.

1. Create a public hosted zone for `example.com`.
2. Point the registrar's nameservers at the four Route 53 nameservers.
3. `A` (ALIAS) `example.com` → the CloudFront distribution.
4. `CNAME` `www.example.com` → `d111111abcdef8.cloudfront.net`.

Both hosts hit CloudFront directly, with no redirect hop. Costs about $0.50 a
month per zone.

### Option B: an ALIAS/ANAME at your existing provider

Several providers implement the same idea under their own name: ALIAS, ANAME,
CNAME flattening. Cloudflare, DNSimple, easyDNS and others have it. If yours
does, use it and skip the migration.

### Option C: redirect the apex to www

For providers with no ALIAS support at all (zone.eu among them):

1. `CNAME` `www.example.com` → the CloudFront domain.
2. A provider-side **URL forward (301)** from `example.com` to
   `https://www.example.com`.

Visitors typing the bare domain land on `www` after one redirect. Keep the apex
in `domain_aliases` and on the certificate regardless. It costs nothing, and the
moment an ALIAS-capable record becomes available the apex starts working with no
Terraform change at all.

The cost is one extra round-trip for anyone typing the bare domain, and a
slightly weaker link profile if people link to the apex. Neither is fatal.

**Whichever option you choose, pick one canonical host and stick to it.**
Set `VITE_SITE_URL` on the GitHub Environment to that host
([`deployment.md`](deployment.md#then-name-the-domain-as-canonical)). Every
canonical link, `hreflang` alternate, `og:url`, and the sitemap and `llms.txt`
the build writes, come from that one value, so they cannot disagree with each
other; they can only all be wrong together. With it unset, they all name the
CloudFront domain.

## When validation will not complete

Nearly always one of two things.

**A doubled zone name.** Most DNS interfaces append the zone to whatever you
type, so pasting the full `_a1b2c3.example.com` into the name field produces
`_a1b2c3.example.com.example.com`. Check what the interface displays after
saving, not what you typed.

```bash
dig +short CNAME _a1b2c3.example.com
# expect the acm-validations value; empty means the record is not where you think
```

**A trailing dot the provider did not want.** The workflow prints fully
qualified names with a trailing dot, because that is unambiguous. Most web
interfaces strip it; a few reject the record outright. Drop it if yours
complains.

Third possibility, less common: the certificate was replaced. Editing
`domain_aliases` forces a **new** certificate with **new** validation records.
The old ones are now meaningless. Re-read the workflow output rather than
trusting a note you made last week.

## Verifying

```bash
# Certificate: must say ISSUED before enable_custom_domain = true
aws acm list-certificates --region us-east-1 \
  --query "CertificateSummaryList[?DomainName=='example.com'].[DomainName,Status]" \
  --output text

# Records: from a public resolver, not your own cache
dig @1.1.1.1 +short CNAME www.example.com
dig @1.1.1.1 +short A example.com

# End to end
curl -I https://www.example.com     # expect HTTP/2 200
curl -I https://example.com         # 200, or 301 to www under Option C
```

Propagation is usually minutes. It can be up to the TTL of whatever was there
before, which is why the records here use 300 seconds. Set a long TTL and a
mistake takes hours to correct rather than five minutes.

## A note on subdomains

None of this applies to a subdomain. `dev.example.com` or `staging.example.com`
is not an apex, so it can always hold a CNAME, at any provider.

That is why dev is a subdomain, `<site>.hagroup.lv`: it exercises the entire
custom-domain path end to end without any of the apex complications.
