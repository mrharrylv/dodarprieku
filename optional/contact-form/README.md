# Contact form add-on

Turns the site's contact form from a "call or email us instead" notice into a
working form: a Lambda Function URL that validates the submission and sends it
through SES.

The frontend for this is **already in the template**. `ContactForm.tsx`,
`lib/contact.ts` and `lib/validation.ts` ship in every copy and are fully
tested; they simply show the fallback while `VITE_CONTACT_ENDPOINT` is unset.
So there is no frontend code to copy, only infrastructure to create and one
variable to set.

## What gets created

| Resource | Why |
| --- | --- |
| Lambda function (Node 20, arm64) | Validates and sends. One file, no dependencies. |
| Lambda Function URL | A public POST endpoint. Cheaper and simpler than API Gateway for one route. |
| IAM role + inline policy | Scoped to logs and to `ses:SendEmail` **on one identity**. |
| CloudWatch log group | Created explicitly so retention is 30 days. Implicit groups keep logs forever, and these contain email addresses and IPs. |
| SES domain identity + DKIM | Authenticates the mail. Without the DKIM records in DNS, mail sends and lands in spam. |

## Procedure

**1. Copy the files in.**

```bash
cp optional/contact-form/terraform/contact.tf            infrastructure/terraform/
cp optional/contact-form/terraform/contact.variables.tf  infrastructure/terraform/
mkdir -p infrastructure/terraform/lambda
cp optional/contact-form/lambda/index.mjs                infrastructure/terraform/lambda/
```

`contact.tf` uses the `archive_file` data source, so add the provider to
`infrastructure/terraform/main.tf`:

```hcl
required_providers {
  aws     = { source = "hashicorp/aws", version = "~> 5.0" }
  archive = { source = "hashicorp/archive", version = "~> 2.4" }
}
```

**2. Set the variables** in `environments/dev.tfvars` and `prod.tfvars`:

```hcl
contact_mail_domain     = "example.com"
contact_mail_from       = "website@example.com"
contact_mail_to         = "hello@example.com"
contact_allowed_origins = ["https://example.com", "https://www.example.com"]
```

Include **every** host the site answers on. A missing `www` means submissions
from that host fail with a CORS error the visitor cannot act on.

**3. Widen the deploy role.** It cannot create Lambda, IAM or SES resources yet:

```bash
FEATURES=contact PROJECT=<slug> REPO=<repo> ./infrastructure/aws/setup.sh
```

**4. Apply**, then read the outputs:

```
Run the "Terraform Infrastructure" workflow (environment: dev)
```

It prints `contact_endpoint` and `contact_dkim_records`.

**5. Add the DKIM CNAMEs** at the DNS provider, all three of them.

This is the step that gets skipped, and skipping it fails silently: SES accepts
the send, returns success, and the message goes to the recipient's spam folder.
Verify before believing it works:

```bash
aws sesv2 get-email-identity --email-identity example.com \
  --query '{verified:VerifiedForSendingStatus,dkim:DkimAttributes.Status}'
# expect → verified: true, dkim: SUCCESS
```

**6. Set the endpoint variable in GitHub.** Repository → Settings →
Environments → `dev` → Variables:

```
VITE_CONTACT_ENDPOINT = <the contact_endpoint output>
```

A **variable**, not a secret: it is a public URL that ships in the bundle
anyway, and marking it secret only makes it harder to see what is deployed.

**7. Leave the SES sandbox.** A new account can only send to addresses it has
verified, so the form will appear to work for you and silently fail for
everyone else. Request production access in the SES console. It usually takes
under a day.

**8. Push to `main`** to rebuild with the endpoint baked in, and send a real
test message from the live site.

## Two limits worth knowing

**Rate limiting is per execution environment.** The counter is in memory, so a
burst spread across cold starts gets more attempts than the nominal five per ten
minutes. That is deliberate: it stops the casual script, and SES's own sending
quota is the real ceiling. Making it exact would mean adding DynamoDB to a
contact form.

**The endpoint is unauthenticated by design.** `contact_allowed_origins` is a
CORS control: it stops *another website* posting through your visitors'
browsers. It does not stop anyone calling the URL directly with `curl`. That is
why the handler validates and length-caps everything server-side, escapes every
value before it reaches the email body, and never sets `From` to the submitted
address.
