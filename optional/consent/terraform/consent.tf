# =============================================================================
# Consent records: Lambda Function URL -> DynamoDB
# =============================================================================
# Only needed when you must be able to DEMONSTRATE consent (GDPR Art. 7(1)).
# A value in the visitor's own browser demonstrates nothing: they can edit it,
# and it is gone the moment they clear site data.
#
# Copy to infrastructure/terraform/, then re-run infrastructure/aws/setup.sh
# with FEATURES=contact,consent.

resource "aws_dynamodb_table" "consent" {
  name         = "${var.environment}-${var.project}-consent"
  billing_mode = "PAY_PER_REQUEST" # A consent write is rare; provisioned capacity would be waste.

  hash_key  = "id"
  range_key = "at"

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "at"
    type = "N"
  }

  # The record is evidence of consent, and evidence you no longer need is a
  # liability rather than an asset. Deleted automatically once the consent it
  # records has expired: see CONSENT_TTL_DAYS in the frontend, and keep the
  # retention stated in the privacy policy in step with this.
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = local.tags
}

resource "aws_iam_role" "consent" {
  name = "${var.environment}-${var.project}-consent"

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

resource "aws_iam_role_policy" "consent" {
  name = "${var.environment}-${var.project}-consent"
  role = aws_iam_role.consent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.consent.arn}:*"
      },
      {
        # PutItem only. The function has no reason to read consent records back,
        # and no reason to delete them: deletion is the TTL's job. A function
        # that cannot read the table cannot leak it either.
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem"]
        Resource = aws_dynamodb_table.consent.arn
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "consent" {
  name              = "/aws/lambda/${var.environment}-${var.project}-consent"
  retention_in_days = 30

  tags = local.tags
}

data "archive_file" "consent" {
  type        = "zip"
  source_file = "${path.module}/lambda/consent.mjs"
  output_path = "${path.module}/.build/consent.zip"
}

resource "aws_lambda_function" "consent" {
  function_name = "${var.environment}-${var.project}-consent"
  role          = aws_iam_role.consent.arn
  handler       = "consent.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"]

  filename         = data.archive_file.consent.output_path
  source_code_hash = data.archive_file.consent.output_base64sha256

  timeout     = 10
  memory_size = 256

  environment {
    variables = {
      TABLE_NAME      = aws_dynamodb_table.consent.name
      ALLOWED_ORIGINS = join(",", var.contact_allowed_origins)
      TTL_DAYS        = tostring(var.consent_ttl_days)
    }
  }

  depends_on = [aws_cloudwatch_log_group.consent]

  tags = local.tags
}

resource "aws_lambda_function_url" "consent" {
  function_name      = aws_lambda_function.consent.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = var.contact_allowed_origins
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
    max_age       = 86400
  }
}

variable "consent_ttl_days" {
  type        = number
  description = <<-EOT
    How long a consent record is kept, in days.

    Must match CONSENT_TTL_DAYS in the frontend and the retention period stated
    in the privacy policy. Three numbers, one fact: if they disagree, the
    published policy is false.
  EOT
  default     = 365
}

output "consent_endpoint" {
  description = "Set this as the VITE_CONSENT_ENDPOINT variable on this environment in GitHub"
  value       = aws_lambda_function_url.consent.function_url
}
