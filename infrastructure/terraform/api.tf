# =============================================================================
# Dodar prieku API: one Lambda behind an HTTP API, served at /api/* by the
# site's own distribution
# =============================================================================
# The code is services/api (esbuild bundle in services/api/dist). Terraform
# creates the function from that build once; after that the Build & Deploy
# workflow owns the code (aws lambda update-function-code), so filename and
# source_code_hash are ignored here. The infra workflow builds services/api
# before it plans, because the archive below needs dist/ to exist.
#
# The presence of this file is what bootstrap.sh reads as the "app" feature:
# infrastructure/aws/setup.sh then grants the deploy roles DynamoDB, Lambda,
# API Gateway, SSM and the media bucket.

locals {
  api_function_name    = "${local.app_name}-api"
  api_dist_dir         = "${path.module}/../../services/api/dist"
  api_built            = fileexists("${local.api_dist_dir}/index.mjs")
  origin_verify_header = "x-dodar-origin-verify"

  # Mail goes out as one address (the FromAddress condition below), and the
  # role may send as nothing else. The resource is every identity in this
  # account and region, not just the sending domain: while the SES account is
  # in the sandbox, SES also authorises the send against the RECIPIENT's
  # verified identity, and a policy naming only hagroup.lv is refused with
  # AccessDenied on identity/<recipient> (seen 2026-11-25).
  ses_sending_domain_arn = "arn:aws:ses:${var.region}:${data.aws_caller_identity.current.account_id}:identity/${var.ses_identity_domain}"
  ses_identity_arns = [
    local.ses_sending_domain_arn,
    "arn:aws:ses:${var.region}:${data.aws_caller_identity.current.account_id}:identity/*",
  ]
  ssm_param_arns = [
    aws_ssm_parameter.session_secret.arn,
    aws_ssm_parameter.admin_notify_email.arn,
  ]

  public_origin = var.domain_name != "" ? "https://${var.domain_name}" : "https://${aws_cloudfront_distribution.website.domain_name}"
  admin_origin  = var.domain_name != "" ? "https://admin.${var.domain_name}" : ""
}

# .terraform/ is git-ignored, so the zip never shows up as a change.
#
# Without a build (a destroy, a CloudFront toggle, a local plan) the archive
# holds a stand-in that answers 503, so those runs need no Node toolchain.
# Only a create ever uploads it, and the next deploy replaces it; the infra
# workflow builds services/api first so a create gets the real code.
# The shared value CloudFront adds to every /api/* request (main.tf) and the
# function checks, so the HTTP API's own public URL is useless on its own.
resource "random_password" "origin_verify" {
  length  = 48
  special = false
}

data "archive_file" "api" {
  type        = "zip"
  source_dir  = local.api_built ? local.api_dist_dir : null
  output_path = "${path.module}/.terraform/build/api.zip"

  dynamic "source" {
    for_each = local.api_built ? [] : [1]
    content {
      filename = "index.mjs"
      content  = <<-EOT
        export const handler = async () => ({
          statusCode: 503,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'server' }),
        })
      EOT
    }
  }
}

# -----------------------------------------------------------------------------
# Execution role: this table, this bucket, one sender, two parameters
# -----------------------------------------------------------------------------
resource "aws_iam_role" "api" {
  name = local.api_function_name

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = local.tags
}

resource "aws_iam_role_policy" "api" {
  name = local.api_function_name
  role = aws_iam_role.api.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.api.arn}:*"
      },
      {
        Sid    = "Table"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:TransactWriteItems",
          "dynamodb:ConditionCheckItem",
        ]
        Resource = [
          aws_dynamodb_table.data.arn,
          "${aws_dynamodb_table.data.arn}/index/GSI1",
        ]
      },
      {
        Sid      = "MediaObjects"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.media.arn}/*"
      },
      {
        # Deleting a charity removes its media/ objects, so the API lists them.
        Sid      = "MediaList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.media.arn
      },
      {
        Sid      = "SendAsInfo"
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = local.ses_identity_arns
        Condition = {
          StringEquals = { "ses:FromAddress" = var.mail_from }
        }
      },
      {
        Sid      = "Parameters"
        Effect   = "Allow"
        Action   = ["ssm:GetParameter"]
        Resource = local.ssm_param_arns
      },
      {
        # The SecureString uses the account's aws/ssm key; decrypting is
        # allowed only through SSM and only for these two parameters.
        Sid      = "DecryptParametersViaSsm"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = { "kms:ViaService" = "ssm.${var.region}.amazonaws.com" }
          StringLike   = { "kms:EncryptionContext:PARAMETER_ARN" = local.ssm_param_arns }
        }
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${local.api_function_name}"
  retention_in_days = var.api_log_retention_days

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Function
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "api" {
  function_name = local.api_function_name
  description   = "Dodar prieku API (${var.environment})"
  role          = aws_iam_role.api.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  memory_size   = var.api_memory_mb
  timeout       = var.api_timeout_seconds

  filename         = data.archive_file.api.output_path
  source_code_hash = data.archive_file.api.output_base64sha256

  environment {
    variables = {
      TABLE_NAME               = aws_dynamodb_table.data.name
      MEDIA_BUCKET             = aws_s3_bucket.media.id
      PUBLIC_ORIGIN            = local.public_origin
      ADMIN_ORIGIN             = local.admin_origin
      MAIL_FROM                = var.mail_from
      SESSION_SECRET_PARAM     = aws_ssm_parameter.session_secret.name
      ADMIN_NOTIFY_EMAIL_PARAM = aws_ssm_parameter.admin_notify_email.name
      ENVIRONMENT              = var.environment
      ORIGIN_VERIFY_HEADER     = local.origin_verify_header
      ORIGIN_VERIFY_SECRET     = random_password.origin_verify.result
    }
  }

  depends_on = [aws_cloudwatch_log_group.api]

  tags = local.tags

  lifecycle {
    # Build & Deploy ships the code; Terraform only creates the function.
    ignore_changes = [filename, source_code_hash]
  }
}

# -----------------------------------------------------------------------------
# HTTP API: /api/{proxy+} to the function, throttled at the stage
# -----------------------------------------------------------------------------
resource "aws_apigatewayv2_api" "api" {
  name          = local.api_function_name
  protocol_type = "HTTP"
  description   = "Dodar prieku API (${var.environment}), reached through CloudFront at /api/*"

  tags = local.tags
}

resource "aws_apigatewayv2_integration" "api" {
  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
  timeout_milliseconds   = var.api_timeout_seconds * 1000
}

resource "aws_apigatewayv2_route" "api" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "ANY /api/{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.api.id}"
}

# No access log: CloudWatch ingestion would be the largest line of this
# stack's bill, and the function logs every error with its request id.
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.api_throttle_burst
    throttling_rate_limit  = var.api_throttle_rate
  }

  tags = local.tags
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
