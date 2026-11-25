# Sidebar

An app shell. A persistent left rail holds the brand and the navigation; the
content scrolls beside it. It feels like a product someone uses, not a brochure
someone reads.

**Shape.** On `lg` and up, a 16rem column runs the full height of the viewport
with its own surface and a border down its right edge: brand at the top, the
navigation as a vertical list with the current item marked, the phone number,
email and address below it, and the theme and language controls at the bottom.
Everything to the right is the content column, and it opens with a title bar
(label, `h1`, one paragraph, the actions) rather than a hero. Below that, a flat
sunken canvas carrying hairline panels. Sections are separated by a rule with a
two-digit index beside it, not by alternating bands. Vertical rhythm is `py-9`
where a marketing layout uses `py-16`, panels are `p-5` with no shadow, and the
footer is a single status bar with the legal links and the credit.

**Navigation.** Multi-page: home, services, about, contact, each its own route,
each a row in the rail. Below `lg` the rail becomes a 3.5rem top bar with a
hamburger that opens the same list as a full-height overlay.

**Type and colour.** The base tokens. Inter for body, Outfit for display,
brand hue untouched. Radii are tighter than the base, which is the one change
that reaches the shared buttons and inputs so they look like part of the same
product.

**Motion.** Almost none: one `Reveal` on the home page's first row of panels, a
fade on the mobile overlay, and hover transitions. A dense interface that
animates on scroll reads as slow.

**Suits.** A SaaS, an agency with a long service list, a technical trade,
anything with more than three or four services or visitors who come back. The
phone number is on screen on every route and at every scroll position, which is
worth more to a plumber than a full-bleed photograph.

**Avoid when.** The business sells on imagery (a restaurant, a photographer, a
venue): a 16rem rail takes a fifth of the screen away from the picture. Also
avoid it for a one-page site, where the rail has almost nothing to hold.

## Accessibility notes

- **Sticky, not fixed.** The rail is `sticky top-0 h-dvh` inside its grid
  column and the whole document scrolls. A `fixed` rail beside a `main` with
  its own `overflow-y: auto` would break scroll restoration, smooth anchor
  scrolling and the shared progress bar, and can trap the keyboard inside the
  inner scroller.
- **The overlay.** `useScrollLock` freezes the page behind it, Escape closes it
  and returns focus to the button that opened it, navigating closes it, and the
  toggle carries `aria-expanded` and `aria-controls`. It sits at `z-50`, above
  the WhatsApp bubble and the back-to-top button at `z-40`.
- **Two copies of one navigation.** The rail and the overlay both render the
  complete `NAV_LINKS` set, each in a `<nav>` labelled `a11y.mainNavigation`,
  so whichever a screen reader reaches is the whole thing.
- **The active item is marked three ways**: an accent bar down its left edge, a
  tinted surface and a heavier weight. Colour alone would fail WCAG 1.4.1.
- **The two-digit indices are decoration** and every one of them is
  `aria-hidden`. Without that, a link's accessible name becomes "01 Home" and
  voice control stops matching the visible label.
- **No heading before the `h1`.** The rail's labels are paragraphs, because the
  rail renders before the page content and a heading there would put the
  document outline out of order.
- **The closing call to action is its own section.** `ActionPanel` carries an
  `h2` and sits in a band with no head of its own, on every page that has one.
  Dropped inside another section it would have to take an `h3`, and the
  outline would then file the contact prompt under an unrelated heading.
- **Touch targets.** Every nav row, footer link, contact link and control is at
  least 44px tall.
- **Contrast.** No colour token is redefined, so every ratio the base palette
  was measured at still holds, at all six brand hues and in both themes. One
  pair is worth naming, because the shared suite does not cover it: it
  measures text against the page, raised and sunken surfaces only, and this
  style also sets text on `--surface-accent-soft` (the active nav row, the
  number chips, the action panel). Computed by hand at all six hues, the worst
  case there is `--text-accent` at 4.79:1 light and 6.74:1 dark, with
  `--text-secondary` at 6.95:1 and `--text-primary` at 16.32:1 in light. All
  of them clear 4.5:1.

**Changes here.** `tokens.css` redefines the radius scale and
`--container-content`, and nothing else. The pages compose this folder's own
`PageHead`, `Band`, `Panel`, `RowLink` and `ActionPanel` on top of the shared
`Container`, `Button`, `Icon`, `Reveal`, `Seo` and `ContactForm`.
