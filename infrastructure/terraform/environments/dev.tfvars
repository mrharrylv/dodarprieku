# DEV environment: dodarprieku
#
# Written by bin/init-site.sh. Edit freely afterwards.

environment     = "dev"
region          = "eu-north-1"
resource_prefix = "dev"

# Domain
# ------
# Dev is ALWAYS <site>.hagroup.lv (Harry, 2026-11-06), in the hagroup.lv zone
# at Zone.ee. Terraform creates its ACM validation CNAME and its CloudFront
# CNAME there itself (zone_dns.tf), so one infra run takes dev from nothing to
# https://<site>.hagroup.lv. Needs the ZONE_USERNAME and ZONE_API_KEY
# GitHub ENVIRONMENT secrets on dev (doc/dns.md).
#
# admin.<domain> is the admin portal: the same distribution, on the same
# certificate, with its records created at Zone.ee the same way.
domain_name    = "dodarprieku.hagroup.lv"
domain_aliases = ["admin.dodarprieku.hagroup.lv"]
zone_dns_zone  = "hagroup.lv"

# true from the first run: the records are created in the same apply, before
# Terraform waits for the certificate. See doc/dns.md for the manual two-phase
# rollout used when a zone is not automated.
enable_custom_domain = true

cloudfront_price_class = "PriceClass_100"

owner   = "mrharrylv"
project = "dodarprieku"

# Cost guards (cost_guards.tf): hourly request and bandwidth spike alarms go to
# this address. Empty turns them off. No WAF, by owner decision (cost).
alert_email = "harijs.asenieks@gmail.com"

# No embedded frames: the template's Google map is not on this site.
frame_origins = []

# Google Analytics in the CSP (csp.tf). Prod only, together with the prod
# Environment's VITE_GA_MEASUREMENT_ID variable.
ga_enabled = false
