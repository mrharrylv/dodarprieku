# House style: what every HA Group site does

Harry's standing rules for every site built from this template, learned on
Westa Marine (2026-11-04 to 11-06). They apply to a new site
(`.claude/skills/new-site`) and to a rebuilt client site
(`.claude/skills/do-this`) alike. The template already does most of them; the
right-hand column says what a new site still has to switch on or check.

## Always

| Rule | In the template | A new site must |
| --- | --- | --- |
| Pages change without a blink | `PageTransition` in `SiteChrome`: light sections fade in, a dark hero band stays solid | Keep heroes `data-theme="dark"` when they are dark |
| Menus, drawers and pop-ups never appear in a single frame | Every style's `MobileMenu` stays mounted and animates open and closed (panel grows and fades, links arrive staggered); closed it is `inert` and `aria-hidden`; reduced motion turns the animation off (`index.css`) | Never mount a menu, drawer or pop-up only while it is open |
| A link into another page's section jumps straight there (for example a "What we do" card on Home opening Services at that service) | `ScrollRestoration`: instant across pages, smooth within one | Give each target section an `id` and link with `localePath(ROUTES.x, locale) + '#id'` |
| Sections, card grids and photos arrive as they scroll into view | `Section` reveals by default, `<Reveal stagger>` for grids | Use them; nothing is hidden before JavaScript runs |
| Photos shimmer while loading, then fade in | `<Photo src alt />` | Use `Photo` for every picture |
| Photos cannot be dragged | `draggable={false}` in `Photo`, base CSS rule on `img` and `a` | Never render a bare `<img>` without `draggable={false}` |
| Alt text on every image, written for what it shows, in every language | `Photo` requires `alt` | Write it in the locale files (`common:media.<key>`); never a file name. Leave out a photo you cannot describe |
| A gallery or a project with several photos opens in a pop-up | `<Lightbox>`: arrows, keys, swipe, thumbnails | Never a separate page per project |
| Compact hero | Style heroes | Keep the home hero short enough that the next section peeks above the fold at 1280x800 |
| No WAF | No `aws_wafv2_*` resources | Never add one (Harry, 2026-10-29 and 11-06: about 9 USD a month a site) |
| Visits reported to Harry's CRM | `useVisitTracker` in `SiteChrome`: cookieless page views and time on page to `https://crm.hagroup.lv/api/track` (`doc/visit-tracking.md`); privacy and cookie copy follow it | Nothing. Send clients links with `?ref=<name>` to tell their opens apart; `VITE_ANALYTICS_ENDPOINT=off` only if a client refuses statistics |
| Cost alerts | `cost_guards.tf`: SNS email to `alert_email`, hourly request and GB alarms | Leave `alert_email` as harijs.asenieks@gmail.com unless Harry says otherwise |
| Dev at `<slug>.hagroup.lv`, DNS automatic | `init-site.sh` and `zone_dns.tf` | Nothing; "deploy to dev" is the `deploy-dev` skill |
| No em dashes, tokens not hex, both themes, 4.5:1, 44px targets, no sideways scroll at 390px | Tests and `make a11y` | Run `make verify`, `make verify-styles` and `make a11y` |

## Theme, colour, header and footer (Harry, 2026-11-06)

| Rule | In the template | A new site must |
| --- | --- | --- |
| Two themes, light and dark, no "system" mode | `ThemeToggle` switches light/dark; a first visit starts from the device's setting, read once | Nothing; never add a third state |
| Not pure black, not pure white | `ink-900`/`ink-950` are charcoal; the light page is off-white and cards are never `#fff` | Never put `#fff` or `#000` on a surface; use the tokens |
| No strip of page above the header | `make a11y` fails a page whose top row shows the page background | A hero that slides under a transparent header must use the header's exact height; draw the header's divider inside it (`after:`), never with a `border-b` that adds a pixel |
| The footer stands out from the last section | Classic: always-dark footer under an accent line | Keep the footer a distinct band in both themes |

## When the site has it (ask in the questionnaire)

| Feature | How | Default answer |
| --- | --- | --- |
| WhatsApp side button | On by default (Harry, 2026-11-06): `CONTACT.whatsapp` = the mobile number, digits with the country code; `''` removes it | Yes, always, unless the owner says no |
| Map | On by default (Harry, 2026-11-06): `MAP` in `site.ts` is built from `CONTACT.address` once the address is real. Shown straight away under the contact form, no click, in a card with the address; every footer address gets a "Show on the map" button to it. The CSP allows Google's frame by default and the cookie and privacy pages name the map only while it is on. See `doc/content.md`, "The map" | Yes, always, unless the owner says no |
| Contact form | The template's form in `mock` mode with its visible demo notice until a backend exists (`optional/contact-form`) | Yes, mock |
| Sparks hero | `<Sparks />` inside a dark `relative overflow-hidden` hero: slow, nearly horizontal streaks from off screen, no visible source | Only for trades (welding, metal, fire) |
| Projects or gallery page | A data list in `src/data/`, a grid of `Photo` cards, each opening `Lightbox` | When there are 6 or more real photos |
| Booking, chat agent, shop | Build the UI, validate input, and show a clear "not connected yet, call or write to us" state in every language; no third-party widget | Ask; Harry sells these as add-ons |
| Hotlinked photos from a client's old site | `MEDIA_ORIGIN` in `site.ts` and `image_origins` in the tfvars; named in the cookie and privacy copy | Only in `do-this` |

## Never invent

Phone, registration number, VAT, IBAN, address and photos stay placeholders
until the owner gives them (see `CLAUDE.md`, "Known unknowns").
