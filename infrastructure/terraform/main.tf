terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    # The API's session secret (app_data.tf).
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    # The API's first code upload (api.tf).
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }

  # Partial backend: the state key is supplied at init time so one configuration
  # serves both environments.
  #   terraform init -backend-config="key=dodarprieku/dev/terraform.tfstate"
  #   terraform init -backend-config="key=dodarprieku/prod/terraform.tfstate"
  #
  # The bucket is shared with the other projects in this account; the key prefix
  # is what keeps this project's state separate, and the IAM role created by
  # infrastructure/aws/setup.sh can only reach keys under that prefix.
  backend "s3" {
    bucket = "ha-terraform-state-561341419749"
    region = "eu-north-1"

    # Terraform enumerates workspaces by listing workspace_key_prefix on every
    # `init`. The default prefix ("env:") sits outside this project's allowed
    # prefix, so init would fail with AccessDenied on ListBucket before reading
    # any state. Moving the prefix under the project keeps the role's isolation
    # absolute instead of widening it to the whole bucket.
    workspace_key_prefix = "dodarprieku/workspaces"

    encrypt = true
  }
}

provider "aws" {
  region = var.region
}

# CloudFront can only use an ACM certificate issued in us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

data "aws_caller_identity" "current" {}

# =============================================================================
# Local Values
# =============================================================================

locals {
  name_prefix = var.resource_prefix

  tags = {
    Environment = var.environment
    Owner       = var.owner
    ManagedBy   = "Terraform"
    Project     = var.project
  }

  bucket_name = "${local.name_prefix}-${var.project}-website"

  # Every hostname the site must answer on: the primary domain first, then the
  # extra hosts. distinct() keeps CloudFront from receiving a duplicate alias if
  # someone repeats domain_name inside domain_aliases.
  domain_hosts = var.domain_name != "" ? distinct(concat([var.domain_name], var.domain_aliases)) : []

  # ACM rejects a subject alternative name that repeats the certificate's own
  # domain_name, so the SAN list is the extra hosts only.
  certificate_sans = [for host in local.domain_hosts : host if host != var.domain_name]

  # CloudFront's managed policies: fixed IDs, the same in every account.
  managed_cache_policy_disabled          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
  managed_cache_policy_optimized         = "658327ea-f89d-4fab-a63d-7e88639e58f6" # CachingOptimized
  managed_origin_request_all_except_host = "b689b0a8-53d0-40ab-baf2-68738e2966ac" # AllViewerExceptHostHeader

  media_origin_id = "S3-${local.name_prefix}-${var.project}-media"
  api_origin_id   = "API-${local.name_prefix}-${var.project}"

  # Phase 2 of the rollout: the alias list and the validated certificate are
  # attached to CloudFront together, never one without the other.
  custom_domain_active = var.domain_name != "" && var.enable_custom_domain
}

# =============================================================================
# S3 Bucket (CloudFront origin, never public)
# =============================================================================

resource "aws_s3_bucket" "website" {
  bucket = local.bucket_name

  # Versioning is enabled below, so a plain destroy fails with BucketNotEmpty
  # because object versions and delete markers remain. force_destroy purges all
  # versions before deleting the bucket.
  force_destroy = true

  tags = merge(local.tags, {
    Name = local.bucket_name
  })
}

resource "aws_s3_bucket_versioning" "website" {
  bucket = aws_s3_bucket.website.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# During a zero-downtime deploy the old hashed assets coexist with the new ones
# for a while. This expires the orphaned noncurrent versions as a safety net.
resource "aws_s3_bucket_lifecycle_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 7
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Only CloudFront's Origin Access Control may read the bucket.
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      }
    ]
  })
}

# =============================================================================
# ACM Certificate (us-east-1: a CloudFront requirement)
# =============================================================================

resource "aws_acm_certificate" "website" {
  count    = var.domain_name != "" ? 1 : 0
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = local.certificate_sans
  validation_method         = "DNS"

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-${var.project}-acm-cert"
  })

  # Editing subject_alternative_names forces a replacement certificate.
  # create_before_destroy issues and attaches the new certificate before the old
  # one is deleted, so CloudFront is never left referencing a destroyed cert and
  # the site keeps serving HTTPS throughout the change.
  lifecycle {
    create_before_destroy = true
  }
}

# Polls until the certificate reaches ISSUED. The validation records are
# created at Zone.ee in the same apply when zone_dns_zone covers the host
# (zone_dns.tf); for any other zone they are added by hand at the DNS provider,
# and the infra workflow prints them.
resource "aws_acm_certificate_validation" "website" {
  count    = local.custom_domain_active ? 1 : 0
  provider = aws.us_east_1

  certificate_arn = aws_acm_certificate.website[0].arn

  # distinct(): two hosts on one certificate can share a validation record (an
  # apex and its wildcard do), and ACM refuses a duplicated FQDN.
  validation_record_fqdns = distinct([
    for dvo in aws_acm_certificate.website[0].domain_validation_options : dvo.resource_record_name
  ])

  depends_on = [terraform_data.zone_dns_acm_validation]

  lifecycle {
    create_before_destroy = true
  }
}

# =============================================================================
# CloudFront
# =============================================================================

resource "aws_cloudfront_origin_access_control" "website" {
  name                              = "${local.name_prefix}-${var.project}-oac"
  description                       = "OAC for ${var.environment} ${var.project} S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# Two jobs before the cache is asked. Every other spelling of a page's address
# (/en/about/, /en/about/index.html, //en//about, and /services or
# /de/services, which name no published language) gets a 301 to the page's
# one address, kept by browsers for an hour (Cache-Control: public,
# max-age=3600) rather than for ever, since the redirects follow the language
# list. A page's address is then mapped to its prerendered file:
# /lv/about is the object lv/about/index.html. The build writes one HTML file
# per route per language (services/frontend/website/scripts/prerender.mjs),
# and an S3 origin behind OAC has no directory indexes, so without this every
# page but the home page would be a missing key. The logic and its tests:
# functions/viewer-request.js.
resource "aws_cloudfront_function" "rewrite" {
  name    = "${local.name_prefix}-${var.project}-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "One address per page, mapped to its prerendered index.html (${var.environment} ${var.project})"
  publish = true
  code    = file("${path.module}/functions/viewer-request.js")
}

# Security headers applied at the edge. A static bucket origin cannot set
# response headers itself, so without this the site ships no HSTS, no
# clickjacking defence and no MIME-sniffing defence.
#
# The CSP is deliberately strict: everything is same-origin except the map's
# tiles and address search, and Google Analytics in prod (csp.tf). Adding an
# embed means widening it there in the same commit: see doc/operations.md.
resource "aws_cloudfront_response_headers_policy" "website" {
  name    = "${local.name_prefix}-${var.project}-security-headers"
  comment = "Security headers for ${var.environment} ${var.project}"

  security_headers_config {
    content_type_options {
      override = true
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }

    # The directives, and why each origin is there: csp.tf.
    content_security_policy {
      content_security_policy = local.content_security_policy
      override                = true
    }
  }

  # Everything but prod says noindex on every response, HTML or not. A dev
  # site crawled and indexed competes with the real one for its own name, and
  # robots.txt cannot say it: a disallowed URL can still be indexed from links.
  dynamic "custom_headers_config" {
    for_each = var.environment == "prod" ? [] : [1]
    content {
      items {
        header   = "X-Robots-Tag"
        value    = "noindex, nofollow"
        override = true
      }
    }
  }
}

resource "aws_cloudfront_distribution" "website" {
  enabled             = var.cloudfront_enabled
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "${var.environment} - ${var.project} website"
  price_class         = var.cloudfront_price_class
  aliases             = local.custom_domain_active ? local.domain_hosts : []

  origin {
    domain_name              = aws_s3_bucket.website.bucket_regional_domain_name
    origin_id                = "S3-${local.bucket_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  # Photos, logos and the public snapshot (app_data.tf). One OAC signs for
  # both buckets.
  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id                = local.media_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.website.id
  }

  # The website's 404 page (not_found.tf): the bucket's fallback in the
  # origin group below. Host is not forwarded on the default behaviour, so the
  # function URL's own host reaches it, as OAC requires.
  origin {
    domain_name              = replace(replace(aws_lambda_function_url.not_found.function_url, "https://", ""), "/", "")
    origin_id                = local.not_found_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.not_found.id

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # The website: the bucket, and on a missing key (403, or 404) the 404 page.
  # Only the default behaviour uses it, so no other origin's 403 or 404 is
  # ever replaced.
  origin_group {
    origin_id = local.website_origin_group_id

    failover_criteria {
      status_codes = [403, 404]
    }

    member {
      origin_id = "S3-${local.bucket_name}"
    }

    member {
      origin_id = local.not_found_origin_id
    }
  }

  # The HTTP API (api.tf). HTTPS only, and the viewer's Host is replaced by the
  # API's own, which API Gateway requires.
  origin {
    domain_name = replace(aws_apigatewayv2_api.api.api_endpoint, "https://", "")
    origin_id   = local.api_origin_id

    # Proves a request came through CloudFront: the execute-api URL is
    # public, and a caller going around the edge could forge the
    # CloudFront-Viewer-Address header the API rate-limits on (api.tf).
    custom_header {
      name  = local.origin_verify_header
      value = random_password.origin_verify.result
    }

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # /api/*: never cached; every header but Host, every cookie and query
  # string forwarded. No function: the API answers both hosts the same.
  ordered_cache_behavior {
    path_pattern               = "/api/*"
    target_origin_id           = local.api_origin_id
    allowed_methods            = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods             = ["GET", "HEAD"]
    viewer_protocol_policy     = "https-only"
    compress                   = true
    cache_policy_id            = local.managed_cache_policy_disabled
    origin_request_policy_id   = local.managed_origin_request_all_except_host
    response_headers_policy_id = aws_cloudfront_response_headers_policy.website.id
  }

  # /media/*: object keys are immutable, so cached as long as CloudFront will.
  ordered_cache_behavior {
    path_pattern               = "/media/*"
    target_origin_id           = local.media_origin_id
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = local.managed_cache_policy_optimized
    response_headers_policy_id = aws_cloudfront_response_headers_policy.website.id
  }

  # /data/*: the public snapshot and the parcel lockers, one minute.
  ordered_cache_behavior {
    path_pattern               = "/data/*"
    target_origin_id           = local.media_origin_id
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    cache_policy_id            = aws_cloudfront_cache_policy.data_snapshot.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.website.id
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods             = ["GET", "HEAD"]
    target_origin_id           = local.website_origin_group_id
    viewer_protocol_policy     = "redirect-to-https"
    compress                   = true
    response_headers_policy_id = aws_cloudfront_response_headers_policy.website.id

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  # A missing key is a real 404, answered with the prerendered not-found page
  # by the origin group's fallback (not_found.tf), on the default behaviour
  # only. There is deliberately no response_page_path here: a custom error
  # page applies to the whole distribution, and turned the API's own 403 and
  # 404 (with their JSON error codes) into this HTML page.
  #
  # The bucket's 403 for a missing key is that page with 404 by the time it
  # gets here. An address that only needed tidying never gets that far: the
  # viewer-request function has already answered it with a 301.
  #
  # What stays is the error TTL: 0, so no 403 or 404 (an admin's 403 from the
  # API, say, or a charity that was just approved) is kept at the edge and
  # handed to the next caller. CloudFront's default would be 10 s.
  custom_error_response {
    error_code            = 403
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    error_caching_min_ttl = 0
  }

  # Nor a 5xx: a timed-out cold start of the 404 function, or an API error,
  # would otherwise be handed to every caller for CloudFront's default 10 s.
  custom_error_response {
    error_code            = 500
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 502
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 503
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 504
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    # The validated ACM cert is used only in phase 2. Referencing the
    # _validation resource (not the certificate) guarantees CloudFront never
    # sees a cert that is still PENDING_VALIDATION.
    acm_certificate_arn            = local.custom_domain_active ? aws_acm_certificate_validation.website[0].certificate_arn : null
    cloudfront_default_certificate = !local.custom_domain_active
    ssl_support_method             = local.custom_domain_active ? "sni-only" : null
    minimum_protocol_version       = local.custom_domain_active ? "TLSv1.2_2021" : null
  }

  tags = merge(local.tags, {
    Name = "${local.name_prefix}-${var.project}-cloudfront"
  })

  lifecycle {
    # An alias without a certificate is a CloudFront API error mid-apply; catch
    # the misconfiguration during plan instead.
    precondition {
      condition     = var.domain_name != "" || length(var.domain_aliases) == 0
      error_message = "domain_aliases requires domain_name to be set: the extra hosts share the primary domain's certificate."
    }
  }
}
