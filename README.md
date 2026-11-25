# Dodar prieku

The website for **Dodar prieku**: a static React site, prerendered page by page at
build time, on S3 + CloudFront, deployed from GitHub Actions, with
infrastructure in Terraform.

## Run it

```bash
make install     # first time
make run         # API with sample data + map on :5180 + admin on :5181 (nothing touches AWS)
make dev         # the website alone on http://localhost:5173
make verify      # lint -> test + coverage -> typecheck -> build -> pipeline tests -> terraform
```

**Run `make verify` before every commit.** It is exactly what CI runs, in the
same order, so a green local run means a green pipeline.

## What is where

| | |
| --- | --- |
| `services/frontend/website/` | The site. React 19, Vite, Tailwind 4, i18next. |
| `infrastructure/terraform/` | S3, CloudFront, ACM. Two-phase custom domains. `functions/viewer-request.js` sends every other spelling of a page's address to it with a 301, and maps each page's URL to its prerendered file. |
| `infrastructure/aws/setup.sh` | One-time IAM/OIDC bootstrap. |
| `.github/workflows/` | CI, deploy, and the three infrastructure workflows. |
| `optional/` | Add-ons not installed by default: contact form, consent. |
| `doc/` | Everything below. |

| Question | File |
| --- | --- |
| Where does this component go? | [`doc/architecture.md`](doc/architecture.md) |
| Which colour, size, spacing? | [`doc/design.md`](doc/design.md) |
| How do I get a domain live? | [`doc/deployment.md`](doc/deployment.md) |
| Which DNS record exactly? | [`doc/dns.md`](doc/dns.md) |
| How do I deploy, roll back, turn it off? | [`doc/operations.md`](doc/operations.md) |
| How do I change the text? | [`doc/content.md`](doc/content.md) |
| What does a crawler get, and how do I check it? | [`doc/deployment.md`](doc/deployment.md#checking-what-a-crawler-sees) |

## Before this site goes live

`src/config/site.ts` ships with **placeholders**. Every one of them is visible
to customers, and a plausible-looking fake on a legal page is a real problem,
not a cosmetic one:

- the phone number (`+371 20 000 000`), which is what the contact page shows and
  what the fallback banner points people at when the form is unavailable;
- the registration number, VAT number and IBAN (`40203XXXXXX`, …);
- the registered address;
- the `og-image.png` and icons in `public/`, which are generated placeholders.

[`doc/content.md`](doc/content.md) lists them all with the file and line.

The company page, the structured data and `llms.txt` all refuse to publish a
value `src/lib/placeholder.ts` still recognises as a placeholder: the page shows
"not published", the machine-readable files leave the field out. The same goes
for the locale files' instructions ("Replace this with one sentence..."): the
structured data and `llms.txt` publish no description until real copy
replaces them. An unreplaced
placeholder is visible rather than plausibly wrong. That is a safety net, not
permission to leave them.

## Deploying has consequences

**Every push to `main` deploys to dev automatically.** There is no paths filter,
so a change to a doc triggers a build too.

- The infrastructure must exist before the first push, or the deploy fails with
  nowhere to upload to. See [`doc/deployment.md`](doc/deployment.md).
- Do not push a half-finished change to `main` expecting it to sit quietly.
- Production is a manual `workflow_dispatch` and stays that way.
- Only production can be indexed: every other environment sends
  `X-Robots-Tag: noindex, nofollow`.
- Set `VITE_SITE_URL` on the prod GitHub Environment once the real domain is
  attached. Without it the canonical links and the sitemap name the CloudFront
  domain.

## The site contacts nobody

The cookie policy promises, in every language, that the site makes no
third-party request. That promise is kept in code, not by good intentions:

- **Fonts are self-hosted** (`@fontsource-variable/*`, imported at the top of
  `src/index.css`). Never add a `fonts.googleapis.com` link: a font request
  carries the visitor's IP, User-Agent and Referer to Google on the first
  paint, before any consent (LG München 3 O 17493/20).
- **`index.html` carries no third-party tag**, and no inline script:
  production's CSP (`script-src 'self'`) would block it.
- **Icons are inline SVG**, not a webfont or an icon CDN.

The mirror of that rule: the cookie policy's table lists **every** key written
to local storage, and it is generated from `STORAGE_KEYS` so it cannot fall out
of date. Adding a key is a legal-copy change in all three languages, not just a
line of TypeScript.

If you add an embed, install the consent add-on first. See
[`optional/consent/README.md`](optional/consent/README.md).
