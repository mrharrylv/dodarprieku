# =============================================================================
# Contact form: Lambda Function URL -> SES
# =============================================================================
# Copy this file to infrastructure/terraform/contact.tf, add the variables from
# contact.variables.tf, then re-run infrastructure/aws/setup.sh with
# FEATURES=contact so the deploy role may create these resources.
#
# See optional/contact-form/README.md for the whole procedure, including the
# SES identity verification that must happen before any mail is delivered.

# -----------------------------------------------------------------------------
# Packaging
# -----------------------------------------------------------------------------
# The handler has no dependencies beyond the AWS SDK, which the Node 20 runtime
# already provides, so a plain zip of one file is the whole build. No bundler,
# no lockfile, nothing to drift between a laptop and CI.
data "archive_file" "contact" {
  type        = "zip"
  source_file = "${path.module}/lambda/index.mjs"
  output_path = "${path.module}/.build/contact.zip"
}

# -----------------------------------------------------------------------------
# Execution role
# -----------------------------------------------------------------------------
resource "aws_iam_role" "contact" {
  name = "${var.environment}-${var.project}-contact"

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

resource "aws_iam_role_policy" "contact" {
  name = "${var.environment}-${var.project}-contact"
  role = aws_iam_role.contact.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Logs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "${aws_cloudwatch_log_group.contact.arn}:*"
      },
      {
        # Scoped to the one identity this function is allowed to send as.
        # A blanket ses:SendEmail on "*" would let a compromised function send
        # as any verified identity in the account.
        Sid      = "SendAsOurIdentity"
        Effect   = "Allow"
        Action   = ["ses:SendEmail"]
        Resource = "arn:aws:ses:${var.region}:${data.aws_caller_identity.current.account_id}:identity/${var.contact_mail_domain}"
      },
    ]
  })
}

# Created explicitly rather than left to Lambda's implicit creation, so the
# retention is set. An implicitly created group keeps logs forever, and these
# contain submitters' email addresses and IPs.
resource "aws_cloudwatch_log_group" "contact" {
  name              = "/aws/lambda/${var.environment}-${var.project}-contact"
  retention_in_days = 30

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Function
# -----------------------------------------------------------------------------
resource "aws_lambda_function" "contact" {
  function_name = "${var.environment}-${var.project}-contact"
  role          = aws_iam_role.contact.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  architectures = ["arm64"] # Graviton: cheaper per ms, same code.

  filename         = data.archive_file.contact.output_path
  source_code_hash = data.archive_file.contact.output_base64sha256

  # Sending one email takes well under a second; a long timeout only means a
  # stuck invocation bills for longer.
  timeout     = 10
  memory_size = 256

  environment {
    variables = {
      MAIL_FROM       = var.contact_mail_from
      MAIL_TO         = var.contact_mail_to
      ALLOWED_ORIGINS = join(",", var.contact_allowed_origins)
    }
  }

  depends_on = [aws_cloudwatch_log_group.contact]

  tags = local.tags

  lifecycle {
    precondition {
      condition     = length(var.contact_allowed_origins) > 0
      error_message = "contact_allowed_origins must list the site's origins, or any website could post to this endpoint through a visitor's browser."
    }
  }
}

# A Function URL rather than API Gateway: this is one unauthenticated POST
# endpoint, and API Gateway would add a second service to configure, pay for and
# reason about for no behaviour we need.
resource "aws_lambda_function_url" "contact" {
  function_name      = aws_lambda_function.contact.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = var.contact_allowed_origins
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
    max_age       = 86400
  }
}

# -----------------------------------------------------------------------------
# SES identity
# -----------------------------------------------------------------------------
# Domain identity, not an email identity: it lets the site send as any address
# on the domain and, with DKIM below, actually authenticates the mail.
#
# The DKIM CNAMEs this produces MUST be added at the DNS provider. Until they
# are, mail is unsigned and lands in spam: the send succeeds and nobody sees it,
# which is the worst possible failure mode for a contact form.
resource "aws_sesv2_email_identity" "contact" {
  email_identity = var.contact_mail_domain

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }

  tags = local.tags
}

# -----------------------------------------------------------------------------
# Outputs
# -----------------------------------------------------------------------------
output "contact_endpoint" {
  description = "Set this as the VITE_CONTACT_ENDPOINT variable on this environment in GitHub"
  value       = aws_lambda_function_url.contact.function_url
}

output "contact_dkim_records" {
  description = "DKIM CNAMEs to add at the DNS provider before any mail will be trusted"
  value = [
    for token in aws_sesv2_email_identity.contact.dkim_signing_attributes[0].tokens : {
      type  = "CNAME"
      name  = "${token}._domainkey.${var.contact_mail_domain}"
      value = "${token}.dkim.amazonses.com"
      ttl   = 300
    }
  ]
}
