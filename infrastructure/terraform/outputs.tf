# =============================================================================
# S3
# =============================================================================

output "s3_bucket_name" {
  description = "S3 bucket holding the built site"
  value       = aws_s3_bucket.website.id
}

output "s3_bucket_arn" {
  description = "S3 bucket ARN"
  value       = aws_s3_bucket.website.arn
}

# =============================================================================
# CloudFront
# =============================================================================

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (used for cache invalidation)"
  value       = aws_cloudfront_distribution.website.id
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name: the CNAME target"
  value       = aws_cloudfront_distribution.website.domain_name
}

output "cloudfront_arn" {
  description = "CloudFront distribution ARN"
  value       = aws_cloudfront_distribution.website.arn
}

output "cloudfront_aliases" {
  description = "Hostnames currently attached to the distribution (empty in phase 1)"
  value       = aws_cloudfront_distribution.website.aliases
}

# =============================================================================
# ACM (only when domain_name is set)
# =============================================================================

output "acm_certificate_arn" {
  description = "ACM certificate ARN"
  value       = var.domain_name != "" ? aws_acm_certificate.website[0].arn : null
}

output "acm_certificate_domains" {
  description = "Every hostname the certificate covers"
  value       = local.domain_hosts
}

# =============================================================================
# Environment
# =============================================================================

output "environment" {
  description = "Current environment"
  value       = var.environment
}

output "project" {
  description = "Project slug"
  value       = var.project
}

output "domain_name" {
  description = "Configured primary domain (empty when serving from the CloudFront URL)"
  value       = var.domain_name
}

output "website_url" {
  description = "Where the site can be reached"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.website.domain_name}"
}

output "custom_domain_phase" {
  description = "Where this apply sits in the two-phase custom-domain rollout"
  value = (
    var.domain_name == "" ? "no_custom_domain" :
    var.enable_custom_domain ? "phase_2_alias_attached" :
    "phase_1_cert_only"
  )
}

# =============================================================================
# Consolidated DNS records
# =============================================================================
# One copy-pasteable list of every record that must exist at the DNS provider.
# Empty when no custom domain is configured.
#
# A hostname with exactly two labels (example.com) is the zone apex. Providers
# without an ALIAS/ANAME record type cannot CNAME an apex, so the purpose column
# says so rather than printing a record that cannot be created. See doc/dns.md.

output "dns_records_required" {
  description = "All DNS records to create at the DNS provider for the custom domains to work"
  value = var.domain_name != "" ? concat(
    [
      for dvo in aws_acm_certificate.website[0].domain_validation_options : {
        purpose = "ACM validation for ${dvo.domain_name} (add BEFORE re-applying with enable_custom_domain=true)"
        type    = dvo.resource_record_type
        name    = dvo.resource_record_name
        value   = dvo.resource_record_value
        ttl     = 300
      }
    ],
    [
      for host in local.domain_hosts : {
        purpose = length(split(".", host)) == 2 ? "APEX alias -> CloudFront (needs ALIAS/ANAME support, or a redirect: see doc/dns.md)" : "Site alias -> CloudFront distribution"
        type    = "CNAME"
        name    = "${host}."
        value   = "${aws_cloudfront_distribution.website.domain_name}."
        ttl     = 300
      }
    ]
  ) : []
}

output "zone_dns_managed" {
  description = "Hostnames whose DNS records Terraform creates at Zone.ee (zone_dns.tf); empty when zone_dns_zone is unset"
  value       = local.zone_dns_hosts
}

# =============================================================================
# Dodar prieku API, data and media (api.tf, app_data.tf)
# =============================================================================
# Read by the Build & Deploy workflow and `make admin-invite`; the names also
# follow <prefix>-<project>-{api,data,media}, which is what they fall back to.

output "api_function_name" {
  description = "The API Lambda (deploys update its code; admin-invite invokes it)"
  value       = aws_lambda_function.api.function_name
}

output "api_endpoint" {
  description = "The HTTP API's own endpoint. The site reaches it through CloudFront at /api/*."
  value       = aws_apigatewayv2_api.api.api_endpoint
}

output "dynamodb_table_name" {
  description = "The single data table"
  value       = aws_dynamodb_table.data.name
}

output "media_bucket_name" {
  description = "Photos, logos (media/*) and the public snapshot (data/*)"
  value       = aws_s3_bucket.media.id
}

output "admin_url" {
  description = "Where the admin portal answers"
  value       = local.admin_origin != "" ? local.admin_origin : "https://${aws_cloudfront_distribution.website.domain_name}/admin/"
}

output "admin_notify_email_parameter" {
  description = "SSM parameter to set to the address that hears of new applications (\"none\" = off)"
  value       = aws_ssm_parameter.admin_notify_email.name
}
