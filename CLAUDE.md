# CLAUDE.md: Dod ar prieku

Instructions for AI sessions in this repository. Read this, then read
[`doc/architecture.md`](doc/architecture.md) before touching anything under
`services/frontend/website/src`.

## What this is

The production website for **Dod ar prieku**. A static React site on S3 + CloudFront,
deployed by GitHub Actions, infrastructure in Terraform. Three languages, each
on its own URL prefix. Every page is prerendered at build time into its own
HTML file and hydrated in the browser: see "Prerendering and hydration" in
[`doc/architecture.md`](doc/architecture.md) before changing anything a page
renders on its first frame.

**Its look is a folder.** `src/styles/<id>/` holds a shell and the four
marketing pages; `site.config.json` says which one is active. Content is not
part of a style, so switching one changes how the site looks and nothing about
what it says. [`doc/styles.md`](doc/styles.md) is the contract and the
catalogue. Read it before editing anything under `src/styles/`.

Real business, real customers. Broken copy in a language you do not speak is a
real cost, and so is a contact form that silently fails.

## Commands

```bash
make install     # first time
make run         # API with sample data + map on :5180 + admin on :5181 (nothing touches AWS)
make dev         # the website alone on http://localhost:5173
make verify      # lint → test + coverage → typecheck → build → pipeline tests → terraform fmt + validate
make verify-styles  # every style in turn: routes, prerender, hydration, build
make test-pipeline  # the deploy pipeline's shell tests alone (.github/tests)
make preview     # serves the last build on :4173, answering as CloudFront does
```

**Run `make verify` before any commit.** It is what CI runs, in the same order:
the verify job, the pipeline job and the terraform job of `ci.yaml`.
A green `make test` alone is not enough: the coverage thresholds, the
type-check, the build, the pipeline tests and the Terraform validation each
catch things the others do not. The build includes
the prerender, which fails on a page that throws, has no single `h1` or
declares the wrong canonical. Touch anything a style renders and run
`make verify-styles` too; CI runs it on every pull request.

Never claim work is complete without having run the commands and read the
output.

## The architecture contract

[`doc/architecture.md`](doc/architecture.md) is binding, not advisory: the
directory map, the component conventions, the i18n rules, the testing bar and
the accessibility bar. Changing a signature there means changing the doc and
every call site in the same commit.

The modules it lists under "Existing modules" are written. **Import them; do not
recreate them, and do not guess their exports. Open the file.**

[`doc/design.md`](doc/design.md) explains which token to reach for and why.
[`doc/styles.md`](doc/styles.md) says what a style may and may not change.

## Non-negotiable rules

**No em dashes in visible text.** Not in the site copy, not in the docs. Use a
full stop, a colon, a comma or brackets: each of those says something more
specific about the relationship between the clauses than a dash does.
`src/i18n/typography.test.ts` enforces this for the locale files, because the
character is nearly invisible in a diff and would otherwise creep back in one
string at a time. An en dash inside a numeric or time range, `09:00-18:00`, is
correct and stays.

**Immutability.** Never mutate an input. Derive a new object or array and return
it. `normaliseContactForm` and the rate-limit helpers already do this; keep them
that way.

**Small files.** 200–400 lines is typical, 800 is the hard ceiling, a component
file should stay under ~200. Split before you exceed it, not after.

**No hardcoded values.**

| Kind | Comes from |
| --- | --- |
| Colour, font, spacing, easing | `@theme` tokens in `src/index.css`, never a hex in a component |
| Address, phone, email, social, domain | `src/config/site.ts` |
| Route path | `ROUTES` in `site.ts`, always wrapped in `localePath()`; never a string literal |
| Policy numbers: field limits, rate limits, timeouts | `src/config/constants.ts` |
| Any user-visible string | i18n, always |
| Anything read from the environment | `src/config/env.ts`, which validates it |

**i18n.** Every visible string comes from a locale file. The three locales of a
namespace must stay **key-identical**. A test enforces it, so adding a key to
`en` alone fails the build. Use `useTranslation('<ns>')` with plain keys; never
a `ns:` prefix inside a component. Write each language natively rather than
translating word-for-word from English; proper nouns stay untranslated.

**Errors are handled explicitly, with a message the visitor can act on.** Every
failure mode of the contact form (timeout, network, server, rate-limited,
unconfigured) has its own state and its own copy, because they require different
things of the person reading them. Never swallow an error into a `catch {}` that
does nothing, and never leave someone staring at a spinner.

**Validate at the boundary.** Form input goes through `lib/validation.ts` before
it is used, and `FIELD_LIMITS` must mirror whatever the endpoint enforces
exactly. Stored data is untrusted too: `readJson` takes a type guard for that
reason, and it is not optional.

**Both themes, keyboard, contrast.** Every component works in light and dark, is
reachable by keyboard, and clears 4.5:1 for text. Touch targets are at least
44px. Colour is never the only signal.

Do not pick an accent step by eye. `src/index.contrast.test.ts` computes what
the palette actually renders as, for the base AND for every style's overrides,
at every brand hue the docs offer, and fails the build when a token is
repointed at a step that misses the bar. The measured answers today:

| Use | Token | Step |
| --- | --- | --- |
| Accent text, light | `--text-accent` | `brand-700` |
| Accent text, dark | `--text-accent` | `brand-400` |
| Button fill, light | `--fill-accent` | `brand-700`, white label |
| Button fill, dark | `--fill-accent` | `brand-400`, `ink-950` label |
| Focus ring | `--ring-accent` | `brand-600` light, `brand-400` dark |
| Control boundary | `--border-strong` | `oklch(0.63 …)` light, `oklch(0.53 …)` dark |

`brand-500` is **neither** accent text nor a fill behind white text: white on it
measures 3.06-3.58:1 depending on hue. Never hardcode `text-white` on an accent
fill either, because the two themes need opposite label colours. Use
`--text-on-accent`.

`--border-subtle` is decoration: a divider, a card edge. `--border-strong` is
the boundary of a **control**, an input or a checkbox or a secondary button,
which WCAG 1.4.11 wants at 3:1 because that edge is what identifies the
control. It used to be `ink-300` at 1.49:1, and every input on the site had an
edge nobody could see.

**Tests.** Vitest, beside the code as `*.test.ts(x)`. Coverage thresholds are
enforced in `vite.config.ts` and a change that drops below them fails the build.
Every `lib/` function is pure and should be tested exhaustively. Use
`src/test/render.tsx` for component tests so they run inside the real providers.

When a test fails, fix the implementation, not the test, unless you can say
specifically why the test was wrong. Two of this template's own bugs were found
exactly that way.

## Deploying has consequences

**Every push to `main` deploys to dev.** There is no paths filter, so a change
to a doc triggers a build too.

The one exception is the template repository itself
(`mrharrylv/ha_website_template`, branch `master`), which new sites are only
copied from: its `push` and `pull_request` triggers are commented out with a
`#@site ` prefix and its entry jobs carry a `# @template-guard` condition, so
nothing in it ever runs. `bin/init-site.sh` strips both from every copy
(`.github/scripts/enable-site-triggers.sh`). Never re-enable them in the template.

- The infrastructure must exist before the first push, or the deploy fails with
  nowhere to upload to. See [`doc/deployment.md`](doc/deployment.md).
- Do not push a half-finished change to `main` expecting it to sit quietly.
- Production is a manual `workflow_dispatch` and stays that way.
- No WAF. The Terraform has no `aws_wafv2_*` resource and no `enable_waf`
  switch, and new sites must not add one: Harry turned WAF off in every site
  and environment on 2026-10-29 because it costs about 9 USD a month per site.
- **Dev is always `<site>.hagroup.lv`** (Harry, 2026-11-06), in the
  `hagroup.lv` zone at Zone.ee, with `zone_dns_zone = "hagroup.lv"` and
  `enable_custom_domain = true` in `dev.tfvars`. Terraform creates its ACM
  validation CNAME and CloudFront CNAME through the Zone.ee API in the same
  apply (`infrastructure/terraform/zone_dns.tf`, calling
  `.github/scripts/zone-dns.sh`). The infra workflows read the ZoneID login and
  key from the repository secrets `ZONE_USERNAME` and `ZONE_API_KEY`;
  `bootstrap.sh` copies them there from the Mac's Keychain (item
  `zone.eu-api`). Never write the key into a file, a tfvars, a log or a
  `VITE_*` variable. The zone apex is never automated (doc/dns.md).
- Only production can be indexed. Every other environment sends
  `X-Robots-Tag: noindex, nofollow` on every response (the response headers
  policy in `infrastructure/terraform/main.tf`), so a dev URL never competes
  with the real site for its own name.
- The canonical origin is the `VITE_SITE_URL` variable on each GitHub
  Environment. Without one, the deploy uses the CloudFront domain, so every
  canonical, `hreflang`, `og:url`, sitemap and `llms.txt` URL names
  `*.cloudfront.net`. Set it on prod the day the custom domain is attached.
- **No origin, no deploy.** A `VITE_SITE_URL` that is not an https origin, or
  no variable and no distribution to read the domain from, fails the run at
  "Resolve site URL", before it builds; and Phase 0 of the deploy action
  refuses any build that lacks `sitemap.xml`, `llms.txt` or an absolute
  `Sitemap:` line, before it uploads anything. Either way the live site is
  untouched. An internationalised domain may be written as it is or in
  punycode.
- **The edge redirects.** The CloudFront Function answers every other
  spelling of a page's address with a 301 to the one address:
  `/en/about/`, `/en/about/index.html` and `//en//about` to `/en/about`,
  `/index.html` to `/`, and an address with no published language
  (`/services`, `/de/services`) to the default language's page, each 301
  with `Cache-Control: public, max-age=3600`. It repeats `LOCALES`, so a
  change to the language list is a change to
  `infrastructure/terraform/functions/viewer-request.js` too (its test fails
  until it is). The function goes live on a Terraform Infrastructure run,
  never on a deploy. **Adding or removing a language needs the Terraform
  Infrastructure workflow run for each environment, right after the deploy
  that ships the change there** (dev after the push to `main`, prod after
  its deploy). Until then the old function answers: a new language's pages
  are 301'd to the default language, and a removed language's old files
  (the deploy deletes nothing) are still served.
- **An existing site keeps the deploy roles it was set up with** until
  `infrastructure/aws/setup.sh` is re-run for it, with admin credentials and
  the site's full `FEATURES` list (a bare re-run takes the contact form's
  Lambda and SES permissions away). Roles from the `<env>-<slug>-*` wildcard
  grant can still rewrite the edge function of a neighbouring site whose slug
  starts with this one's; roles from before the function existed have no
  grant for it, and the next infrastructure apply fails with AccessDenied.
  The re-run narrows the one and fixes the other.

**Do not commit, push, merge or dispatch a deploy unless you were asked to.**

## Known unknowns: do not invent these

Placeholders in the code. If a task needs one, ask. Never make one up, and never
let a plausible-looking fake reach a legal page:

- the **phone number** (`+371 20 000 000`), which is what the contact page shows
  and what the fallback banner points people at;
- the **registration number, VAT number and IBAN** (`40203XXXXXX`, …) in
  `COMPANY`;
- the **registered address**;
- real **imagery**: `public/favicon.svg` is a placeholder letterform, and every
  raster in `public/` (the icons, `logo.png`, `og-image.png`) is generated
  from it.

`isPlaceholder()` in `src/lib/placeholder.ts` recognises them: a run of three
capital `X`, the word "example", a number ending in six zeros. `CompanyPage`,
the structured data and `llms.txt` all ask it, so the page shows "not
published" and the machine-readable files leave the field out.
`isPlaceholderCopy()` does the same for the locale files' own instructions
("Replace this with one sentence..."), which the structured data and
`llms.txt` never publish as a description. That is a safety net, not
permission to leave them in.

## What every page carries

These are in the template and every style renders them. They are not per-site
decisions:

- **`SiteChrome`**: the scroll progress bar, the back-to-top button, the
  WhatsApp bubble, scroll restoration on navigation and the page transition.
  One import, so a style cannot ship without one of them.
- **A soft page transition.** Moving between pages (Home, Projects, About,
  Contact) fades the new page in through `PageTransition`; it never cuts to a
  blank frame. A style must not remove it or replace it with a hard swap, and
  any new page or lazy route gets it for free by rendering inside `<main>`.
  Reduced motion turns it off; the first, prerendered page never fades.
- **`DevelopedBy`** in the footer, translated around the developer's name,
  which stays as written.
- **Its own HTML.** The build prerenders every route in every language, with
  its own title, description, canonical, `hreflang`, Open Graph tags and
  JSON-LD, so a crawler that runs no JavaScript reads the finished page.
  Nothing only the browser knows (local storage, today's date, the window) may
  change a page's first render, or hydration throws the markup away.
- **A share card and an icon set**: `og:image` is absolute, with dimensions
  and alt text, because WhatsApp and the other crawlers ignore a relative one.
  `npm run images` draws the card, `favicon.ico`, the PNG icons and `logo.png`
  from `public/favicon.svg`. Every one is opaque, and the card keeps its logo,
  name and headline inside the central 630px square, because Google and
  several chat apps crop it square. Re-run it after changing the logo, the
  brand name, the hue or the home page's `hero.title`. A photo at
  `assets-src/share-hero.(png|jpg|webp)` switches the card to a photo layout.
  The card is named `/og-image.png?v=<hash>`, so a redrawn one is a new URL for
  the chat apps that cache by image URL. **`scripts/verify-share.mjs`, the last
  step of `npm run build`, fails the build** on a page without a complete share
  head, a card that is not 1200x630, opaque and under 300 KB, or a missing icon;
  placeholder copy and the placeholder favicon only warn until `SHARE_STRICT=1`
  (see `doc/content.md`).
- **No horizontal scrolling**: `html` and `body` clip it, images are capped,
  and `src/styles/overflow.test.ts` rejects a fixed width wider than 320px.

## The contact form starts as a demo

`VITE_CONTACT_MODE` is `mock` unless set: the form renders, validates, shows
its pending state, reports success, and throws the message away. A line under
it says so in all three languages.

That is what lets a site be reviewed before a backend exists. A real
`VITE_CONTACT_ENDPOINT` always wins over it. An endpoint that was supplied but
**rejected** (not https, malformed) turns the form OFF rather than falling back
to the demo, because a misconfiguration must not hide behind "Message sent".

Never remove the demo notice to make a screenshot look better.

## The page contacts nobody

The cookie and privacy policies promise, in all three languages, that the site
makes no third-party request. That is enforced in code:

- **Fonts are self-hosted:** `@fontsource-variable/*`, imported at the top of
  `src/index.css`. Never add a `fonts.googleapis.com` link: a font request
  carries the visitor's IP, User-Agent and Referer to Google on the first paint,
  before any consent (LG München 3 O 17493/20).
- **Icons are inline SVG.** No icon CDN, no icon webfont.
- **`index.html` carries no third-party tag.** If a task seems to need one, it
  needs a self-hosted equivalent or a `ConsentGate` instead. See
  [`optional/consent/README.md`](optional/consent/README.md).
- **`index.html` carries no inline script either.** Production's CSP is
  `script-src 'self'`, so an inline `<script>` never runs there; the pre-paint
  theme script used to be one, and did nothing in production. A script that
  must run before paint is a file in `public/`, loaded by URL, as
  `theme-init.js` is.

**The one exception is HA Group's own CRM.** Every page reports an anonymous,
cookieless page view and time on page to `crm.hagroup.lv`
(`useVisitTracker`, mounted by `SiteChrome`), so Harry sees when a site he
sent was opened and how it was read. The privacy and cookie policies say so in
every language while it is on, and drop it when it is off
(`VITE_ANALYTICS_ENDPOINT=off`). It never writes to the visitor's device, never
reads a cookie, never sends a query string, and fails silently when the CRM is
down. Adding a field to a report is a change to
[`doc/visit-tracking.md`](doc/visit-tracking.md), the contract the CRM
implements, and to the privacy copy in every language.

The mirror of that rule: the cookie policy's table must list **every** key
written to local storage. It is generated from `STORAGE_KEYS` so it cannot fall
behind the code, but a new key is still a legal-copy change in all three
languages, not just a line of TypeScript.

## Where to look

| Question | File |
| --- | --- |
| How do I run it? | [`README.md`](README.md) |
| Where does this go, what are its props? | [`doc/architecture.md`](doc/architecture.md) |
| Which colour, size, spacing? | [`doc/design.md`](doc/design.md) |
| How do I get a domain live? | [`doc/deployment.md`](doc/deployment.md) |
| Which DNS record exactly? | [`doc/dns.md`](doc/dns.md) |
| How do I deploy, roll back, turn it off? | [`doc/operations.md`](doc/operations.md) |
| How do I change the text? | [`doc/content.md`](doc/content.md) |
| What does a crawler get, and how do I check it? | [`doc/architecture.md`](doc/architecture.md#prerendering-and-hydration), [`doc/deployment.md`](doc/deployment.md#checking-what-a-crawler-sees) |
| Which design styles exist, what may one change? | [`doc/styles.md`](doc/styles.md) |
| What do sites report to the CRM, and what must the CRM do? | [`doc/visit-tracking.md`](doc/visit-tracking.md) |
| How do I add a contact form? | [`optional/contact-form/README.md`](optional/contact-form/README.md) |
| How do I add an embed lawfully? | [`optional/consent/README.md`](optional/consent/README.md) |

Skills for building sites from this template live in `.claude/skills/` and are
copied into every site: `do-this` (an existing site to a live preview, in four
gated phases: copy and first design, questions, build, deploy to dev),
`new-site` (nothing to copy from) and `deploy-dev` (Phase 4: repository,
roles, Terraform with Zone.ee DNS, deploy, CRM registration). Each phase stops
for Harry's "proceed".
