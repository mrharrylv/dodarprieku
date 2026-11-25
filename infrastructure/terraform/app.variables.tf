# =============================================================================
# Dodar prieku: API, mail, analytics (api.tf, app_data.tf, csp.tf)
# =============================================================================

variable "mail_from" {
  type        = string
  description = "Sender of every email the API sends. The API role may send as this address only."
  default     = "info@hagroup.lv"

  validation {
    condition     = can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.mail_from))
    error_message = "mail_from must be an email address."
  }
}

variable "ses_identity_domain" {
  type        = string
  description = "The verified SES domain identity (in var.region) that mail_from belongs to. Shared with HA Group's other sites, so it is referenced, never created here."
  default     = "hagroup.lv"
}

variable "api_memory_mb" {
  type        = number
  description = "Memory of the API function. scrypt password hashing is the heaviest thing it does."
  default     = 512
}

variable "api_timeout_seconds" {
  type        = number
  description = "Timeout of the API function and of its API Gateway integration."
  default     = 10

  validation {
    condition     = var.api_timeout_seconds >= 1 && var.api_timeout_seconds <= 29
    error_message = "api_timeout_seconds must be 1-29: API Gateway gives up at 30 seconds."
  }
}

variable "api_log_retention_days" {
  type        = number
  description = "Retention of the API function's logs. They contain email addresses, so not forever."
  default     = 14
}

variable "api_throttle_burst" {
  type        = number
  description = "Burst limit of the HTTP API's default stage."
  default     = 50
}

variable "api_throttle_rate" {
  type        = number
  description = "Steady requests per second of the HTTP API's default stage."
  default     = 20
}

variable "data_cache_seconds" {
  type        = number
  description = "How long CloudFront keeps /data/* (the public snapshot). A publish shows on the map within this time."
  default     = 60
}

variable "ga_enabled" {
  type        = bool
  description = <<-EOT
    Widens the CSP for Google Analytics (googletagmanager.com and the
    google-analytics.com collectors). Production only, and only together with
    the prod Environment's VITE_GA_MEASUREMENT_ID variable: the site loads
    the tag only after consent.
  EOT
  default     = false
}
