# Minimal

Swiss. One narrow column of type on plain paper, and almost nothing else.

**Shape.** No cards, no section bands, no shadows. A service is a number, a
heading, a summary line and a paragraph, separated by space. The only line in
the style is a hairline rule: under the masthead, above the footer, and between
the rows of a list. Every block on every page starts at the same left edge and
opens with the same gap above it, and that repetition is what the design is
made of.

**Header.** Small and static. The brand sits at body size, the four links at
small, the theme and language controls beside them. It does not stick, because
the point of the style is that nothing floats over the reading column. There is
no hamburger: under about 640px the links wrap onto their own line, which is
fewer taps than a menu and nothing to open, close or trap focus inside.

**Navigation.** Multi-page: home, services, about, contact. The current page is
marked with a rule under the word, not a colour.

**Type and colour.** One typeface. `--font-display` resolves to `--font-sans`,
so a heading is the body face at a larger size and a heavier weight, and the
hierarchy comes from size, weight and space alone. The page is white (ink at
its darkest in dark mode), the accent fill is ink rather than brand, and the
accent text stays brand, so the one filled button reads as a block of solid
ink and links still carry the site colour.

**Motion.** Almost none. There is no entrance animation and nothing moves on
scroll, which is a decision rather than an omission: on a page this quiet,
things sliding in are the loudest thing on it. What moves is hover: colour
everywhere, plus the arrow beside a text link stepping one notch right and the
filled button settling a pixel on press.

**Suits.** A designer, a photographer, an architect, a small studio, a premium
or specialist service. Anyone whose credibility is helped by restraint, and
anyone with good copy and no photography.

**Avoid when.** The business needs to shout (retail offers, discount-led
trades), the copy is thin (there is nowhere to hide a two-word paragraph), or
the brand depends on a strong second typeface or a colour field.

## What it changes

`tokens.css` overrides:

| Token | Why |
| --- | --- |
| `--container-content: 52rem` | So a wide monitor reads as a column, not a band. Every page uses the default `Container` and inherits it. |
| `--font-display` | Set to `var(--font-sans)`. One typeface, no extra `@import`. |
| `--radius-*` | All `0`. A style with no cards has nothing to round, and one rounded button would be the only curve on the page. |
| `--shadow-*` | All `none`. Nothing is lifted off the paper. |
| `--surface-page`, `--surface-raised` | Plain white on light. `--surface-sunken` is left alone so shared fields and hover states keep a fill; no section in this style uses `tone="sunken"`. |
| `--border-subtle` | One step stronger than default, because it is the only separator in the style and has to be visible. |
| `--text-primary`, `--text-secondary`, `--text-muted` | One step darker on light. The defaults already clear 4.5:1; this is a typographic choice for a long column on pure paper, not a contrast fix. |
| `--fill-accent`, `--fill-accent-hover`, `--text-on-accent` | Ink, not brand. Hue-independent and unmissable at any of the six brand hues. `--text-accent` and `--ring-accent` are untouched, so links and focus rings stay brand-coloured. |

Every one of those is written out for `:root` and `[data-theme='dark']`
together. A style's tokens are imported into `layer(components)` and `index.css`
declares both themes in `layer(base)`, and a later layer beats an earlier one
whatever the selector, so an unqualified `:root` here would repoint dark as
well as light.

The pages compose shared primitives plus the local ones in `Rhythm.tsx`:
`Page`, `Block`, `PageTitle`, `Lede`, `BlockIntro`, `Eyebrow`, `Marker`,
`RuledList` / `RuledItem` / `RowLink`, `RowTitle` / `RowLede` / `RowBody`,
`Prose`, `Actions`, `TextLinkRow`, `TextLink`. The rhythm of the reading
column lives there and nowhere else, so none of the four pages carries a
spacing utility at all: each piece brings the gap above itself, and a number
typed into a page instead is how this style stops working. The masthead and the
footer keep their own spacing, in their own files.

## Accessibility notes

- **The call to action is still obvious.** The primary action on every page is
  a real filled button, the only solid block on the page. Secondary actions are
  underlined text links, so there is never a second thing competing with it.
- **Contact details are on every page**, in the footer: email, phone and
  address, with the full table including opening hours on the contact page.
- **Touch targets.** Header links, footer links, text links and the email and
  phone on the contact page are all `min-h-11` (44px) even though they read as
  small text, and the service rows on the home page are links across the full
  row. The exception is the legal entity in the footer's bottom bar, which sits
  inside a sentence and is exempt under WCAG 2.2 SC 2.5.8.
- **Contrast.** Body copy is `--text-secondary` (ink 700 on white, about
  10:1), the smallest labels are `--text-muted` (ink 600, about 7.5:1), and the
  filled button is white on near-black. Focus rings keep the brand
  `--ring-accent`, so the one coloured thing on the page is the thing you are
  on.
- **Heading order.** One `h1` per page, the hero title. Block headings are
  `h2`, list items `h3`. The services page runs `h1` then one `h2` per service,
  since the list has no heading of its own. The contact page adds no heading
  above the shared form, whose own legend titles it.
- **The list numbers are `aria-hidden`.** They are a position, not content, and
  a screen reader already announces the list position.
- **No overlay, no focus trap, no scroll lock**, because there is no mobile
  menu to open.
