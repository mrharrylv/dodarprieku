# Brutalist

Raw and unpolished, on purpose. Confident, not sloppy.

**Shape.** A non-sticky header of two stacked bars under a 4px rule: brand in
uppercase with wide tracking on the first, the navigation as a row of bracketed
links on the second. Below it, each section is a numbered band closed by
another 4px rule, so the page reads as a stack of slabs rather than a scroll of
content. Grids show their own lines: cells sit on a 2px lattice inside a
bordered box, with no rounding and no elevation. The home page puts phone,
email and opening hours in a bordered strip directly under the heading, before
any selling; that strip is the one band without a number, because it is a fact
sheet rather than a section, so the home page reads 01, the strip, then 02 to
05. The footer is a dense four-cell block.

**Navigation.** Multi-page: home, services, about, contact. The bracketed row
collapses into a full-width menu below `md`, where each entry is a numbered
56px row. The current page is marked by inverting the block, not by tinting the
text.

**Type and colour.** A system monospace for both body and display
(`ui-monospace`, `SFMono-Regular`, `Menlo`), so the style downloads no font at
all. Headings are uppercase with tight leading; labels are uppercase with
0.22em tracking. Colour comes from the site's brand hue through the base
tokens and is used sparingly, on buttons and the focus ring. Sections and list
items are numbered 01, 02, 03.

**Motion.** Buttons only. A button carries a solid 5px offset shadow and presses
2px into the page on hover, over the shared button transition of 200ms, which
this style's `linear` easing makes a flat move rather than a glide. Nothing
enters on scroll, nothing fades. There is no animation library and no scroll
listener.

**Suits.** A studio, a developer, a record label, a fabricator, a garage: anyone
whose customers value not being sold to, and who would rather look capable than
polished. It is also a good fit for a business with no photography, because
nothing here is waiting for a hero image.

**Avoid when.** The business trades on warmth or luxury, the audience is
unfamiliar with the web, or the brand has soft rounded marks that would fight
the square corners.

## What it changes

`tokens.css` overrides:

- `--font-sans` and `--font-display` to a system monospace stack. No
  `@fontsource` import, so nothing is fetched.
- every `--radius-*` to `0`.
- every `--shadow-*` to `none`. Depth here is a hard offset drawn per button,
  never a blur.
- both `--ease-*` to `linear`.
- `--container-content` to `80rem`, so the grid runs closer to the edge.
- `--border-subtle` to `ink-300` (light) / `ink-700` (dark), because a page
  built from rules needs its quiet rules to be visible.
- `--border-strong` to `ink-900` (light) / `ink-100` (dark): the 4px structure
  everything hangs off.

It touches no surface or text token, and no `--brand-hue`.

## Accessibility notes

The trap in this aesthetic is contrast theatre: neutral-on-neutral, hairlines,
and a focus ring removed because it "breaks the look". None of that is here.

- **Two text tokens only.** `--text-primary` and `--text-secondary`.
  `--text-muted` is never used, on any surface, in either theme.
- **Borders got stronger, not weaker.** Both border tokens moved up in
  contrast. Control boundaries clear 3:1 with room to spare.
- **The focus ring is thicker than the base layer draws it**: 4px with a 2px
  offset, on every control this style renders itself (navigation links, the
  menu button, footer and contact links, the brand link).
- **The active page is inverted, not tinted.** `--surface-inverted` with
  `--text-inverted` is a measured pair in both themes, where an "active tint"
  would not be.
- **Ornament is hidden from screen readers.** The brackets around the
  navigation links and every 01/02/03 mark are `aria-hidden`, so a link
  announces "Services" and nothing else.
- **Headings are ordered.** One `h1` per page, in the hero. Section titles are
  `h2`, grid items `h3`. The services list has no section title precisely so
  its items can stay at `h2`.
- **Touch targets are at least 44px**, including the nav links, the menu
  button, and every phone, email and footer link.
- **Long words break rather than scroll.** Uppercase monospace at display sizes
  is wide, so the hero heading and every card title carry `break-words`. There
  is no fixed width anywhere and no `w-screen`.
- **Whole cells are links** where a cell is clickable, so the hit area matches
  what a visitor sees.
