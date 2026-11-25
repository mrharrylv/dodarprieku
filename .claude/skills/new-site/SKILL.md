---
name: new-site
description: Start a brand-new HA Group website from WEBSITE_TEMPLATE. Use when Harry says "let's start a new project <name>", "new site" or "new project": make the folder, ask the design questionnaire, build it.
---

# New site: from "let's start a new project" to a running preview

Input: a project name, and whatever Harry says about the business.
Output: `~/Dev/HAGroup/<slug>` made from the template, built to Harry's
answers, `make verify`, `make verify-styles` and `make a11y` green, committed
on `main`, the preview running at http://localhost:5173, and a short report.

If Harry gives the URL of an existing website to remake, use the `do-this`
skill instead: it runs the same work as four gated phases (copy and first
design, questions, build, deploy to dev) and waits for "proceed" between them.
This skill is for a site with nothing to copy from; its deploy is `do-this`
Phase 4, the `deploy-dev` skill, and never happens before Harry says so.

Read before changing anything: the template's `CLAUDE.md`,
`doc/house-style.md` (Harry's standing rules: every one of them applies),
`doc/styles.md` ("Choosing one") and `doc/content.md`.

## 1. Ask the questionnaire, once

Post all questions in ONE message, numbered, each with its default in
brackets, so Harry can answer "defaults" or just the numbers he wants to
change. Do not start building before he answers, and do not ask again
afterwards: anything left open takes its default, and an unknown fact stays a
placeholder.

1. **Business**: brand name, what it does, the city. [the project name]
2. **Folder and slug**: [the name in lowercase with hyphens, at
   `~/Dev/HAGroup/<slug>`; dev will be `https://<slug>.hagroup.lv`]
3. **Existing website to take content from?** [none] (if yes: `do-this`)
4. **Languages and the default one**: [lv default, en, ru: the template's own]
5. **Look**: offer three styles from `doc/styles.md` that suit this business,
   one line each, recommend one. [classic for trades, B2B and local services]
6. **Brand colour**: a hue or the logo's main colour. [blue, 245] Does a logo
   file exist? [no: text logo]
7. **Pages**: Home, Services, About, Contact always. Extra: projects or
   gallery with pop-up photos? [no, unless there are 6+ real photos]
8. **Contact form**: [yes, demo mode until a backend exists]
9. **WhatsApp button** on every page, and its number. [yes, the mobile
   number, unless the owner says no]
10. **Map** on the contact page, shown straight away, and the address. [yes,
    always, unless the owner says no]
11. **Hero**: calm photo band, or sparks (only for welding, metal, fire
    trades). [calm]
12. **Booking** (Google or Apple calendar) or **chat agent**: [no] (if yes,
    the UI is built and says "not connected yet"; these are paid add-ons)
13. **Company facts** for the footer and legal pages: legal name,
    registration number, VAT, registered address, phone, email. [placeholders;
    never invent them]
14. **Production domain**, if known. [none yet; prod uses its CloudFront URL]

## 2. Scaffold

From `~/Dev/HAGroup/WEBSITE_TEMPLATE` (in a cloud session, see `do-this`
step 0 for reaching it):

```bash
./bin/init-site.sh --slug <slug> --brand "<Brand>" --dest ~/Dev/HAGroup/<slug> \
  --style <style> --locales <codes> --hue <0-360> [--domain <prod domain>]
```

- Dev is always `<slug>.hagroup.lv` with Zone.ee DNS; `init-site.sh` sets it.
  Never pick another dev host.
- Delete the style folders not chosen (`rm -rf src/styles/<id>`;
  `doc/styles.md`, "Deleting one") and lower `token-syntax.test.ts`'s count.
- Trim the languages exactly as `do-this` step 3 says, including the tests
  that name a language the site drops. The template is Latvian by default
  (lv, en, ru); a site that keeps that needs no language change at all.
- If the git commit at the end of `init-site.sh` fails on a bare `*` line in
  `.gitignore`, remove that line, `git add -A`, commit.
- **Workflow triggers**: the template repository ships its workflows with
  `push` and `pull_request` disabled (`#@site ` lines and `# @template-guard`
  job guards) so nothing deploys from it. `init-site.sh` re-enables them in the
  copy through `.github/scripts/enable-site-triggers.sh`; check
  `.github/workflows/deploy.yaml` has `push: branches: [main]` before the first
  push, and run that script by hand for any copy made another way.
  `bootstrap.sh` refuses to run while the markers are still there.
- `make install` in the new folder.

## 3. Build it to the answers

| Answer | Change |
| --- | --- |
| Business, facts | `SITE`, `CONTACT`, `COMPANY` in `src/config/site.ts`. Unknown values stay in the template's placeholder form (`XXX`, `+371 20 000 000`) |
| Copy | Every locale JSON, every language written natively, not translated word for word. Replace every template instruction string ("Replace this with..."). Titles about 45 characters before ` · Brand` |
| Services | `src/data/services.ts` plus the `services` namespace; each service an `id` so Home's cards jump straight to it |
| Colour | `--brand-hue` in `src/index.css` (init does it); never pick an accent step by eye, the contrast test decides |
| Logo | If there is one, a `BrandLogo` component; check it on dark: show it white on dark bands (`brightness-0 invert`), never on a light plate |
| Contact form | Leave `VITE_CONTACT_MODE` at `mock` and keep the demo notice. If "no", remove the form from the contact page and keep the details |
| WhatsApp | On by default: `CONTACT.whatsapp` = the mobile number, digits with country code; `''` only if the owner says no |
| Map | On by default once `CONTACT.address` is real (`doc/content.md`, "The map"); nothing to switch on |
| Sparks | `<Sparks />` in the home hero, which must be dark, `relative overflow-hidden`, text above it |
| Projects or gallery | `src/data/projects.ts`, a grid of `Photo` cards, each opening `Lightbox`; route through `ROUTES` and the nav; alt text for every photo |
| Booking or chat | The UI with the template's components, validated input, a clear "not connected yet, call or write to us" state in every language; no third-party widget |
| Visit statistics | Nothing to do: every site reports cookieless page views and time on page to Harry's CRM (`crm.hagroup.lv`, `doc/visit-tracking.md`) and the legal pages describe it. Never remove `useVisitTracker` from `SiteChrome` or the statistics copy from `legal.json`; if a client refuses statistics, `VITE_ANALYTICS_ENDPOINT=off` on their GitHub Environment |
| Photos | Only real ones Harry provides. None yet: the style's drawn decoration, never a stock photo that pretends to be the business |

Then `public/site.webmanifest`'s description and `npm run images` (icons and
the share card from `favicon.svg`, the hue and the home title).

## 4. Check

- `make verify`, then `make verify-styles` and `make a11y` (once per Mac:
  `npx playwright install chromium`). All three green, read the result lines.
- `make dev`, open http://localhost:5173/<default lang>, look at every page in
  both themes at 1280 and 390 wide: no blink between pages, sections reveal,
  the WhatsApp button and map are where the answers said.
- Read every locale string once more for template leftovers and em dashes.

## 5. Deliver

- Commit on `main` in the new folder (no branches, no PRs). There is no
  GitHub repo yet and that is normal: Harry creates it and attaches it as
  `origin` himself. Do not create one.
- Leave `make dev` running.
- Report in a few lines: the folder, the preview URL, which answers took
  their default, and every fact still a placeholder.
- Remind Harry that the link he sends the client can carry `?ref=<name>`
  (`https://<slug>.hagroup.lv/?ref=offer`): the CRM then shows when that
  client opened it. Nothing is sent from localhost, so the local preview never
  shows up there.
- When Harry says "deploy to dev", follow the `deploy-dev` skill (AWS roles,
  the Terraform run that also creates the `<slug>.hagroup.lv` DNS records,
  then the app deploy). Never deploy before he says so.
