# Design styles

A site's look is a folder. Ten of them ship; one is active; the rest sit on
disk doing nothing until someone deletes them or switches to one.

This file is the contract a style has to meet, how to choose, add and delete
one, and the catalogue of what ships.

## Why a folder

Content and presentation were already separate in this codebase: every visible
string comes from a locale file, every list from `src/data/`, every value from
`src/config/`. None of them knows what the page looks like.

So a style is everything that does: the shell (header, navigation, footer), the
four marketing pages, the token overrides, and the motion. Putting each one in
its own folder makes the separation something you can act on. Deleting a style
is `rm -rf`. Adding one is a copy. Nothing outside a style folder names a style.

## Choosing one

```json
// services/frontend/website/site.config.json
{ "style": "classic" }
```

That is the committed choice and it is what the site ships.

```bash
VITE_SITE_STYLE=editorial npm run dev     # preview, without a commit
```

The environment variable beats the file. It exists so two styles can be
compared, or a branch previewed in CI, without changing what is committed.

**An id that is not a folder fails the build at config time**, naming the
styles that do exist:

```
[styles] "editorail" is not a style. site.config.json (or VITE_SITE_STYLE) must
name a folder under src/styles/ that contains style.ts.
Available: bento, classic, ...
```

That is deliberately loud. The alternative is an unresolved import three steps
later, which says nothing about what went wrong.

## Deleting one

```bash
rm -rf services/frontend/website/src/styles/bento
make verify
```

Nothing else changes. The contract test iterates the folders that exist, the
Tailwind exclusions are generated from the same list, and the catalogue below
is the only place a name is written down by hand.

Deleting the **active** style fails the build with the message above. That is
the one mistake worth knowing about before a cleanup.

Keeping the unused ones costs the visitor nothing, because only the active
style is bundled. It costs the repository about 20 KB each.

## Adding one

```bash
cp -r src/styles/classic src/styles/riverside
# edit src/styles/riverside/style.ts: `id` must equal the folder name
make verify
```

The contract test picks it up with no registration anywhere.

## The contract

`src/styles/contract.ts` is the type. `src/styles/styles.test.tsx` renders
every folder on disk and enforces the rest, so a style that forgets one of
these fails the build with its own name in the message.

```ts
export interface SiteStyle {
  readonly id: string          // must equal the folder name
  readonly Shell: ComponentType
  readonly pages: {
    readonly Home: ComponentType
    readonly Services: ComponentType
    readonly About: ComponentType
    readonly Contact: ComponentType
  }
}
```

### What the shell must render

| Must have | Why |
|---|---|
| `<SkipLink />` first in the tab order | Otherwise a keyboard user tabs the whole header on every page before reaching the content. |
| `<SiteChrome />` | Scroll restoration, the progress bar, back-to-top and the WhatsApp bubble. One import so a style cannot forget one. |
| A `banner` landmark | The site header. Exactly one per page. |
| `<main id={MAIN_CONTENT_ID} tabIndex={-1}>` with `<Outlet />` | The `tabIndex` is what lets the skip link actually move focus. Without it the link scrolls and focus stays behind. |
| A `contentinfo` landmark | The footer. |
| A `navigation` landmark labelled `a11y.mainNavigation`, holding every `NAV_LINKS` entry | Wrapped in `localePath()`, never a string literal. |
| `<ThemeToggle />` and `<LanguageSwitcher />` | Both themes and all three languages are not optional. |
| `<DevelopedBy />` inside the footer | The developer credit, translated around the name. |
| `<CopyrightYear />` for the footer's year, never `new Date()` | Every page is prerendered at build time. A year computed in render differs from the build's on the first January page load and fails hydration on every page, all year. |

The map (`/`, the page `isFullScreenPage()` in `src/lib/full-screen.ts` names) is the one exception: it fills the viewport, so the shell renders the skip link, `<SiteChrome />` and `main` there and leaves the header and the footer out. The map carries its own floating brand, search, register button and theme switch, and the contract test checks that every other page keeps the banner and the footer.

### What the pages must do

- Exactly **one `h1`** each. Two, or none, makes the document outline useless.
- Render `<Seo />` with the page's title, description, path and locale.
- The contact page mounts the shared `<ContactForm />`. It does not
  reimplement it.
- Every string comes from `useTranslation`, every route from `ROUTES` wrapped
  in `localePath()`.
- Render the same markup on the server as on the browser's first frame. Every
  page is prerendered and hydrated, so nothing only the browser knows (local
  storage, the window size, today's date, `matchMedia`) may decide what the
  first render shows: read it in an effect. `src/hydration.test.tsx` and the
  build's prerender check every style for this (`make verify-styles`).

The four legal pages and the 404 are shared and render inside whichever shell
is active. A style does not supply them.

### What a style may change

`tokens.css` may redefine, in `:root` and `[data-theme='dark']`:

- `--font-sans`, `--font-display`, plus the matching
  `@import '@fontsource-variable/…'` lines;
- every `--radius-*`, `--shadow-*`, `--ease-*`, `--container-*`;
- the semantic colour tokens: `--surface-*`, `--border-*`, `--text-*`,
  `--fill-accent`, `--fill-accent-hover`, `--ring-accent`, `--text-on-accent`.

A colour value must be one of four forms, because the contrast test parses them
and measures what they render as:

```css
--text-accent: var(--color-brand-700);              /* a ramp step */
--surface-raised: #fff;                             /* a hex */
--surface-sunken: oklch(0.115 0.006 var(--brand-hue)); /* hue-relative */
--border-subtle: var(--surface-sunken);             /* another semantic token */
```

Anything else fails the build naming the file and the token. A value nobody can
resolve is a value nobody has measured.

**A style may not** touch `--brand-hue` (that is the site's choice, made once in
`index.css`), redefine the brand or ink ramps, or import from another style.

**Both themes, or neither.** A style's `tokens.css` is imported into
`layer(components)`, and `index.css` defines both themes in `@layer base`.
Layer order beats selector specificity, so an unqualified `:root` here
overrides the base stylesheet's `[data-theme='dark']` block as well as its
`:root`. A style that repoints a colour for light and says nothing about dark
has therefore repointed both, and the theme toggle silently stops doing
anything. Every colour token set in `:root` must also be set under
`[data-theme='dark']`. A test enforces it.

**Two things `tokens.css` may also carry**, beyond token declarations:

- **`color-scheme`**, when the style changes which theme the page is in. The
  browser paints native scrollbars, form chrome and autofill from it, not from
  the tokens, so a dark style that leaves it at `light` gets a white scrollbar
  down the side of a black page and pale yellow autofilled inputs.
- **A page-level rule the style genuinely needs**, such as scroll snapping,
  scoped to a class the style itself puts on the page. `paged` does this:
  `html:has(.paged-deck) { scroll-snap-type: y proximity }`. Scoping is what
  makes it safe to delete the folder, so an unscoped `html { }` rule is not
  allowed.

### What a style may not do

- Add files outside its own folder.
- Hardcode a colour, a string or a route.
- Make the page scroll sideways at 320px. `overflow.test.ts` rejects a fixed
  width wider than that without `max-w-full`, a `min-w` above it, and
  `w-screen`, which is 100vw and overflows by the scrollbar width.
- Fall below 4.5:1 for text or 3:1 for a control boundary or focus ring, at any
  of the six brand hues, in either theme.

## Only the active style is downloaded

Two mechanisms, and one trap.

**JavaScript**: `vite.config.ts` aliases `@active-style` to the chosen folder,
and `App.tsx` imports from it. The others are never in the module graph.

**CSS**: Tailwind scans the whole source tree, which would put all ten styles'
utilities into the stylesheet every visitor downloads. `vite.config.ts` emits
one `@source not` per **inactive** style.

**The trap**: excluding `"./styles/**"` and re-including the active folder does
not work. An exclusion beats a later inclusion, so the active style's own
classes vanish, the site ships with no layout at all, and every test still
passes, because jsdom does no layout and nothing asserts on CSS output.
`build.test.ts` pins it. To check by hand:

```bash
npm run build
grep -c 'grid-cols-3' dist/assets/index-*.css     # a class the active style uses: expect 1+
```

## Verifying a style

```bash
VITE_SITE_STYLE=<id> make verify
```

That runs the contract test against every style, the contrast test against
every style's tokens at six hues, and the overflow test. Then look at it:

```bash
VITE_SITE_STYLE=<id> npm run dev
```

- both themes, using the header toggle;
- a phone width, with no sideways scrolling;
- Tab from the top: skip link first, a visible ring on everything;
- the language switcher keeps you on the same page.

## The catalogue

Each style has a `README.md` in its own folder with the same description, so it
travels with the code.

### Classic (`classic`)

The conventional, trust-first company website: a slim sticky header with logo, four or five nav links and one accent button, a two-column hero (headline, subline, two buttons, a supporting image) sitting on the page surface, then a stack of clearly bounded, full-width bands that alternate between the page tone and a slightly sunken tinted tone, each holding a centred heading and a grid of rounded cards with soft shadows. Proof (numbers, reviews, badges) sits mid-page, an inverted accent call-to-action band closes the home page, and a four-column footer carries the legal bar.

| | |
|---|---|
| **Layout** | Multi-page. |
| **Navigation** | Sticky top header, 64px desktop and 56px mobile, page surface with a subtle bottom border, logo left, 4 to 5 text links centre or right, one filled accent CTA (Contact or Get a quote), then the utility cluster (language switcher, theme toggle). |
| **Type** | Two-family system: --font-display (Outfit) for h1 to h3 and stat numerals at semibold, --font-sans (Inter) for everything else. |
| **Colour** | Light-first, low-drama. |
| **Suits** | Local service businesses (HVAC, installers, repair, trades) whose customers want the phone number, the services list and proof of competence within two scrolls. Professional services and B2B firms where familiarity signals reliability (consulting, legal, accounting, logistics). Sites that must work well for older or less web-fluent audiences and for search engines: predictable landmarks, crawlable multi-page structure. |
| **Avoid when** | The brand wants to look like a design studio, a startup or a fashion label: this archetype reads as conservative by design. There is only one service and one message: seven bands of grids will feel padded, a long-scroll or single-message style is better. |

**What makes it different.** It is the only archetype built entirely from horizontally bounded, full-width bands that alternate page and sunken tones with identical padding, a persistent sticky header that never transforms, cards with visible shadows and rounded corners, and a conventional multi-page route map (services, about, contact as separate pages with the same band grammar). No dark-first mood, no oversized poster typography, no bento asymmetry, no single-page anchor scrolling, no full-bleed imagery: its distinguishing quality is predictability, and every other style is defined by which of these conventions it breaks.

**Watch for.**

- Sticky header obscures focused elements when tabbing (WCAG 2.2 SC 2.4.11 Focus Not Obscured) and hides anchor targets after in-page links. Set scroll-padding-top on html equal to the header height (a --header-height token, 4rem desktop / 3.5rem mobile), add scroll-margin-top to section ids and focusable elements, and keep the header under 20 percent of the viewport on mobile, never hide-and-reveal it on scroll.
- Card grids with an entire card as a link, or a heading plus a separate 'Learn more' link, create redundant or unlabeled links and break heading order (h3 cards under an h2 band header, but the band header is sometimes styled as h3 or skipped). One link per card, on the title, stretched with a pseudo-element (::after inset-0) so the hit area covers the card, the 'Learn more' text is decorative (aria-hidden). Every band starts with a real h2 and cards use h3, the hero holds the page's only h1.

**Seen in the wild.** [HubSpot homepage](https://www.hubspot.com/), [Brody Pennell Heating and Air Conditioning](https://www.brodypennell.com/), [Deloitte Global](https://www.deloitte.com/global/en.html).

### Long scroll (`long-scroll`)

One page, one story. The whole site lives on a single vertical page: hero, services, about, process, testimonials, contact form, in that order, each in its own full-width band.

| | |
|---|---|
| **Layout** | Single vertical page built from stacked full-width bands (section elements with id anchors). |
| **Navigation** | Sticky top header (position sticky, blur backdrop) with 4 to 6 anchor links: Services, About, Process, Reviews, Contact. |
| **Type** | Display face (Outfit) for h1/h2 at --text-4xl/5xl with tight leading (1.05) and slight negative tracking, body in Inter at --text-base/lg with relaxed leading (1.6). |
| **Colour** | Light-first with a dark theme mirror. |
| **Suits** | Small service businesses with one clear offer and few services (up to about six), such as a trade, a clinic, a restaurant or a laundromat, as in the references. Sites whose primary goal is a single conversion (contact form, WhatsApp, booking) reached by scrolling. Brands that want a story-shaped pitch (problem, offer, proof, call) rather than a catalogue. |
| **Avoid when** | The business has many services that each need their own SEO landing page and metadata (one page means one title and one description). Content is long (legal, pricing tables, long service descriptions), a single page becomes tiring and the anchor menu stops orienting. |

**What makes it different.** It is the only archetype where the site is literally one document: the main nav contains no page links at all, only anchors, the current section is highlighted as you scroll, and the services, about and contact routes redirect to hashes on the home page instead of rendering their own compositions. Its visual signature is full-bleed alternating bands with a numbered eyebrow on every section and a single once-only fade-and-rise reveal, not tiles, split screens, full-page snapping or a hero-dominated landing.

**Watch for.**

- Scroll-reveal hides content: elements start at opacity 0, so a screen reader or a user with JavaScript disabled or a failed observer can meet invisible sections, reveal animation also triggers vestibular discomfort (WCAG 2.3.3). Apply the hidden starting state only under a class added by JS after the observer is created (html.js-reveal), keep aria-hidden off, and set every reveal to visible when prefers-reduced-motion is reduce. Reveal fires once, threshold 0.15, and never re-hides.
- Anchor jumps move the viewport but not keyboard focus, so a keyboard user who activates 'Contact' in the nav is still tabbing through the header (WCAG 2.4.3 focus order). Every section gets tabindex=-1 and an id, the nav click handler calls scrollIntoView then element.focus({preventScroll:true}). On load with a hash, focus the target after mount.

**Seen in the wild.** [Upstate Laundromat](https://www.upstatelaundromat.com/), [Ribalta pizzeria](https://ribalta.pt/), [Cook Collective](https://cookcollectivekitchen.com/).

### Paged (`paged`)

The site behaves like a slide deck: every section fills exactly one screen and the page snaps from one to the next as you scroll, press an arrow key or click one of the dots pinned to the right edge. Each screen carries one idea only (a headline, two or three lines and a single call to action, with a large illustration filling the rest), so the visitor is never asked to read a wall of text and always knows how far through the story they are.

| | |
|---|---|
| **Layout** | Vertical stack of full-viewport panels (min-height 100dvh, one panel per idea) inside a snap container, content inside each panel is centred in a 72rem container with a two-column split on desktop (text column about 40 percent, illustration 60 percent, alternating sides panel by panel) and a single stacked column on mobile. |
| **Navigation** | Fixed transparent header with logo left, a compact nav right (services, about, contact, language, theme) that becomes a full-screen overlay menu on mobile. |
| **Type** | Display font (Outfit) at the largest fluid sizes for one headline per panel, always a single h2 per panel (h1 only in the hero). |
| **Colour** | Presentation-first, both themes supported. |
| **Suits** | A business with a short story: three to six services, one promise, one call to action. Product-like or premium services where a single big illustration per screen carries the message (car detailing, air conditioning, a boutique studio). Owners who want the site to feel like a pitch deck and are happy to keep copy to two or three lines per screen. |
| **Avoid when** | Copy-heavy content: long service descriptions, FAQ lists, pricing tables or anything that will not fit one screen at 320px wide with 200 percent zoom. The owner expects a conventional scrolling site or will be adding blog-style content later. |

**What makes it different.** Every other archetype scrolls continuously and lets section heights follow their content, this one fixes every section to exactly one screen, snaps between them and exposes the sequence as a dot rail with keyboard paging, so the home page reads as numbered slides rather than a flowing page. It is also the only archetype that changes html-level scroll behaviour and therefore needs a per-route opt out for the contact and legal pages.

**Watch for.**

- Content trapped between snap points: with mandatory snapping, any panel taller than the viewport (small phones, 200 to 400 percent zoom, large text) cannot be scrolled to its middle, so text is unreachable (WCAG 1.4.4, 1.4.10). Panels use min-height 100dvh, never a fixed height, and overflow is allowed. A resize observer (or a CSS container check) switches the container from mandatory to proximity whenever any panel's scrollHeight exceeds the viewport, below the md breakpoint and above 150 percent zoom (detected via a media query on min-resolution or a width threshold) the site uses proximity by default.
- Scroll hijacking and motion sickness: smooth snapped page jumps and per-panel entrance animations are vestibular triggers (WCAG 2.3.3). All snapping and animation is native CSS with no wheel interception. Under prefers-reduced-motion: reduce the tokens set scroll-behavior: auto, scroll-snap-type: y proximity, and the entrance and chevron animations are removed.

**Seen in the wild.** [Tesla homepage (tesla.com)](https://www.tesla.com/), [Shaker Fitness](https://shaker.fitness/), [Ecrypt](https://ecrypt.com/).

### Bento (`bento`)

The home page is a single, tightly packed grid of rounded tiles in mixed sizes, like the "Get the highlights" panel on an Apple product page or an app-store feature wall. One large anchor tile carries the headline and primary call to action, the others each represent one destination (a service, the about story, the contact route, a review, a fact) with a short title, one supporting line and a small illustration, and the whole tile is the link.

| | |
|---|---|
| **Layout** | One content-width CSS grid (4 columns desktop, 2 tablet, 1 mobile) with fixed row height (about 11rem) and explicit column/row spans: exactly one 2x2 anchor tile, two or three 2x1 wide tiles, the rest 1x1. |
| **Navigation** | Slim sticky header (logo, main nav, theme toggle, language switcher) kept visually quiet so the grid is the loudest thing. |
| **Type** | Tile heading in the display font (Outfit) at --text-xl or --text-2xl, semibold, tight tracking, one supporting line at --text-sm in --text-secondary, anchor tile uses --text-4xl. |
| **Colour** | Mostly neutral tinted surfaces with ONE strongly tinted tile per grid (the anchor, on --fill-accent or the inverted surface) and the brand hue used as a small accent elsewhere (icon fill, hover ring, a tinted 1x1 fact tile). |
| **Suits** | Businesses with 5 to 9 distinct offerings that a visitor wants to compare and choose from quickly (repair shop with service lines, clinic with departments, agency with disciplines). Product-like or tech-adjacent brands that want a modern, organised, app-store feel. Sites whose content is short and scannable: a title, a line and a link per topic. |
| **Avoid when** | The brand depends on photography or atmosphere, bento with placeholder SVGs and no text-over-image rule feels sterile. There are only 2 or 3 services, the grid has nothing to fill and the mixed sizes look arbitrary. |

**What makes it different.** The home page is not a sequence of bands you scroll through, it is one mixed-size grid of destination tiles that shows the whole business at once, with the hero demoted to the largest tile inside the grid. Where long-scroll, editorial or split archetypes tell a story top to bottom and card-grid styles use uniform equal cards, bento uses explicit unequal spans (one 2x2 anchor, some 2x1, the rest 1x1), rounded clipped tiles on a sunken ground, and every tile as a link, so the home page functions as a map rather than a narrative.

**Watch for.**

- Visual order differs from DOM order when grid-auto-flow: dense or clever spans reorder tiles, so keyboard focus and screen-reader reading jump around (WCAG 1.3.2, 2.4.3). Never use dense. Author the tile list in reading order in src/data (anchor first, then services in order, then about, contact, review) and place tiles only with explicit col-span/row-span classes that keep that order top-left to bottom-right at every breakpoint.
- Heading structure: every tile has a heading, which produces a flat wall of h2s or, worse, mixed h2/h3 driven by tile size instead of meaning (WCAG 1.3.1, 2.4.6). Grid gets a visually hidden h2 (e.g. 'Explore Freon') or is a section aria-labelledby the anchor tile's h1, every tile heading is an h3 regardless of size. Page has exactly one h1, inside the anchor tile.

**Seen in the wild.** [Apple iPhone 17 Pro, Get the highlights](https://www.apple.com/iphone-17-pro/), [Apple MacBook Pro, Get the highlights](https://www.apple.com/macbook-pro/), [Cloud 7 (Webflow), features bento](https://cloud-7-storage.webflow.io/).

### Editorial (`editorial`)

The Editorial style makes the site read like a well set magazine or broadsheet. A large, high-contrast serif carries every headline, body copy sits in a narrow measured column, and the page is organised by hairline rules, small uppercase section labels, running numbers and a dateline rather than by coloured cards or shadows.

| | |
|---|---|
| **Layout** | Content is set on a 12-column grid inside a wide container (about 80rem) with visibly generous side margins, prose never exceeds a 44rem measure. |
| **Navigation** | A masthead, not an app bar: a tall header (about 5rem) with the brand name set in the display serif centred or hard left, a hairline rule beneath it, and a single row of small uppercase sans links with wide tracking. |
| **Type** | Display serif for all headings: a high-contrast transitional or Didone-flavoured face (Playfair Display via fontsource, which ships Latin Extended and Cyrillic for lv and ru). |
| **Colour** | Near monochrome, light-first. |
| **Suits** | Law, accountancy, notary, consultancy and advisory firms that sell judgement and want to read as authoritative. Architecture, interior and design studios whose work is best presented as a considered portfolio with captions. Publishers, journals, think tanks, foundations and cultural institutions. |
| **Avoid when** | The site needs to convert on a single call to action above the fold (trades, emergency services, quick quotes), the quiet text links underperform a bold button. Copy is thin: the style exposes short or placeholder text because there is nothing else on the page. |

**What makes it different.** It is the only archetype where the hierarchy is carried by type size and hairline rules alone: no cards, no shadows, no rounded corners, no tinted section bands, no full-bleed hero image and almost no brand colour. Where the long-scroll, bento or bold-brand styles sell with surfaces and colour, Editorial sells with a serif headline, a numbered kicker, a dateline and a measured column, so the page reads like a printed feature rather than a product landing page.

**Watch for.**

- Hairline serif display faces at weight 300 or 400 and small uppercase kickers can fall below 4.5:1 effective legibility even when the colour passes, especially on dark theme where thin strokes bloom. Keep headings at weight 400 or 500 minimum, never lighter, set kickers at no less than 0.75rem with weight 500, keep text colours on the ink ramp endpoints (ink-900 on light, ink-100 on dark) so the existing six-hue contrast test passes without any token reassignment.
- 1px rules at ink-300 / ink-700 are decorative only, if a rule is the sole indicator of a boundary (for example between form fields or nav rows) it fails the 3:1 non-text contrast requirement. Treat rules as decoration and give every interactive boundary a second cue: form inputs get a 1px --border-strong bottom border (3:1 checked), nav rows have padding and a visible focus ring, and hairlines are never the only separator for controls.

**Seen in the wild.** [The Nation](https://www.thenation.com/), [Works in Progress](https://worksinprogress.co/), [Stripe Press](https://press.stripe.com/).

### Minimal (`minimal`)

A page that is almost entirely white space and words. The header is a single thin line of small text, the content sits in one narrow column with the measure of a good book, and hierarchy comes from type size, weight and spacing rather than from cards, panels, gradients or pictures.

| | |
|---|---|
| **Layout** | One centred column at the prose width (about 40 to 44rem, 60 to 75 characters per line, following Butterick's 45 to 90 character rule). |
| **Navigation** | A single-line header: wordmark in the same size as body text on the left, three or four plain text links plus language and theme controls on the right, all at --text-sm. |
| **Type** | Type-led: one sans family for everything (swap --font-display to the same family as --font-sans, or to a grotesk such as Inter Tight or Space Grotesk if a distinct display voice is wanted). |
| **Colour** | Near-monochrome. |
| **Suits** | Professional services and consultancies that sell expertise: law, accounting, architecture, engineering, design studios. Businesses with strong written copy and weak or no photography (placeholder images will never look like a gap here). Multilingual sites: with three locales the copy length varies a lot and a single prose column absorbs that gracefully. |
| **Avoid when** | The business needs to show product or premises visually (car rental, restaurants, real estate, retail) and would be judged on pictures. The copy is thin or generic: with no decoration to hide behind, weak text is fully exposed. |

**What makes it different.** It is the only archetype with no bands, no cards, no hero image and no alternating surfaces: one white (or ink-950) surface, one 44rem column, one accent used only for links and a single button, with the header shrunk to a line of small text. Where other styles ask what to add, this one is defined by what it withholds, if a developer finds themselves adding a panel, a background tint or a second column, they have left the archetype.

**Watch for.**

- Low-contrast grey secondary and meta text: minimal sites habitually push eyebrows, captions and nav links to a light grey that fails 4.5:1, especially in dark theme. Keep --text-secondary and --text-muted at the template's tested ramp steps, do not override them in tokens.css. Small uppercase eyebrows use --text-secondary, never --text-muted, and the contrast test at six hues stays the gate.
- Invisible focus: with no borders or fills, a subtle focus style disappears and text-style buttons look like plain links. Use a 2px solid --ring-accent outline with 2px offset on every interactive element, underline all links in body copy (not colour alone), the primary action gets a visible underline or arrow plus focus ring.

**Seen in the wild.** [Frank Chimero](https://frankchimero.com/), [Robert Feasley (rfeasley.io, listed on Siteinspire typographic and Siiimple)](https://rfeasley.io/), [Gretel (listed on Siiimple)](https://gretelny.com).

### Brutalist (`brutalist`)

Brutalist is the "raw concrete" of websites: the page shows its own structure instead of hiding it. Everything sits inside a visible grid of thick, single-colour rules, corners are square, there are no shadows, no gradients and no soft tints.

| | |
|---|---|
| **Layout** | A visible, explicit grid: the content container is outlined by a border on both sides, and every section, card and column is separated by a 2px (mobile) or 3px (desktop) solid rule in the ink colour, so the page looks like a table drawn on paper. |
| **Navigation** | A header that is itself a bordered strip: wordmark in a boxed cell on the left, nav links as uppercase monospace text in individual bordered cells, theme toggle and language switcher as square boxed buttons on the right. |
| **Type** | Display: a heavy grotesque or a monospace at very large sizes, uppercase, letter-spacing between -0.02em and 0. |
| **Colour** | High-contrast, near-monochrome. |
| **Suits** | Design and creative studios, architecture and engineering firms, developers and technical consultancies that want to look direct and competent. Brands whose product is a service with clear numbered steps or a price list, since tables and grids are the native visual language of this style. Sites that must be extremely fast and light: no imagery, no shadows, no motion, small CSS. |
| **Avoid when** | The brand needs to feel warm, gentle, luxurious or reassuring (healthcare, childcare, wellness, premium hospitality). The audience is older or less web-literate and expects conventional cues: the uppercase monospace and hard inversion on hover read as harsh or broken to some users. |

**What makes it different.** Every other archetype softens something, brutalist softens nothing. It is the only style where borders, not whitespace or tone, structure the page (a visible grid of 2 to 3px rules with cells that touch), where radii are zero everywhere and shadows do not exist at all (which separates it from neubrutalism's hard offset shadows and candy colours), where the display face is monospace or a heavy grotesque set in uppercase, and where the brand hue appears only as a single flat fill rather than as tints, gradients or glows.

**Watch for.**

- Uppercase monospace body text at small sizes reduces readability, especially for dyslexic readers, and all-caps loses word shape. Uppercase only for labels, nav and headlines, body and legal pages in sentence case at or above --text-base, line-height 1.6, measure capped at --container-prose. Offer the grotesque (Inter) as the body face if the monospace fails a reading check, keep monospace for labels.
- Inverting colours on hover and focus (paper to ink) can hide the focus indicator, and a 2px outline in the ink colour disappears on an inverted button. Focus-visible uses a 3px solid outline in --ring-accent with a 2px offset on every interactive element, tested on both paper and inverted cells and in both themes, the outline colour must clear 3:1 against both surfaces (the contrast test covers this at six hues).

**Seen in the wild.** [Brutalist Websites (curated index by Pascal Deville)](https://brutalistwebsites.com/), [Are.na](https://www.are.na/), [Awwwards Brutalism collection](https://www.awwwards.com/awwwards/collections/brutalism/).

### Sidebar (`sidebar`)

Your website behaves like a well-made product rather than a brochure. A slim, always-visible navigation rail sits on the left listing every page and section in plain words, the content sits in a calm reading column beside it, and nothing slides, spins or shouts.

| | |
|---|---|
| **Layout** | Two-column app shell: a fixed 16rem (256px) left rail spanning the full viewport height, and a scrolling content region to its right. |
| **Navigation** | The rail IS the navigation: logo/wordmark at top, then a grouped list of text links (a group header in small caps muted text, then links) covering Home, Services (with the individual services nested one level under it as children), About, Contact, and a bottom group for legal pages. |
| **Type** | Single family throughout: --font-display is reassigned to --font-sans (Inter), so headings and body share one voice, which is what makes it read as a product UI. |
| **Colour** | Restrained, monochrome-first with one accent. |
| **Suits** | Technical trades and service businesses whose customers want facts, prices and process quickly (HVAC, electrical, IT support, engineering consultancies). Businesses with many services or sub-pages where a flat top nav would overflow: NN/G's finding that vertical nav 'accommodates many top-tier categories' applies directly. Companies that sell competence and tidiness rather than mood: the shell itself communicates organisation. |
| **Avoid when** | The business sells atmosphere or aesthetics (restaurants, spas, fashion, weddings): the absence of a hero band and full-bleed imagery will feel cold. There are only three or four pages, a rail with five links looks empty and wastes 256px of width for nothing. |

**What makes it different.** It is the only archetype with no horizontal header and no hero band on desktop: navigation is a permanent vertical rail occupying the left 16rem of every page, content is left-anchored beside it rather than centred, sections are separated by 1px rules instead of alternating tone bands, headings and body share one typeface, and there are no shadows or reveal animations. Every other style in the catalogue reads as a page you scroll, this one reads as a product you open.

**Watch for.**

- Mobile drawer: when the rail opens as an off-canvas panel, Tab can escape into the content behind the scrim, and screen reader users can read the hidden page (WCAG 2.4.3, 2.1.2). Render the drawer as a <dialog> element opened with showModal(), which gives native focus containment, inert background and Escape handling, on close, return focus to the hamburger button. Set aria-expanded on the button and aria-controls to the drawer id.
- Sticky elements covering content on small screens: the 56px sticky top bar plus the WhatsApp bubble plus the back-to-top button can obscure focused elements and the bottom of the contact form (WCAG 2.4.11 Focus Not Obscured, 2.5.8 target size). Set scroll-padding-top on html equal to the top bar height so anchor and focus scrolling lands below it, on viewports under 640px hide the back-to-top button entirely and pin the WhatsApp bubble with a 1rem inset and 44px hit area, add bottom padding to <main> equal to the bubble height so the last form control and footer are never covered.

**Seen in the wild.** [Linear Docs](https://linear.app/docs), [Stripe Documentation](https://docs.stripe.com/), [Vercel Documentation](https://vercel.com/docs).

### Cinematic (`cinematic`)

A dark-first, theatre-like site: the page floor is a near-black tinted with the brand hue, the hero is a full-viewport media stage with a single oversized headline, and every section is a wide, quiet band that reveals itself slowly as you scroll. One glowing accent (the brand hue at a light step) is spent sparingly on the primary button, hairline borders, focus rings and soft radial glows behind media.

| | |
|---|---|
| **Layout** | Full-bleed bands stacked vertically, media (placeholder SVG) goes edge to edge or sits in a 16:9 or 21:9 stage inside the 72rem container, text lives in a narrow measure (44rem prose or a 36rem left column) so copy floats in space, a 3-column glass-card grid for services and highlights, a bento-style 2x2 with one double-width tile for values, generous negative space, nothing touches the viewport edge except media and the header. |
| **Navigation** | Transparent, fixed header over the hero that gains a backdrop-blur and a bottom hairline once scrolled (IntersectionObserver sentinel at the top of main), logo left, 3 to 4 links centre or right, one accent CTA, mobile: full-screen overlay menu on the dark surface with staggered link reveal, language switcher and theme toggle live in the header utility cluster on desktop and inside the overlay on mobile, the footer is a wide dark band with a large wordmark, columns of links and a thin bottom bar. |
| **Type** | Display (Outfit) at the 4xl/5xl end with tight letter-spacing (-0.02em to -0.03em) and line-height 1.0 to 1.05, headlines short and fragmentary, never longer than three lines, eyebrows in xs uppercase with 0.14em tracking in --text-accent, body in Inter at base/lg with line-height 1.6 and --text-secondary, since pure white body on near-black is glaring, muted captions under media, optional monospace-feeling numerics for stats using tabular-nums, everything sans-serif, no serif anywhere. |
| **Colour** | Dark-first: the dark theme block is the design and the light theme is the safe inverse. |
| **Suits** | Premium product or technology launches where mood matters more than density: a device, a software product, an audio or automotive brand. Studios and agencies selling craft (design, film, architecture, motion) that want a portfolio feel with few words. Luxury or high-ticket services (bespoke installations, custom builds, private clinics) where the price is justified by atmosphere. |
| **Avoid when** | Local trade and service businesses whose customers want the phone number and price list in the first screen (plumbers, AC repair, car rental), the tall hero and slow reveals delay the point. Content-heavy or text-heavy sites (documentation, long legal, news) where dark bodies of text tire readers. |

**What makes it different.** It is the only archetype that is dark by design rather than dark by toggle: a 100svh full-bleed media hero with a scrim, tinted near-black floors in every band, depth from hairlines and rim light instead of shadows, one accent used as light (glow) rather than as colour, and reveals that are deliberately slow (800ms) and few. Where other styles alternate light and dark bands, cinematic stays in one dark room and modulates only how much light is in it.

**Watch for.**

- Hero text over media or a gradient field fails 4.5:1 at some crop or viewport size (WCAG 1.4.3), because contrast changes pixel by pixel. Always render a bottom-anchored scrim of --surface-page from 0 to 92% opacity behind the text block, and keep the text itself inside that scrim's solid zone, the placeholder media is capped at 55% opacity, the contrast test should add a case measuring --text-primary against the scrim's darkest stop, and the light theme uses the same scrim built from its own --surface-page.
- Body text set in a low-contrast grey to look 'cinematic' (ink-400 on ink-950) drops under 4.5:1, muted captions on glow backgrounds drop further. Body uses --text-secondary (ink-300), captions --text-muted (ink-400) only on --surface-page or --surface-sunken, never over a glow, glows are limited to 20% alpha and are placed behind media, never behind paragraphs, do not reassign --text-muted in tokens.css.

**Seen in the wild.** [Linear](https://linear.app/), [Raycast](https://www.raycast.com/), [Qase](https://qase.io/).

### Split (`split`)

The Split Screen style divides the browser into two halves that behave differently. On desktop the left panel is pinned to the viewport and carries everything that identifies the business: logo, one-line promise, the main navigation, the phone and WhatsApp contact, the theme and language controls.

| | |
|---|---|
| **Layout** | Two-column viewport grid on desktop (min 64rem): a fixed left panel occupying 36 to 40 percent of the width (clamp(18rem, 38vw, 30rem)), and a right column that takes the rest and holds all scrollable content. |
| **Navigation** | Vertical navigation list inside the fixed left panel: large text links (text-lg to text-xl), stacked, generous line height, with a thin left rule or a numbered prefix (01, 02, 03) as the active indicator. |
| **Type** | Editorial contrast: --font-display (Outfit, or swapped for a grotesk with tight tracking) at large sizes for the panel heading and band titles, body in --font-sans at --text-base with line-height 1.6, and a small-caps or uppercase tracking-wide label (text-xs, letter-spacing 0.12em) as the eyebrow above every band title. |
| **Colour** | High-contrast two-tone use of the ramp. |
| **Suits** | Studios, agencies, architects, photographers and consultancies with a short service list (3 to 6 items) and a strong single brand statement. Businesses whose contact details must stay visible at all times (a call or WhatsApp is the main conversion) since the panel keeps phone and WhatsApp on screen. Sites with modest page count where the whole story fits in one scroll and the nav doubles as a table of contents. |
| **Avoid when** | Service catalogues with many items or deep sub-pages: a fixed panel wastes 40 percent of every desktop viewport and the half-and-half rows become monotonous past eight rows. Content-heavy or SEO-driven sites where wide tables, long articles or comparison grids need the full width. |

**What makes it different.** It is the only archetype whose header is a full-height vertical panel that stays on screen while the page scrolls, with the navigation stacked vertically and numbered, and whose content is composed as alternating half-and-half spreads inside a column rather than as centered full-width sections. Every other style has a horizontal top header and a centered 72rem container, this one has neither on desktop.

**Watch for.**

- Fixed panel and sticky header cover content on short or small viewports, the panel content itself can overflow and become unreachable if it is taller than the viewport (large lv/ru headings, six nav items, contact block, controls). Panel is position sticky (not fixed) inside a grid with top: 0 and height: 100dvh, with overflow-y: auto so it scrolls internally when it overflows. Below 64rem it becomes a 56px sticky top bar only, set scroll-padding-top on html to the bar height so anchor and skip-link targets are not hidden.
- Two independent scroll containers: if the right column is made its own overflow element the document no longer scrolls, the browser's find, scroll restoration, the scroll progress bar and keyboard scrolling (Space, PageDown) break until the column is focused, and it becomes a keyboard trap for some screen readers. Do not create an inner scroll container. Let the document scroll normally and make the left panel sticky.

**Seen in the wild.** [Brittany Chiang portfolio](https://brittanychiang.com/), [Huncwot](https://huncwot.com/en), [Educated Guess](https://www.educated--guess.com/).

