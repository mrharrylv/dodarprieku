# =============================================================================
# Environment
# =============================================================================

variable "environment" {
  type        = string
  description = "Environment name (dev, prod)"
  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "Environment must be 'dev' or 'prod'."
  }
}

variable "region" {
  type        = string
  description = "AWS region"
  default     = "eu-north-1"
}

variable "resource_prefix" {
  type        = string
  description = "Prefix for resource naming to prevent collisions (normally the environment name)"
}

# =============================================================================
# Domain
# =============================================================================

variable "domain_name" {
  type        = string
  description = <<-EOT
    Primary hostname for the site, e.g. "example.com".

    Leave empty to serve from the CloudFront default *.cloudfront.net URL. That
    is the fastest path to a live site: no certificate, no DNS, no waiting. Set
    it once a real domain is ready.
  EOT
  default     = ""
}

variable "domain_aliases" {
  type        = list(string)
  description = <<-EOT
    Extra hostnames served by the same distribution and covered by the same ACM
    certificate as subject alternative names, typically ["www.example.com"] so
    both the apex and www resolve to the site.

    Requires domain_name to be set. Editing this list replaces the certificate;
    the replacement is created before the old one is destroyed, but its new
    validation CNAMEs must be in DNS or the apply will wait for a cert that can
    never be issued. Add the DNS records first (the infra workflow prints them),
    then apply.
  EOT
  default     = []

  validation {
    condition     = length([for host in var.domain_aliases : host if trimspace(host) == ""]) == 0
    error_message = "domain_aliases must not contain empty hostnames."
  }
}

variable "enable_custom_domain" {
  type        = bool
  description = <<-EOT
    Two-phase rollout flag. See doc/dns.md.

      false (phase 1): create the ACM certificate so its validation CNAMEs can
                       be read from the outputs, but do NOT attach the aliases
                       or the cert to CloudFront. The site stays on the default
                       *.cloudfront.net URL. Safe to apply before DNS exists.

      true  (phase 2): attach domain_name (plus domain_aliases) as CloudFront
                       aliases and use the now-ISSUED certificate. Every
                       validation CNAME must be in place first, or the apply
                       blocks waiting for a certificate that cannot be issued.

    Has no effect when domain_name is empty.
  EOT
  default     = false
}

variable "zone_dns_zone" {
  type        = string
  description = <<-EOT
    The Zone.ee (zone.eu) DNS zone whose records Terraform creates itself, for
    example "hagroup.lv". Every host of the site inside this zone gets its ACM
    validation CNAME and its CloudFront CNAME through the Zone.ee API during
    the apply (zone_dns.tf), so enable_custom_domain can be true from the
    first run. The apply then needs ZONE_USERNAME and ZONE_API_KEY in its
    environment; the infra workflows pass them from GitHub Actions secrets.

    Empty (the default) leaves every record to be added by hand, as printed
    by the infra workflow. Dev is always <site>.hagroup.lv with this set to
    "hagroup.lv". The apex of a zone is never handled: see doc/dns.md.
  EOT
  default     = ""

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9-]+\\.?$", var.zone_dns_zone)) || var.zone_dns_zone == ""
    error_message = "zone_dns_zone must be a DNS zone name such as \"hagroup.lv\", or empty."
  }
}

# =============================================================================
# CloudFront
# =============================================================================

variable "cloudfront_price_class" {
  type        = string
  description = "CloudFront price class. PriceClass_100 is North America + Europe and is the cheapest."
  default     = "PriceClass_100"

  validation {
    condition     = contains(["PriceClass_100", "PriceClass_200", "PriceClass_All"], var.cloudfront_price_class)
    error_message = "cloudfront_price_class must be PriceClass_100, PriceClass_200 or PriceClass_All."
  }
}

variable "cloudfront_enabled" {
  type        = bool
  description = <<-EOT
    On/off switch for the distribution.

      true  → serves traffic normally.
      false → disabled ("stopped"): it stops serving and incurs no request or
              data-transfer charges, while the distribution, its CloudFront
              domain name, aliases and ACM certificate are all preserved. No DNS
              record changes. Set back to true to resume.

    Driven by the CloudFront Toggle workflow: the cheap way to take a site
    down without the DNS churn a destroy would cause.
  EOT
  default     = true
}

# =============================================================================
# Tags and metadata
# =============================================================================

variable "owner" {
  type        = string
  description = "Owner of the resources"
  default     = "mrharrylv"
}

variable "project" {
  type        = string
  description = <<-EOT
    Project slug. Used in every resource name, in the Project tag that the IAM
    deploy role's conditional Denies key off, and in the Terraform state prefix.

    Changing it after the first apply renames resources and orphans the state,
    set it once, at init time.
  EOT
  default     = "dodarprieku"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,30}$", var.project))
    error_message = "project must be lowercase alphanumeric with hyphens, starting with a letter (it becomes part of an S3 bucket name)."
  }
}

variable "image_origins" {
  description = "Origins the site may load images from, besides itself: the CSP's img-src. Must include MEDIA_ORIGIN from src/config/site.ts when a site hotlinks a client's photos."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for o in var.image_origins : can(regex("^https://[a-z0-9.-]+$", o))])
    error_message = "Each image origin must be a bare https origin, such as https://www.example.com."
  }
}

variable "frame_origins" {
  description = "Origins the site may embed in a frame: the CSP's frame-src. The contact page's map (MAP in src/config/site.ts) needs https://www.google.com, so it is allowed by default; set [] for a site with the map turned off."
  type        = list(string)
  default     = ["https://www.google.com"]

  validation {
    condition     = alltrue([for o in var.frame_origins : can(regex("^https://[a-z0-9.-]+$", o))])
    error_message = "Each frame origin must be a bare https origin, such as https://www.example.com."
  }
}

variable "analytics_origin" {
  description = "Origin of HA Group's CRM, where every page view is reported (ANALYTICS_ENDPOINT in src/config/site.ts, contract in doc/visit-tracking.md). Added to the CSP's connect-src. Empty string: no statistics leave the browser."
  type        = string
  default     = "https://crm.hagroup.lv"

  validation {
    condition     = var.analytics_origin == "" || can(regex("^https://[a-z0-9.-]+$", var.analytics_origin))
    error_message = "analytics_origin must be empty or a bare https origin, such as https://crm.hagroup.lv."
  }
}

# =============================================================================
# Cost guards (cost_guards.tf)
# =============================================================================

variable "alert_email" {
  type        = string
  description = <<-EOT
    Address that receives the spike alarms from cost_guards.tf. Empty turns the
    alarms off. The first apply sends a confirmation email from AWS, and no
    alarm is delivered until its link has been clicked.
  EOT
  default     = ""

  validation {
    condition     = var.alert_email == "" || can(regex("^[^@[:space:]]+@[^@[:space:]]+\\.[^@[:space:]]+$", var.alert_email))
    error_message = "alert_email must be an email address, or empty to turn the alarms off."
  }
}

variable "alarm_requests_per_hour" {
  type        = number
  description = "CloudFront requests in one hour above which the spike alarm emails alert_email."
  default     = 50000

  validation {
    condition     = var.alarm_requests_per_hour > 0
    error_message = "alarm_requests_per_hour must be positive."
  }
}

variable "alarm_gb_per_hour" {
  type        = number
  description = "Gigabytes served by CloudFront in one hour above which the bandwidth alarm emails alert_email."
  default     = 5

  validation {
    condition     = var.alarm_gb_per_hour > 0
    error_message = "alarm_gb_per_hour must be positive."
  }
}
