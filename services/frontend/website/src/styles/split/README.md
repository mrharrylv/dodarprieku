# Split

Two halves that behave differently. One message, impossible to miss.

**Shape.** On `lg` and up the shell is a two column grid: the left half is the
header, held against the viewport, carrying the wordmark, an accent rule, the
tagline, the navigation as a stacked list in display type, the single call to
action, the phone and email, and the theme and language controls. The right
half scrolls: on the home page its first screen is nothing but the headline
and two buttons, and the content follows underneath. The inner pages keep the
vocabulary: a heading block on one side and its content on the other, swapping
sides every section so the page zig-zags down one hard rule.

Below `lg` there is no split at all. The left half becomes an ordinary sticky
top bar with a drop-down menu, and every section stacks into a single column in
reading order.

**Navigation.** Multi-page: home, services, about, contact, each its own route.
The navigation appears twice in the markup, once in the rail and once in the
mobile menu, both rendered from `NavList.tsx` so a link cannot exist in one and
not the other.

**Type and colour.** The base tokens. Outfit for display, at the largest sizes
the scale offers, tight tracking, left aligned and ragged right. Sunken surface
on the left half, page surface on the right, with `--border-strong` drawing the
edge between them and under every section start. Accent colour is used
sparingly and always structurally: the rule under the wordmark, the marker
beside the active nav item, the closing call to action band.

**No cards.** Lists are rows separated by hairlines, not boxes. That is the
single biggest visual difference from the other styles here, and it is also why
`tokens.css` squares the radii.

**Motion.** The hero rises in once on load, the lists on the home, services
and about pages fade in as they arrive through the shared `Reveal`, the nav
marker widens on hover and the service row arrow shifts. All CSS, all under the
base layer's reduced-motion rule. The contact details are deliberately not
animated: they are the fallback when the form fails, and a fallback should be
on screen the instant it is needed.

**Suits.** A business with one thing to say and a strong call to action: a
trade with a phone number, a single-service consultancy, a studio. It wants a
short brand name and a headline of roughly ten words.

**Avoid when.** The site has many pages or a deep navigation (the rail holds
four links comfortably and not many more), or the business needs a gallery: the
right half is about sixty percent of the screen, which is not where photography
looks its best.

## What it changes

`tokens.css` squares every `--radius-*` to 2px and switches `--shadow-subtle`
and `--shadow-card` off, so the shared Button, Field, Alert and
LanguageSwitcher match the hard edges of the pages. `--shadow-lifted` is left
alone, because the floating back-to-top and WhatsApp buttons and the skip link
genuinely do sit above the page. No colour, font or container token is touched.

One knock-on worth knowing: the language switcher marks its active option with
a raised surface and, normally, `--shadow-subtle`. With the shadow off it is
the surface change and `aria-checked` that carry it, which is enough, but it is
a slightly quieter control than in the other styles.

## Accessibility notes

- **The pinned half cannot clip.** The rail is `sticky top-0` with `h-dvh` and
  its own `overflow-y-auto`. A pinned half shorter than its content would hide
  the rest of it permanently, and "the content is short" stops being true at
  200% zoom or in a 600px-tall window. The overflow is the escape hatch.
- **It is not a scroll trap.** There is no `overscroll-behavior: contain` on
  the rail on purpose: an element with `overflow-y: auto` whose content fits is
  still a scroll container sitting at its boundary, and containing the
  overscroll there would freeze the page for anyone scrolling with the pointer
  over the left half. Every rail class is `lg:`-prefixed, so on a phone the
  question does not arise.
- **The zig-zag swaps sides, not order.** `SplitSection` flips the two halves
  with CSS `order`; the heading stays first in the DOM. A screen reader, a
  keyboard and a narrow screen all get heading then content, every section.
- **One `h1` per page**, in the hero or the page head, `h2` for every section
  and `h3` for items inside one. No level is skipped.
- **Touch targets.** Navigation items are at least 48px tall, every icon
  button 44px, and the inline email, phone and footer links are wrapped in a
  44px tall inline flex box.
- **Both themes** come free: every colour here is a semantic token, so there is
  not one `dark:` variant in the folder.
- **320px.** No fixed widths, no `w-screen`. Every grid is single column until
  `sm` or `lg`, and the display headings carry `break-words` so a long
  compound word in Latvian or Russian wraps instead of pushing the page
  sideways.
