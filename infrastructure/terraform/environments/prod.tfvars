# PROD environment: dodarprieku
#
# Written by bin/init-site.sh. Edit freely afterwards.

environment     = "prod"
region          = "eu-north-1"
resource_prefix = "prod"

# Domain
# ------
# Set to the real hostname, with the www host in domain_aliases so both are on
# the certificate and on the distribution.
#
# An APEX domain (example.com: exactly two labels) cannot CNAME to CloudFront
# unless the DNS provider supports ALIAS/ANAME records. Two ways to close that:
#
#   Option A: stay at the current provider, no migration:
#     * CNAME  www.example.com -> <dist>.cloudfront.net
#     * a provider-side URL forward (301) example.com -> https://www.example.com
#     Visitors typing the bare domain land on www. The apex stays listed as a
#     CloudFront alias and on the certificate, so it starts working the moment
#     an ALIAS-capable record becomes available.
#
#   Option B: move the zone to Route 53:
#     * create a public hosted zone and repoint the registrar's nameservers
#     * A (ALIAS) example.com -> the CloudFront distribution
#     * CNAME    www.example.com -> <dist>.cloudfront.net
#     Both hosts hit CloudFront directly, no redirect hop.
#
# Either way both names are on the certificate and on the distribution, so this
# is a DNS decision only, no Terraform change is needed to switch later.
domain_name    = ""
domain_aliases = []

# Set to the zone when the customer's domain is in Harry's Zone.ee account
# (ZoneID): Terraform then creates the www and validation CNAMEs itself, and
# enable_custom_domain can be true from the start. The apex redirect to www is
# still a one-off in My Zone. Empty: add the printed records by hand.
zone_dns_zone = ""

# Two-phase rollout: see doc/dns.md
# Starts at phase 1. Flip to true only after every validation CNAME is in place
# and the certificate shows ISSUED.
enable_custom_domain = false

cloudfront_price_class = "PriceClass_100"

owner   = "mrharrylv"
project = "dodarprieku"

# Cost guards (cost_guards.tf): hourly request and bandwidth spike alarms go to
# this address. Empty turns them off. No WAF, by owner decision (cost).
alert_email = "harijs.asenieks@gmail.com"
