# =============================================================================
# Cost guards: spike alarms
# =============================================================================
# CloudFront bills per request and per GB served, so a bot flooding the site is
# the one way this stack's bill can run away. CloudWatch alarms on hourly
# requests and bytes served email var.alert_email through SNS, so a flood is
# noticed within the hour, including one spread over many IPs.
#
# There is deliberately no AWS WAF here: it costs about 9 USD a month per site,
# and Harry turned it off in every site and environment on 2026-10-29. Do not
# add one.
#
# Everything here lives in us-east-1, where CloudFront publishes its metrics.
#
# The monthly budgets and anomaly detection are account-wide and live in the
# hagroup repo (infrastructure/account-guards), applied once by an admin.
#
# The IAM permissions these resources need are granted by
# infrastructure/aws/setup.sh (the CostGuards statements), so re-run it before
# the first apply that includes this file.

locals {
  # One name stem for every guard, matching the <env>-<project>-* pattern the
  # deploy role is scoped to.
  cost_guard_name     = "${var.environment}-${var.project}"
  cost_alerts_enabled = var.alert_email != ""
}

# -----------------------------------------------------------------------------
# Alert channel
# -----------------------------------------------------------------------------

resource "aws_sns_topic" "cost_alerts" {
  count    = local.cost_alerts_enabled ? 1 : 0
  provider = aws.us_east_1

  name = "${local.cost_guard_name}-cost-alerts"

  tags = local.tags
}

# AWS emails a confirmation link on the first apply. Nothing is delivered
# until it has been clicked.
resource "aws_sns_topic_subscription" "cost_alerts_email" {
  count    = local.cost_alerts_enabled ? 1 : 0
  provider = aws.us_east_1

  topic_arn = aws_sns_topic.cost_alerts[0].arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# -----------------------------------------------------------------------------
# Spike alarms
# -----------------------------------------------------------------------------
# One hour of data per evaluation: short enough to hear about a flood the same
# hour, long enough that a busy afternoon does not page anyone. The OK action
# sends a second email when traffic is back to normal.

resource "aws_cloudwatch_metric_alarm" "cloudfront_requests_spike" {
  count    = local.cost_alerts_enabled ? 1 : 0
  provider = aws.us_east_1

  alarm_name        = "${local.cost_guard_name}-cloudfront-requests-spike"
  alarm_description = "More than ${var.alarm_requests_per_hour} requests in one hour on the ${var.environment} ${var.project} CloudFront distribution. Check for a bot flood; set cloudfront_enabled = false to switch the distribution off if needed."

  namespace   = "AWS/CloudFront"
  metric_name = "Requests"
  dimensions = {
    DistributionId = aws_cloudfront_distribution.website.id
    Region         = "Global"
  }

  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = var.alarm_requests_per_hour
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.cost_alerts[0].arn]
  ok_actions    = [aws_sns_topic.cost_alerts[0].arn]

  tags = local.tags
}

resource "aws_cloudwatch_metric_alarm" "cloudfront_bytes_spike" {
  count    = local.cost_alerts_enabled ? 1 : 0
  provider = aws.us_east_1

  alarm_name        = "${local.cost_guard_name}-cloudfront-bytes-spike"
  alarm_description = "More than ${var.alarm_gb_per_hour} GB served in one hour by the ${var.environment} ${var.project} CloudFront distribution. Data transfer is the larger part of a CloudFront bill."

  namespace   = "AWS/CloudFront"
  metric_name = "BytesDownloaded"
  dimensions = {
    DistributionId = aws_cloudfront_distribution.website.id
    Region         = "Global"
  }

  statistic           = "Sum"
  period              = 3600
  evaluation_periods  = 1
  threshold           = var.alarm_gb_per_hour * 1024 * 1024 * 1024
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.cost_alerts[0].arn]
  ok_actions    = [aws_sns_topic.cost_alerts[0].arn]

  tags = local.tags
}
