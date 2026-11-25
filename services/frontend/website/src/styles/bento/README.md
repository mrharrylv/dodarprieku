# Bento

The home page as a grid of tiles, one per destination. An app-store feature
page or a dashboard, rather than a scroll down a long document.

**Shape.** Twelve columns on a desktop, six on a tablet, one on a phone, with
tiles spanning different widths: a large hero two rows tall, an accent contact
tile carrying the phone number and the email above the fold, an about tile
beside it, three highlight tiles (one wide, two narrow), a tile per service in
a 7-5 / 5-7 rhythm, and one full-width accent tile to close. Band headings sit
in the grid as unsurfaced labels, so the page never breaks into sections with
their own backgrounds. Services, about and contact keep the same grid.

**Header.** A bordered bar floating on the page ground with a gap on all four
sides: the first tile on the page. The brand initial is a filled square, the
navigation is a row of chips, and the current page is a filled chip rather than
a coloured word. Under `lg` it collapses to a menu button and a tile of links.

**Type and colour.** One face, Inter, for body and headings both: the base
display face is repointed at the sans stack in `tokens.css`. Tight tracking,
small uppercase eyebrows, and numbers on the tiles that are ordered. The page
ground is the sunken surface so the raised tiles sit on top of it as objects.

**Motion.** The hero rises in once. Everything else is a hover transition on a
border, a heading colour and an arrow that shifts 4px.

**Suits.** A business with six or more things to offer and no obvious ranking
between them: a trade with several service lines, a clinic, a workshop, a
multi-service contractor. The grid states them all at once instead of making a
visitor scroll to find the one they came for.

**Avoid when.** There is one thing to sell and a single story to tell about it,
or the business has photography that deserves a full-bleed treatment. Three
services in a twelve-column grid look like a page with gaps in it.

**Changes here.** `tokens.css` enlarges every radius, sets the three shadow
tokens to `none`, points `--font-display` at `--font-sans`, and widens
`--container-content` to 78rem. It touches no colour token, so the palette and
its measured contrast are the base ones at every brand hue.

## Accessibility notes

A grid of tiles has no reading order unless it is given one, and this is where
a bento layout usually fails.

- **The DOM order is the reading order.** Tiles are written in the order they
  should be read and placed with span classes only. Nothing uses `order-*` or
  an explicit column start, so the tab order, the screen-reader order and the
  visual order are the same on every breakpoint, and the one-column phone
  layout is the same sequence stacked.
- **Heading levels follow the DOM, not the tile size.** Each page has exactly
  one `h1`, in its opening tile. A band label is an `h2` and the tiles it names
  are `h3`. A tile is never promoted to a bigger heading because it is a bigger
  rectangle.
- **One tab stop per tile.** A tile that is a link is a single anchor wrapping
  the whole tile (`TileLink`), so a keyboard visitor crossing the services band
  gets four stops, not twelve. The arrow cue at the foot of such a tile is a
  `span`, never a nested link. The contact tile is the deliberate exception: it
  is not a link tile, and its phone and email are two real, separately useful
  targets.
- **Touch targets.** Every chip, tile link row, nav item and contact row is at
  least 44px tall. The one thing that is not is the company-details link in the
  footer's bottom bar: it sits inside a sentence, and WCAG 2.5.8 exempts a link
  in a line of text precisely because padding it to 44px would break the line
  it belongs to.
- **320px.** No tile carries a base-width span class. A `col-span-12` in a
  one-column grid does not clamp, it creates eleven implicit columns and
  scrolls the page sideways, so widths start at the `sm` breakpoint and the
  phone gets one column per tile.
- **Focus.** A link tile draws a two pixel accent ring offset against the page
  ground, so the focused rectangle is visible against both the tile and the
  surface behind it.
- **Both themes** come free: every colour in this folder is a semantic token,
  and there is not one `dark:` variant in it.
