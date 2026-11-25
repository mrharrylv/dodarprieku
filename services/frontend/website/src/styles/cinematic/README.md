# Cinematic

Dark first, immersive, premium. The site is dark whichever theme the visitor
picks.

**Shape.** A slim, near transparent header with the brand set in small capitals,
navigation in micro capitals with wide tracking, and a phone menu that opens as
a full panel below the header. A hero that fills nearly the screen: a rule, an
eyebrow line, one large headline, one paragraph, two buttons, and a slow wash of
accent light drifting behind all of it. Then wide open bands with a great deal
of space between them and no cards at all: three point rows separated by
hairlines, and the services as a full width index, each row one link with a
numeral and an arrow. A closing footer with the brand set large and one last
call to action above the columns.

**Navigation.** Multi-page: home, services, about, contact, each its own route.
A full panel menu under `lg`.

**Type and colour.** The base families, used differently: Outfit for display and
for every small capital label, Inter for body. Labels are uppercase at
`--text-xs`, tracked from 0.14em where the line is a whole sentence in capitals
up to 0.34em on a single index numeral, and headings run a step larger than the
template default. Squarer radii than the base, deeper shadows, a longer settle
on the easing curve, and a wider content measure.

**Motion.** More than any other style here, and all of it CSS. `<Reveal>` on
every band and every row, staggered so a row assembles rather than arriving at
once. One ambient `.animate-drift`, 24 seconds, on the `aria-hidden` wash behind
the hero and the page headers, and nothing else moves on its own. The base
layer's reduced-motion rule zeroes every duration, so a visitor who has asked
for less motion gets a static page with every element in place.

**Suits.** A restaurant, a car business, a photographer, a bar, a premium trade:
anywhere the brief is atmosphere and the business wants to look expensive.

**Avoid when.** The content is dense, long or reference-like (price tables, a
knowledge base, long legal copy beyond the shared legal pages). Dark backgrounds
cost reading speed on long text, and the generous spacing makes a content heavy
page very long. Avoid it too when the business genuinely needs to read as plain
and cheap.

## What it changes

`tokens.css` is the whole of it, and it is the only style here that changes the
meaning of the theme toggle. **Both registers are written out in full.** This
file is imported into `layer(components)` and `index.css` defines its themes in
`@layer base`, so an unqualified `:root` here would beat the base stylesheet's
`[data-theme='dark']` as well as its `:root`, and the toggle would do nothing at
all. The dark column below is `index.css`'s own dark theme, restated here so it
still wins.

| | `:root` (light) | `[data-theme='dark']` |
| --- | --- | --- |
| `--surface-page` | `ink-900` | `ink-950` |
| `--surface-raised` | `ink-800` | `ink-900` |
| `--surface-sunken` | `ink-950` | `oklch(0.115 …)` |
| `--border-subtle` | `oklch(0.30 …)` | `oklch(0.28 …)` |
| `--border-strong` | `oklch(0.575 …)` | `oklch(0.53 …)` |
| `--surface-accent-soft` | `oklch(0.27 …)` | `oklch(0.23 …)` |
| `--border-accent-soft` | `oklch(0.40 …)` | `oklch(0.34 …)` |
| `--text-primary` / `-secondary` / `-muted` | `ink-100` / `300` / `400` | same |
| `--text-accent`, `--fill-accent`, `--ring-accent` | `brand-400` | same |
| `--text-on-accent`, `--text-inverted` | `ink-950` | same |
| `--surface-inverted` | `ink-50` | same |
| `--fill-accent-hover` | `brand-300` | same |

Only the surfaces, the two borders and the accent tint differ between the two
registers: the toggle moves the page between charcoal (`#15181c`) and near black
(`#090a0d`), and the ink and accent colours that a reader actually reads are the
same in both. So the toggle changes the room the page is lit in rather than
doing nothing.

Also changed in `:root`: `color-scheme` to `dark`, so the browser paints its own
scrollbars and autofill dark; squarer `--radius-*`; much stronger `--shadow-*`,
because the base shadows are near black at 6 to 16 percent and invisible on a
black page; a longer `--ease-out-soft`, which is what makes the reveals settle
slowly; and `--container-content` at 78rem.

Everything else is composition. The pages use the shared `Container`,
`ButtonLink`, `Reveal`, `Icon`, `Seo` and `ContactForm`. `Band`, `Hero`,
`PageHeader`, `Pillars`, `ServiceIndex` and `Decor` are this style's own, and
`Band` exists because the shared `Section` sets a padding this style does not
use and `cn` does not merge class names.

## Accessibility notes

**Contrast was computed, not judged.** Every value in `tokens.css` was measured
at all six brand hues against the checks in `index.contrast.test.ts` before it
was written. Worst cases across the six hues:

| | ratio | bar |
| --- | --- | --- |
| `--text-primary` on `--surface-raised` | 13.27:1 | 4.5 |
| `--text-secondary` on `--surface-raised` | 9.81:1 | 4.5 |
| `--text-muted` on `--surface-raised` | 5.55:1 | 4.5 |
| `--text-accent` on `--surface-raised` | 5.78:1 | 4.5 |
| `--text-on-accent` on `--fill-accent-hover` | 11.00:1 | 4.5 |
| `--ring-accent` on `--surface-raised` | 5.78:1 | 3 |
| `--border-strong` on `--surface-raised` | 3.34:1 | 3 |

**`--text-muted` is not used by anything in this style.** Not in the footer, not
in the bottom bar, not on a caption. It is repointed at `ink-400` so that the
shared components which do use it (the field hint, the "optional" badge) stay
legible, but every string this style places itself is `--text-secondary` or
`--text-primary`. Muted grey on a dark ground is the first thing to go, and on a
site where both themes are dark there is no light theme to fall back on.

**The one ratio this style cannot fix** is the contact form's field error copy.
It renders in `--color-danger-600`, which is a ramp colour and a style may not
repoint a ramp. On the darkest surface available it measures 3.68:1, which is
why the contact form sits on a `--surface-sunken` band: on a raised panel the
same text would measure 2.72:1. The template's own dark theme has the same
shortfall (3.31:1) on every style, so this is not new here, but it is worse on a
site that is dark in both themes and it is worth fixing in the base ramp.

**Motion.** Nothing that moves carries meaning. The wash is `aria-hidden` and
purely decorative, the reveals only fade and lift content that is already in the
DOM and visible without JavaScript, and the arrow on a service row moves on
hover only. The base layer's `prefers-reduced-motion` rule zeroes all of it.

**Touch and keyboard.** Every link and button that stands on its own is at
least 44px tall, including the footer links and the email and phone links, which
are set to `min-h-11` rather than left as bare inline text. The one that is not
is the company name inside the copyright sentence in the bottom bar: a link
within a line of text, which is the inline exception in WCAG 2.5.8. The phone
menu opens below the header so the button that opened it stays visible, closes
on Escape, and returns focus to that button. The active navigation item is
marked by colour and by a hairline, never by colour alone.

**Layout.** No `w-screen`, no fixed width, no minimum width. Every grid drops to
one column at the narrowest size, the hero uses `svh` so its buttons are not
hidden under a phone's address bar, and the wash is clipped by its own section.
