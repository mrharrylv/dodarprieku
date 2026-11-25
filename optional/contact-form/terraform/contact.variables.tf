# Variables for the contact-form add-on.
#
# Append these to infrastructure/terraform/variables.tf (or drop this file in
# beside it), and set the values in each environment's tfvars.

variable "contact_mail_domain" {
  type        = string
  description = <<-EOT
    The domain SES sends as, e.g. "example.com".

    A DOMAIN identity, not a single address: it lets the site send from any
    address on the domain, and it is what DKIM signs. The DKIM CNAMEs that the
    apply prints must be added at the DNS provider, until they are, mail is
    unsigned and goes to spam, which looks exactly like it was delivered.
  EOT

  validation {
    condition     = can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.contact_mail_domain))
    error_message = "contact_mail_domain must be a bare domain, with no protocol and no trailing slash."
  }
}

variable "contact_mail_from" {
  type        = string
  description = <<-EOT
    The From address, e.g. "website@example.com". Must be on contact_mail_domain.

    Never set this to the submitter's address. Sending as an address you do not
    control fails SPF and DMARC at the receiver and, done repeatedly, damages
    the domain's reputation for every other message it sends.
  EOT
}

variable "contact_mail_to" {
  type        = string
  description = "Where enquiries are delivered. Any address; it does not have to be on the sending domain."
}

variable "contact_allowed_origins" {
  type        = list(string)
  description = <<-EOT
    Origins allowed to POST to the endpoint, e.g.
    ["https://example.com", "https://www.example.com"].

    The endpoint is public: anyone who finds the URL can call it. This list is
    what stops another site posting to it through your visitors' browsers. Never
    set it to ["*"].

    Include every host the site answers on, apex and www both, or submissions
    from one of them are rejected with a CORS error the visitor cannot act on.
  EOT
  default     = []

  validation {
    condition = alltrue([
      for origin in var.contact_allowed_origins :
      can(regex("^https://[a-z0-9.-]+$", origin))
    ])
    error_message = "Each origin must be an https:// scheme and host, with no path and no trailing slash."
  }
}
