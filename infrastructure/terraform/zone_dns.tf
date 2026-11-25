# =============================================================================
# DNS records at Zone.ee, created by Terraform
# =============================================================================
#
# When zone_dns_zone is set (dev: "hagroup.lv"), every record the site needs
# that falls inside that zone is created through the Zone.ee API during the
# apply: the ACM validation CNAMEs before Terraform waits for the certificate,
# and the CloudFront CNAMEs once the alias is attached. One apply takes a new
# site from nothing to https://<site>.hagroup.lv, with no records to copy by
# hand and no second run.
#
# The API is called by .github/scripts/zone-dns.sh, which reads ZONE_USERNAME
# and ZONE_API_KEY from the environment (GitHub Actions secrets in CI). No
# Terraform provider for Zone.ee exists, so terraform_data runs the script:
# changing a value re-runs it, destroying the resource deletes the record.
#
# Limits: Terraform does not see a record someone edits or deletes in My Zone.
# Re-run with -replace on the matching terraform_data, or let the next value
# change repair it. The zone apex is never handled here (see doc/dns.md).

locals {
  zone_dns_zone = lower(trimsuffix(var.zone_dns_zone, "."))

  # Hosts inside the zone, apex excluded: Zone.ee cannot CNAME the apex.
  zone_dns_hosts = local.zone_dns_zone == "" ? [] : [
    for host in local.domain_hosts : host
    if endswith(lower(host), ".${local.zone_dns_zone}")
  ]

  # Keyed by host name, which is known at plan time even before ACM has made
  # the certificate and its validation records.
  zone_dns_validation_hosts = var.domain_name == "" ? toset([]) : toset(local.zone_dns_hosts)

  # The certificate's validation record per host name.
  zone_dns_dvo = var.domain_name == "" ? {} : {
    for dvo in aws_acm_certificate.website[0].domain_validation_options : dvo.domain_name => dvo
  }

  zone_dns_script = abspath("${path.module}/../../.github/scripts/zone-dns.sh")
}

resource "terraform_data" "zone_dns_acm_validation" {
  for_each = local.zone_dns_validation_hosts

  input = {
    zone   = local.zone_dns_zone
    type   = lower(local.zone_dns_dvo[each.key].resource_record_type)
    name   = local.zone_dns_dvo[each.key].resource_record_name
    value  = local.zone_dns_dvo[each.key].resource_record_value
    script = local.zone_dns_script
  }
  triggers_replace = [
    local.zone_dns_zone,
    local.zone_dns_dvo[each.key].resource_record_name,
    local.zone_dns_dvo[each.key].resource_record_value,
  ]

  provisioner "local-exec" {
    command = "bash \"${self.input.script}\" upsert"
    environment = {
      ZONE_DNS_ZONE = self.input.zone
      RECORD_TYPE   = self.input.type
      RECORD_NAME   = self.input.name
      RECORD_VALUE  = self.input.value
    }
  }

  # ACM re-validates on renewal, so the validation record goes only when the
  # certificate itself goes. A destroy run without the Zone.ee secrets warns
  # and leaves the record behind rather than blocking the teardown.
  provisioner "local-exec" {
    when       = destroy
    on_failure = continue
    command    = "bash \"${self.input.script}\" delete"
    environment = {
      ZONE_DNS_ZONE = self.input.zone
      RECORD_TYPE   = self.input.type
      RECORD_NAME   = self.input.name
    }
  }
}

resource "terraform_data" "zone_dns_site" {
  for_each = local.custom_domain_active ? toset(local.zone_dns_hosts) : toset([])

  input = {
    zone   = local.zone_dns_zone
    name   = each.value
    value  = aws_cloudfront_distribution.website.domain_name
    script = local.zone_dns_script
  }
  triggers_replace = [local.zone_dns_zone, each.value, aws_cloudfront_distribution.website.domain_name]

  provisioner "local-exec" {
    command = "bash \"${self.input.script}\" upsert"
    environment = {
      ZONE_DNS_ZONE = self.input.zone
      RECORD_TYPE   = "cname"
      RECORD_NAME   = self.input.name
      RECORD_VALUE  = self.input.value
    }
  }

  provisioner "local-exec" {
    when       = destroy
    on_failure = continue
    command    = "bash \"${self.input.script}\" delete"
    environment = {
      ZONE_DNS_ZONE = self.input.zone
      RECORD_TYPE   = "cname"
      RECORD_NAME   = self.input.name
    }
  }
}
