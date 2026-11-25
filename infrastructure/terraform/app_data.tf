# =============================================================================
# Dodar prieku: data, media and secrets
# =============================================================================
# One DynamoDB table (doc/specs/dodarprieku.md, "Storage"), one private media
# bucket behind the same distribution, and two SSM parameters the API reads at
# runtime. The deploy roles' grants for all of it are the "app" feature of
# infrastructure/aws/setup.sh, detected by bootstrap.sh from api.tf.

locals {
  app_name     = "${local.name_prefix}-${var.project}"
  table_name   = "${local.app_name}-data"
  media_bucket = "${local.app_name}-media"

  # The SSM names the spec gives: /<prefix>/dodarprieku/<name>.
  ssm_prefix               = "/${local.name_prefix}/${var.project}"
  session_secret_param     = "${local.ssm_prefix}/session-secret"
  admin_notify_email_param = "${local.ssm_prefix}/admin-notify-email"
}

# -----------------------------------------------------------------------------
# DynamoDB: single table, on demand
# -----------------------------------------------------------------------------
resource "aws_dynamodb_table" "data" {
  name         = local.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  global_secondary_index {
    name            = "GSI1"
    hash_key        = "GSI1PK"
    range_key       = "GSI1SK"
    projection_type = "ALL"
  }

  # Tokens and rate-limit windows expire on their own.
  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  # The table holds every charity, account and pledge: a destroy must be a
  # deliberate edit, never a side effect of a rename.
  deletion_protection_enabled = var.environment == "prod"

  tags = merge(local.tags, { Name = local.table_name })
}

# -----------------------------------------------------------------------------
# Media bucket: photos, logos and the public snapshot
# -----------------------------------------------------------------------------
# CloudFront forwards the path unchanged, so object keys carry the prefix of
# the behaviour that serves them: media/<key> for /media/<key>, and
# data/charities.json, data/parcel-lockers.json for /data/*.
resource "aws_s3_bucket" "media" {
  bucket = local.media_bucket

  # Dev can be torn down by the Destroy workflow with photos in it; prod
  # refuses, so losing charities' photos takes a deliberate edit.
  force_destroy = var.environment != "prod"

  tags = merge(local.tags, { Name = local.media_bucket })
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "media" {
  bucket = aws_s3_bucket.media.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}

# Only this distribution may read it, through the same Origin Access Control
# as the website bucket. Writes come from the API's role and the deploy role.
resource "aws_s3_bucket_policy" "media" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontOAC"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.website.arn
          }
        }
      },
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.media.arn, "${aws_s3_bucket.media.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.media]
}

# -----------------------------------------------------------------------------
# /data/*: the public snapshot, cached for a minute
# -----------------------------------------------------------------------------
resource "aws_cloudfront_cache_policy" "data_snapshot" {
  name        = "${local.app_name}-data-60s"
  comment     = "Public snapshot: one minute at the edge (${var.environment} ${var.project})"
  min_ttl     = 0
  default_ttl = var.data_cache_seconds
  max_ttl     = var.data_cache_seconds

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_brotli = true
    enable_accept_encoding_gzip   = true

    cookies_config {
      cookie_behavior = "none"
    }
    headers_config {
      header_behavior = "none"
    }
    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# -----------------------------------------------------------------------------
# SSM parameters
# -----------------------------------------------------------------------------
# The session secret is generated once and never leaves AWS: it is in the
# state (encrypted bucket) and in SSM, never in a file, a log or a variable.
resource "random_password" "session_secret" {
  length  = 64
  special = false
}

resource "aws_ssm_parameter" "session_secret" {
  name        = local.session_secret_param
  description = "HMAC key for the dodar_session cookie (${var.environment})"
  type        = "SecureString"
  value       = random_password.session_secret.result

  tags = local.tags
}

# "none" means no notification. Harry sets the real address by hand:
#   aws ssm put-parameter --overwrite --name <name> --value <email>
# and Terraform leaves it alone from then on.
resource "aws_ssm_parameter" "admin_notify_email" {
  name        = local.admin_notify_email_param
  description = "Where new applications and updates are announced; \"none\" turns it off (${var.environment})"
  type        = "String"
  value       = "none"

  tags = local.tags

  lifecycle {
    ignore_changes = [value]
  }
}
