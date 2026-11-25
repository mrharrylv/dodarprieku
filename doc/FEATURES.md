# FEATURES.md: what this product does

One row per user-visible capability. A change that adds, alters or removes a capability
updates this file in the same commit that makes the change; a commit that ships a
capability without a row here is unfinished.

| Column | Meaning |
| --- | --- |
| **ID** | Stable, zero-padded `F-001`. Never reused, never renumbered. A removed feature keeps its ID forever. |
| **Feature** | What a user can do. Not what a module is called. |
| **Status** | `shipped` / `deprecated` / `removed` |
| **Since** | Merge date and merge commit. `unknown` only for rows seeded from existing code. |
| **Tests** | The test file or command that proves it. `none` is a coverage gap, not a formatting choice. |

| ID | Feature | Status | Since | Tests |
| --- | --- | --- | --- | --- |
| F-001 | A visitor reads the site in English, Latvian or Russian, each on its own URL prefix, and switching keeps the page they were on | shipped | unknown | `src/App.test.tsx`, `src/lib/locale-path.test.ts`, `src/context/theme-init.test.ts` (where the bare root sends each visitor, before the first paint), `src/lib/default-locale.test.ts` (the root page, the 404 page and every fallback follow `DEFAULT_LOCALE`, wherever it sits in `LOCALES`) |
| F-002 | A visitor chooses light or dark, or follows the system, and the choice survives a reload with no flash of the wrong theme | shipped | unknown | `src/context/ThemeProvider.test.tsx`, `src/context/theme-init.test.ts` |
| F-003 | A visitor sends an enquiry through the contact form, and every failure mode tells them what to do next | shipped | unknown | `src/components/contact/ContactForm.test.tsx`, `src/lib/contact.test.ts` |
| F-004 | A visitor reads the privacy, cookie, terms and company pages, which never print an unreplaced placeholder as though it were real | shipped | unknown | `src/pages/legal/legal.test.tsx`, `src/lib/placeholder.test.ts` |
| F-005 | A search engine, social or AI crawler gets a canonical URL, hreflang alternates, a share card and structured data for every page, and finds every canonical page through the generated robots.txt, sitemap.xml and llms.txt, which list exactly what the pages declare; no deploy ships without them. The structured data and llms.txt publish no placeholder value and none of the template's "Replace this with..." instructions; the meta description and the share card still show that copy until real copy replaces it | shipped | unknown | `src/lib/seo.test.ts`, `src/lib/head.test.ts`, `src/lib/structured-data.test.ts`, `src/lib/structured-data.real.test.ts`, `src/lib/placeholder.test.ts` (the template's instructions in all three languages, and no false positive on the shipped copy), `src/lib/crawlers.test.ts`, `src/lib/llms.test.ts`, `src/lib/crawler-files.test.ts`, `src/entry-server.test.tsx` (sitemap.xml and llms.txt against every prerendered page's canonical and hreflang; `make verify-styles` runs it for every style), `scripts/prerender.test.mjs`, `src/lib/default-locale.test.ts` (x-default follows `DEFAULT_LOCALE`), `src/components/seo/Seo.test.tsx`, `src/components/seo/static-head.test.ts`, `src/i18n/meta.test.ts`, `src/App.test.tsx`, `.github/tests/resolve-site-url.test.sh` (a deploy build always has an https origin, a Unicode domain in its punycode form), `.github/tests/deploy-preflight.test.sh` (a build without its crawler files is never uploaded, so the live ones are never deleted) |
| F-006 | A keyboard or screen-reader visitor gets a skip link, landmarks, one h1 per page and a visible focus ring on every surface | shipped | unknown | `src/App.test.tsx`, `src/styles/styles.test.tsx`, and the prerender's one-`h1` check in `src/entry-server.test.tsx` |
| F-007 | Every colour the site paints clears WCAG 2.2 AA at any of the six brand hues, checked by computing the sRGB rendering rather than by eye | shipped | unknown | `src/index.contrast.test.ts` |
| F-008 | An operator stands up a new site by copying the template and running one script, with the brand, hue, domains and style set from flags | shipped | unknown | `bin/init-site.sh --help` |
| F-009 | An operator picks one of the shipped design styles, and deleting the folders of the others changes nothing else | shipped | 2026-09-12 | `src/styles/styles.test.tsx`, `src/styles/build.test.ts` |
| F-010 | Only the active style's CSS is downloaded: the other styles cost the visitor nothing | shipped | 2026-09-12 | `src/styles/build.test.ts`, and the build check in `doc/styles.md` |
| F-011 | A visitor sees how far through the page they are, can jump back to the top, and can open a WhatsApp chat with the business from any page | shipped | 2026-09-12 | `src/components/layout/{ScrollProgress,BackToTop,WhatsAppBubble}.test.tsx` |
| F-012 | Every page credits the developer in the visitor's own language | shipped | 2026-09-12 | `src/components/layout/DevelopedBy.test.tsx` |
| F-013 | The contact form works for review before any backend exists, and says plainly that messages are not delivered yet | shipped | 2026-09-12 | `src/lib/contact.test.ts`, `src/components/contact/ContactForm.test.tsx` |
| F-014 | A link shared to WhatsApp, Facebook, LinkedIn or Slack renders with the site's logo, name and description, on a card that survives a square crop, and the site shows an opaque icon in tabs, search results and home screens | shipped | 2026-09-12 | `scripts/lib/og-layout.test.mjs`, `scripts/lib/brand-images.test.mjs`, `scripts/lib/ico.test.mjs`, `scripts/lib/fonts.test.mjs`, `scripts/generate-images.test.mjs`, `src/components/seo/static-head.test.ts` |
| F-015 | No page scrolls sideways on a 320px screen | shipped | 2026-09-12 | `src/styles/overflow.test.ts` |
| F-016 | An operator puts a scaffolded site online with one command, which creates the repo, the roles, the infrastructure and the first deploy | shipped | 2026-09-12 | `infrastructure/bootstrap.sh --help`; exercised by the deploy runbook; `.github/tests/setup-policy.test.sh` (the deploy roles' policy: the site's CloudFront Function by its exact name, and no other site's) |
| F-017 | An owner picks from ten visibly different designs, from a one-page scroll to a tile hub to a full-screen deck, without the content changing | shipped | 2026-09-12 | `src/styles/styles.test.tsx`, `src/styles/conventions.test.ts`, `make verify-styles` |
| F-018 | A crawler that runs no JavaScript reads every page in every language as finished HTML, with its own title, canonical, hreflang, share card and structured data, and the browser hydrates that page rather than rebuilding it; any other spelling of a page's address, and an old link with no language or an unpublished one, gets a 301 to the page at the edge; a URL with no page is a real 404, shown in the address's language | shipped | pending merge (`todo/seo-search-presentation`) | `src/entry-server.test.tsx`, `src/entry-server.failure.test.tsx`, `src/hydration.test.tsx`, `src/lib/prerender.test.ts`, `src/lib/locale-path.test.ts`, `src/components/layout/ScrollRestoration.test.tsx`, `src/components/ui/Reveal.test.tsx`, `src/components/contact/ContactForm.test.tsx`, `scripts/prerender.test.mjs`, `scripts/viewer-request.test.mjs` (every 301, held to `fallbackPath`, with its one-hour Cache-Control, and the locale list to `site.ts`), `src/lib/edge-preview.test.ts` (`make preview` answers as the edge does), `src/context/theme-init.test.ts` (the default-language 404 page stays hidden at `/lv/nope` until it is rendered in Latvian, only on a prerendered document and for 3 s at most), `make verify-styles` |
| F-019 | Every page of every site made from the template ships a browser-tab icon set and a link-preview card that WhatsApp, iMessage, Telegram, Slack, Facebook, LinkedIn and X can render: title and description within search limits, complete Open Graph and Twitter tags with `og:locale` alternates, an absolute https card that is exactly 1200x630, opaque, PNG or JPEG and under WhatsApp's 300 KB limit, versioned by content hash so a redrawn card is a new URL, a 180px touch icon, a 16/32/48 `favicon.ico`, an SVG and 96px favicon and a manifest whose icons exist at their declared sizes. The build fails when any of it is wrong (placeholder copy and the placeholder favicon only warn, and fail under `SHARE_STRICT=1`); the placeholder favicon is the brand's first letter; an optional `assets-src/share-hero` photo gives a photo card | shipped | pending merge | `scripts/verify-share.test.mjs`, `scripts/lib/share-card.test.mjs`, `scripts/lib/og-layout.test.mjs`, `scripts/lib/brand-images.test.mjs`, `scripts/generate-images.test.mjs`, `src/lib/seo.test.ts`, `src/lib/head.test.ts`, `src/components/seo/static-head.test.ts` |
| F-020 | The operator sees in HA Group's CRM when each site was opened, which pages were read, for how long and how far, where the visitor came from (including a `?ref=` on the link he sent) and on what kind of device, with no cookie, nothing stored on the visitor's device, no query string sent, Do Not Track and Global Privacy Control honoured, nothing sent from localhost or an automated browser, and the page unaffected when the CRM is down; the privacy and cookie policies describe it in every language exactly while it is on | shipped | pending (2026-11-06) | `src/lib/analytics.test.ts`, `src/lib/tracker.test.ts`, `src/lib/beacon.test.ts`, `src/hooks/useVisitTracker.test.tsx`, `src/config/analytics-origin.test.ts` (the CSP's `connect-src` allows the endpoint's origin), `src/pages/legal/legal-statistics.test.tsx` |

## F-009: selectable design styles

A style is a folder under `services/frontend/website/src/styles/<id>/`: token
overrides, a shell, and the four marketing pages. Content is not part of it, so
switching styles changes how the site looks and nothing about what it says.

Deliberately not built: previewing several styles on one deployed URL, which
needs a build per style and routing at the edge to choose between them (the
site's one CloudFront Function only tidies addresses and maps a page's URL to
its file). Compare
them locally with `VITE_SITE_STYLE=<id> npm run dev`, or by switching and
deploying.

## F-017: ten designs

`doc/styles.md` is the catalogue: what each one is, what it suits, when not to
use it, the accessibility traps of that archetype, and live sites that embody
it. The ten are classic, long-scroll, paged, bento, editorial, minimal,
brutalist, sidebar, cinematic and split.

Every one passes the same bars: the rendering contract, WCAG 2.2 AA measured
at six brand hues in both themes, no horizontal scroll at 320px, and no
hardcoded colour or string. A style cannot look like anything it wants at the
cost of being unreadable.

Deliberately not built: previewing several styles on one deployed URL, which
needs a build per style and routing at the edge to choose between them.
Compare them with `VITE_SITE_STYLE=<id> npm run dev`, or by switching and
deploying.

## F-013: the mock contact form

`VITE_CONTACT_MODE` is `mock` by default. A real endpoint always wins over it,
and an endpoint that was supplied but rejected turns the form OFF rather than
falling back to mock, so a misconfiguration cannot hide behind a cheerful
"Message sent".

## F-018: prerendered pages

`npm run build` renders every route in every language, plus a `404.html`, into
its own HTML file (`src/entry-server.tsx`, `scripts/prerender.mjs`), with the
head computed by the same `pageHead()` the runtime `<Seo>` uses. The build
fails on a page that throws, renders no single `h1`, leaves out `<Seo>` or
declares the wrong canonical. `main.tsx` hydrates the page when `#root` holds
the one its address renders. At the edge, a CloudFront Function
(`infrastructure/terraform/functions/viewer-request.js`) answers any other
spelling of a page's address with a 301 to it (`/en/about/`,
`/en/about/index.html`, `//en//about`, and `/services` or `/de/services`,
which name no published language and go where `fallbackPath` sends them),
maps each page's URL to its file, and answers a missing key with `404.html`
and a 404 status. `make preview` answers through the same function. The one
`404.html` is in the default language, so at `/lv/nope` it stays hidden
until the app has rendered the Latvian not-found page, or for 3 s at most if
the bundle never runs. Every 301 carries `Cache-Control: public,
max-age=3600`, so a later change to the languages reaches returning visitors
within the hour.

Hydration leaves what the reader already has alone. The page is readable and
scrollable before React arrives, so scroll restoration does not move it, an
entrance animation does not replay on content already on screen, and the
contact form stays disabled (and is `method="post"`) until React can handle
it. Where a host serves a page at another spelling of its address (the dev
server; the edge redirects them), the address is moved to its one spelling
before React starts, so the page renders rather than the 404.

Deliberately not built: rendering on request. Anything that differs per
visitor, or changes between deploys, happens in the browser after hydration,
and a crawler sees the build's version of it.

Not covered by a behavioural test: the `X-Robots-Tag: noindex, nofollow`
header every environment but prod sends. `terraform validate` proves the
configuration is well formed, not that the header arrives; check it with
`curl -sI` after a deploy (`doc/deployment.md`, "Checking what a crawler
sees").
