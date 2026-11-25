# =============================================================================
# The website's 404 page, served by a small Lambda the default behaviour
# fails over to (functions/not-found/index.mjs)
# =============================================================================
# A missing key in the website bucket is S3's 403 (OAC may not list it). This
# used to be turned into /404.html by distribution-wide custom error pages,
# but those apply to every behaviour: the API's own 403 and 404 answers, with
# their JSON error codes (doc/specs/dodarprieku.md, "Status codes"), reached
# the browser as this HTML page with 404. CloudFront Functions cannot help:
# they never run on a 4xx origin response.
#
# Instead the default behaviour targets an origin group: the bucket first,
# and on 403 or 404 this function, which answers with the bucket's 404.html
# and a real 404 status. No other behaviour uses the group, so /api/*,
# /media/* and /data/* reach the viewer as their origin answered.
#
# Terraform owns this code (no ignore_changes): it is part of the edge set-up,
# not of the app, and has no build step.

locals {
  not_found_function_name = "${local.app_name}-not-found"
  not_found_origin_id     = "NotFound-${local.name_prefix}-${var.project}"
  website_origin_group_id = "Website-${local.name_prefix}-${var.project}"
}

data "archive_file" "not_found" {
  type        = "zip"
  source_file = "${path.module}/functions/not-found/index.mjs"
  output_path = "${path.module}/.terraform/build/not-found.zip"
}

resource "aws_iam_role" "not_found" {
  name = local.not_found_function_name

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

# Its own logs, and one object of the website bucket.
resource "aws_iam_role_policy" "not_found" {
  name = local.not_found_function_name
  role = aws_iam_role.not_found.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "Logs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.not_found.arn}:*"
      },
      {
        Sid      = "NotFoundPage"
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.website.arn}/404.html"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "not_found" {
  name              = "/aws/lambda/${local.not_found_function_name}"
  retention_in_days = var.api_log_retention_days

  tags = local.tags
}

resource "aws_lambda_function" "not_found" {
  function_name = local.not_found_function_name
  description   = "Dod ar prieku website 404 page (${var.environment})"
  role          = aws_iam_role.not_found.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  memory_size   = 128
  timeout       = 5

  filename         = data.archive_file.not_found.output_path
  source_code_hash = data.archive_file.not_found.output_base64sha256

  environment {
    variables = {
      WEBSITE_BUCKET = aws_s3_bucket.website.id
      PAGE_KEY       = "404.html"
    }
  }

  depends_on = [aws_cloudwatch_log_group.not_found]

  tags = local.tags
}

# Reachable only through CloudFront: the URL demands SigV4, which only the
# distribution's OAC supplies.
resource "aws_lambda_function_url" "not_found" {
  function_name      = aws_lambda_function.not_found.function_name
  authorization_type = "AWS_IAM"
}

resource "aws_cloudfront_origin_access_control" "not_found" {
  name                              = "${local.not_found_function_name}-oac"
  description                       = "OAC for ${var.environment} ${var.project} 404 function"
  origin_access_control_origin_type = "lambda"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# A function URL behind OAC needs both permissions for this one distribution.
resource "aws_lambda_permission" "not_found_url" {
  statement_id           = "AllowCloudFrontInvokeFunctionUrl"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.not_found.function_name
  principal              = "cloudfront.amazonaws.com"
  source_arn             = aws_cloudfront_distribution.website.arn
  function_url_auth_type = "AWS_IAM"
}

resource "aws_lambda_permission" "not_found_invoke" {
  statement_id  = "AllowCloudFrontInvokeFunction"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.not_found.function_name
  principal     = "cloudfront.amazonaws.com"
  source_arn    = aws_cloudfront_distribution.website.arn
}
