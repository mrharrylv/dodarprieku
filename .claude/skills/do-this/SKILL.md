---
name: do-this
description: Rebuild an existing company website as a new modern site on HA Group's WEBSITE_TEMPLATE, in four gated phases. Use when Harry gives a website URL and says "copy this website", "do this", "create the POC", or asks to remake, redo or modernise a client's site. Each phase ends in a report and waits for Harry's "proceed"; "deploy to dev" is the last phase.
---

# Do this: original website to a live preview, in four phases

Input: the URL of the original site, plus any company facts Harry gives.
Output, phase by phase: a copy of the template in its own folder with a first
design to look at; his answers to the feature questions; a finished site;
and, when he says so, `https://<slug>.hagroup.lv` registered in the CRM.

**The gates are the point.** Every phase ends with a short report and then
stops. Nothing in the next phase starts until Harry says "proceed" (or
answers the questions, or says "deploy to dev"). He is away for hours at a
time; a phase that runs ahead of its gate is work he did not ask for.

| Phase | Harry says | You deliver | Then |
| --- | --- | --- | --- |
| 1. Copy | "copy this website <url>", "do this" | the folder, the crawl, a first design, the local URL and screenshots | stop |
| 2. Questions | "proceed" | one numbered message: WhatsApp, contact form, map, booking, photos, facts | stop |
| 3. Build | his answers, or "proceed" (defaults) | the finished site, all checks green, committed on `main` | stop |
| 4. Deploy | "deploy to dev" | the `deploy-dev` skill: repo, roles, Terraform with DNS, deploy, CRM entry, the link | done |

If he answers a later phase's question early (the WhatsApp number with the
URL, say), keep it and skip that question; the gate still holds. If he says
"just do all of it", still post each phase's report, but do not wait.

Harry has the clients' consent to use their content, logo and photos. Photos
and the logo are **referenced from the original site's URLs, never downloaded
into the repo**, unless the old site is http only (then `public/media/`).

Rules that bind every phase: the template's `CLAUDE.md`, `doc/house-style.md`
(Harry's standing design rules, all of them), `doc/styles.md`, `doc/content.md`
("Changing the languages"). No em dashes, tokens not hex, i18n for every
string, key-identical locales, no invented facts.

---

## Phase 1: copy, crawl, first design

### 1.0 Find the template

The template is `~/Dev/HAGroup/WEBSITE_TEMPLATE` on Harry's Mac, and
`github.com/mrharrylv/ha_website_template` (branch `master`). The GitHub
repository never deploys: its workflow triggers are disabled on purpose, and
`bin/init-site.sh` re-enables them in every copy.

- On the Mac: use the folder in place.
- In a cloud session: `git clone` the GitHub repository, or connect the
  HAGroup folder and `tar czf` it (exclude `node_modules .git .claude/worktrees
  dist coverage .terraform`) into `HAGroup/.claude/tmp/`, stage that one file
  and unpack it in the container.

### 1.1 Crawl the original site, all of it

1. Fetch the start page, find the menu, every internal link and the language
   switcher. List every language and its URL prefix; note which language the
   bare `/` serves (that becomes the default).
2. Fetch every page in every language: home, about, every service and
   sub-page, projects or gallery, contacts, legal pages.
3. Per page keep: URL, title, meta description, full body text verbatim, every
   image URL with its alt text, which image is the logo, the favicon.
4. Keep every contact and legal fact exactly as shown: legal name, company
   code, VAT, address, phones, emails, hours, bank, social links, map pin.
5. Note forms and anything needing a backend (contact, quote, booking, chat,
   login, shop). These become Phase 2's questions.

How: try `curl` first. If the egress proxy blocks the host, use the
`web-fetch` agent with an explicit list of URLs, **one URL per call,
sequentially**, asking for verbatim text and image URLs. Small sites
rate-limit: give each agent at most about 12 URLs, ask it to deliver its report
before its turn limit, and resume it for the rest.

Write what you found to `doc/source-content.md` in the new project: facts and
their source page, the media list, what could not be read, which facts are
still unknown.

### 1.2 Find the lead in the CRM

The site is for a prospect in `~/Dev/HAGroup/ha-agent/prospects.db`. Look it
up now, by name or domain, so Phase 4 can tie the site to it:

```bash
sqlite3 ~/Dev/HAGroup/ha-agent/prospects.db \
  "select country, regcode, name from companies where lower(name) like '%<word>%'"
```

Note `COUNTRY/REGCODE` in `doc/source-content.md`. Not found: say so in the
Phase 1 report; Harry decides whether to add the company first.

### 1.3 Scaffold from the template

```bash
cd ~/Dev/HAGroup/WEBSITE_TEMPLATE
bash ./bin/init-site.sh --slug <slug> --brand "<Brand>" \
  --dest ~/Dev/HAGroup/<slug> --style <style> --locales <codes> --hue <0-360>
```

- **Slug**: the company's short name, lowercase, hyphens. Dev will be
  `https://<slug>.hagroup.lv`.
- **Style**: pick from `doc/styles.md` by the business, not by taste:
  `classic` for trades, industry, B2B and local services; `cinematic` or
  `editorial` only for brands that sell mood. Delete the other style
  folders (`rm -rf src/styles/<id>`): the doc allows it.
- **Dev domain**: always `<slug>.hagroup.lv` (Harry, 2026-11-06). `init-site.sh`
  sets it by default, with `zone_dns_zone = "hagroup.lv"` and
  `enable_custom_domain = true` in `dev.tfvars`. Never leave dev on the
  CloudFront URL and never pick another dev hostname.
- **Hue**: from the logo's main colour (blue around 245, teal 190, green 150,
  red 25).
- **Locales**: exactly the original's languages; default = what its `/` serves.
  An old site with only Latvian: build lv as default and write en and ru from
  it, flagged in the report for the owner.
- **Workflow triggers**: `init-site.sh` runs
  `.github/scripts/enable-site-triggers.sh` on the copy, so `deploy.yaml` has
  `push: branches: [main]` back. Check it. A copy made any other way runs that
  script by hand; `bootstrap.sh` refuses to push while the template markers
  (`#@site `, `@template-guard`) remain.
- The script's git commit fails if the template's `.gitignore` ends in a bare
  `*` (it has done): remove that line, then `git add -A` and commit.
- `make install` in the new folder.

### 1.4 Trim the languages (the script does not)

Per `doc/content.md`: `LOCALES` and `DEFAULT_LOCALE` in `src/config/site.ts`,
the imports and `resources` in `src/i18n/index.ts`, the locale folders,
`public/theme-init.js`, `infrastructure/terraform/functions/viewer-request.js`,
and `index.html` (its `lang`, static title and description = the default
language's home `meta`, `og:locale` and alternates).

The template ships lv (default), en and ru, and its routing tests derive the
default from `DEFAULT_LOCALE`. Tests that still name a dropped language (ru,
usually) must be changed to one the site keeps; check in particular:
`App.test.tsx`, `hydration.test.tsx`, `entry-server.test.tsx`,
`context/theme-init.test.ts` (also clear the stored locale when a case says
"nothing stored"), `lib/locale-path.test.ts`, `lib/prerender.test.ts`,
`lib/head.test.ts`, `lib/structured-data*.test.ts`, `lib/crawler*.test.ts`,
`seo/*.test.ts*`, `DevelopedBy.test.tsx`, `scripts/viewer-request.test.mjs`.
Also `token-syntax.test.ts` expects 500 token uses, which only ten styles
reach: lower it once styles are deleted. Init also rewrites the brand inside
`scripts/lib/brand-images.test.mjs`; restore a neutral word there.

### 1.5 Put the content in

- **Config** `src/config/site.ts`: `SITE` (name, domain), `CONTACT`, `COMPANY`
  from the crawl. Anything the original does not publish stays a placeholder
  (the `XXX` form), never a plausible guess. Add fields you need (a second
  email) rather than dropping facts.
- **Media**: add `MEDIA_ORIGIN` (the original site's origin) to `site.ts` and
  a `src/data/media.ts` of key to path plus `mediaUrl()`. Show every picture
  with the template's `<Photo src={mediaUrl(key)} alt={t('media.<key>')} />`
  (shimmer, fade-in, lazy, not draggable, no Referer); add `priority` to the
  first-screen photo only. Add a `BrandLogo`. Check the logo on
  dark: if part of it vanishes there, show it in white on dark surfaces
  (`brightness-0 invert`), not on a light plate (Harry disliked the plate).
  Put the origin in `image_origins` in both tfvars (production's CSP
  `img-src`).
- **Alt text on every image**, written for the image's content and purpose, in
  every language. The original's alt text is usually a file name; do not reuse
  it. Do not describe what you cannot know: if a file name says nothing, leave
  that photo out.
- **Copy**: page by page into the locale JSON, every language written natively.
  Keep the original's facts and claims; fix its typos; do not add promises it
  never made (response times, prices, guarantees). Replace every template
  instruction string ("Replace this with..."). Titles at most about 45
  characters before the ` · Brand` suffix (the build fails over 60).
- **Structure**: the template has four marketing routes. Map the original onto
  them: services list and details on Services (anchor per service), story,
  principles and project gallery on About, highlights, figures, services grid,
  gallery teaser and call to action on Home. Data lists go in `src/data/`.
- **Legal copy**: the cookie and privacy policies promise no third-party
  request. Images from the original site are one: say so in every language
  (cookies `thirdParty`, privacy `sharing.hosting`) and update the cookie test.
- `public/site.webmanifest` description, then `npm run images` (icons and the
  share card from `favicon.svg`, the hue and the home hero title).

### 1.6 Design bar

Modern and calm: a dark hero band (a photo from the original dimmed under a
near-opaque scrim, so text contrast never depends on the photo) with the
`h1`, under a header that is transparent at the top and dark glass once
scrolled; a figures band, image cards, alternating image and text
sections, a gallery, a closing call to action. Then, without exception: one
`h1` per page, tokens not hex, both themes, 4.5:1 text, 44px targets, keyboard
reachable, no em dashes, no sideways scroll at 390px.

Motion and touch, on every site (Harry, 2026-11-05/06; the template has them):
- Sections, card grids and photos arrive as they scroll into view (`Section`
  reveals by default, `<Reveal stagger>` for grids); photos shimmer while
  loading and fade in. Nothing is hidden before JavaScript runs.
- Moving between pages fades the new page in (`PageTransition` in
  `SiteChrome`): no blank blink.
- Photos and photo cards cannot be dragged (`draggable={false}` on every
  `<img>`, plus the base CSS rule); a click still opens them.
- A project or gallery with several photos opens in the template's
  `<Lightbox>` pop-up (arrows, keys, swipe, thumbnails), not a separate page.
- A link into another page's section jumps straight there with no blink: give
  the section an `id` and link to `localePath(ROUTES.x, locale) + '#id'`;
  `ScrollRestoration` does the rest.
- A compact home hero. For a welding, metal or fire trade, `<Sparks />` in
  the dark hero (slow, nearly horizontal streaks, no visible source); not for
  other businesses.
- Theme: light and dark only, no "system" mode; no pure black or pure white.
  A hero that slides under a transparent header must leave no strip of page
  above it (`make a11y` checks); the footer must stand out from the last
  section in both themes.

Known template bug: `className="hidden lg:inline-flex"` on a component whose
own classes include `inline-flex` does not hide it (both utilities, later one
wins). Put the breakpoint on a wrapper `div` instead (header CTA and language
switcher in every style).

Phase 1 defaults for the features Phase 2 asks about: contact form in `mock`
mode with its demo notice, WhatsApp button on with the mobile number from the
crawl, map on as soon as the address is real. Build them in now; Phase 2 only
confirms or turns them off.

### 1.7 Check and show

- `make verify` green (read the result line). `make verify-styles` and
  `make a11y` come in Phase 3; run them now only if time allows.
- `make dev`, leave it running. Build, `npx vite preview`, and screenshot with
  Playwright: each page, both themes, 1280 and 390 wide, into
  `doc/screenshots/`. If the container cannot reach the original site, serve a
  stand-in image with `page.route()` so the layout is still checked.
- Commit on `main` (Harry: no branches, no PRs). No GitHub repo yet, and that
  is normal: do not create one; Phase 4 does.

### 1.8 Phase 1 report, then stop

A few lines: the folder, the local URL (`http://localhost:5173/<lang>`), the
screenshots (attach the home page, both themes), the style and hue chosen and
why, the CRM lead found (or not), the facts the original did not publish,
pages that could not be read. End with: "Say **proceed** and I'll ask the
feature questions." Then stop.

---

## Phase 2: the questions, once

On "proceed": post all questions in ONE message, numbered, each with its
default in brackets, so Harry can answer "defaults" or just the numbers he
wants to change. Skip any he already answered. Do not ask again afterwards:
anything left open takes its default, and an unknown fact stays a
placeholder.

1. **WhatsApp button** on every page, and its number. [yes, the mobile number
   from the old site; the owner should confirm it is on WhatsApp]
2. **Contact form**: [yes, demo mode until a backend exists; a working form
   is a `website-upgrade` item later]
3. **Map** on the contact page, shown straight away: [yes, from the address;
   no if the business has no public premises]
4. **Booking** (Google or Apple calendar) or **chat agent**: [no] (if yes,
   the UI is built and says "not connected yet"; these are paid add-ons)
5. **Photos**: keep referencing the old site's, or will the owner send new
   ones? [reference; note that they vanish when the old site goes]
6. **Logo**: use the old site's, or a text logo? [the old site's]
7. **Pages**: Home, Services, About, Contact always. Keep the old site's extra
   pages (gallery, projects, team) as sections or as pop-ups? [sections +
   `Lightbox` for 6+ photos]
8. **Languages**: confirm the set and the default found in the crawl.
   [as crawled]
9. **Company facts** the old site did not publish: registration number, VAT,
   registered address, bank. [placeholders; never invented]
10. **Production domain**: the old site's domain, on the day they switch?
    [yes, in `prod.tfvars` only; prod is never deployed by this process]
11. **CRM lead**: confirm `COUNTRY/REGCODE` from 1.2. [as found]
12. Anything else the old site had (shop, login, newsletter, social feed):
    one line each on what you propose. [UI only, "not connected yet"]

Then stop and wait for his answers.

---

## Phase 3: build it up until it is good

Apply the answers:

| Answer | Change |
| --- | --- |
| WhatsApp | `CONTACT.whatsapp` = digits with country code; `''` only if the owner says no |
| Contact form | Leave `VITE_CONTACT_MODE` at `mock` and keep the demo notice. If "no", remove the form from the contact page and keep the details |
| Map | `MAP` in `site.ts` is built from `CONTACT.address` (`doc/content.md`, "The map"); the cookie and privacy pages name it in every language while on. Off: `MAP = null` and drop that copy |
| Booking or chat | The UI with the template's components, validated input, a clear "not connected yet, call or write to us" state in every language; no third-party widget |
| Photos, logo | As in 1.5; new photos go to `public/media/` with alt text in every language |
| Pages | `src/data/projects.ts`, a grid of `Photo` cards, each opening `Lightbox`; route through `ROUTES` and the nav |
| Facts | `COMPANY` in `site.ts`; unknown stays `XXX` |
| Production domain | `domain_name` in `prod.tfvars` and `domain: '<domain>'` in `site.ts`; nothing deployed |
| Visit statistics | Nothing to do: every page reports cookieless page views and time on page to Harry's CRM (`crm.hagroup.lv`, `doc/visit-tracking.md`) and the legal pages describe it. Never remove `useVisitTracker` from `SiteChrome` or the statistics copy from `legal.json`. If the old site had Google Analytics, a tag manager or a pixel, do not carry it over |

Then:

- `make verify`, `make verify-styles` and `make a11y` must pass (`make a11y`
  needs `npx playwright install chromium` once). In a cloud container without
  registry access, install Terraform from releases.hashicorp.com and put the
  AWS provider zip under
  `~/.terraform.d/plugins/registry.terraform.io/hashicorp/aws/<v>/linux_amd64/`.
- Screenshots again, every page, both themes, 1280 and 390; check
  `scrollWidth` and that no element's right edge passes the viewport.
- Read every locale string once more for template leftovers and em dashes.
- `public/site.webmanifest` description and `npm run images` if the brand,
  hue or home title changed.
- Commit on `main`. No WAF: the template ships without one and the new site
  stays that way (Harry, 2026-10-29: about 9 USD a month per site).

Phase 3 report, then stop: what changed since Phase 1, the screenshots, the
check result lines, every fact still a placeholder, and: "Say **deploy to
dev** and it goes to `https://<slug>.hagroup.lv`." Do not deploy, do not
create the GitHub repo and do not run `infrastructure/aws/setup.sh` before
that.

---

## Phase 4: deploy to dev

On "deploy to dev": follow the `deploy-dev` skill in this folder, start to
finish. In short, `./infrastructure/bootstrap.sh --yes` on the Mac creates
the GitHub repository, the OIDC roles, pushes `main`, sets the Zone.ee
secrets, runs the Terraform Infrastructure workflow (bucket, CloudFront,
certificate, and the `<slug>.hagroup.lv` DNS records at Zone.ee), then the
deploy; then the site is registered in the CRM
(`ha-agent/scripts/register_site.py`) so its visits show on the lead's page.

The final report is the link, with a `?ref=` for the e-mail to the client:
`https://<slug>.hagroup.lv/?ref=offer-<yyyy-mm>`.

Prod's apex and any domain outside Harry's ZoneID stay manual (`doc/dns.md`),
and prod is never deployed by this process.
