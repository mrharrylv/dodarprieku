# Editorial

A magazine, set in type rather than in boxes. It reads like something with a
point of view.

**Shape.** A centred nameplate, alone, over a double black rule, with the phone
number and the theme and language controls on a thin strip above it. The
tagline belongs to the colophon and is set once, at the foot of the page. No
cards, no tinted bands, no shadows, no rounded corners: sections are told apart
by a heavy rule above the heading and hairlines between the rows. Items are
numbered from their array index and the numeral is set large and muted in the
left column, the way a contents page numbers its pieces.

**Navigation.** Multi-page: home, services, about, contact. The masthead does
not follow you down the page, and there is no hamburger: four links wrap onto
two rows at 320px, which is one tap rather than two and no overlay to trap
focus in. Back to top comes from the shared `SiteChrome`.

**The pages.** Home is a cover and a contents page: one statement set as large
as the page allows, then a numbered list of what the rest of the site says.
Services is a two-column spread, the name on the left and the writing on the
right with a rule between them, collapsing to one column below `lg`. About is
set at the prose measure throughout and opens with a drop cap. Contact keeps
the same two columns: the shared form, then the addresses behind a vertical
rule.

**Type and colour.** Fraunces for every heading, the nameplate, the standfirst
lines and the numerals in `lv` and `en`, the fallback serif in `ru` (see
Dependencies); Inter, unchanged, for body text. Headings are set big with tight
tracking (about -0.03em) and the body is held to roughly 65 characters a line.
Colour is almost absent: black rules, ink text, paper background, and the brand
accent kept for links, the drop cap and the one button per page.

**Motion.** The home headline rises in once; two home sections fade up on
first sight via the shared `Reveal`. Both are CSS, and the base layer drops
them under `prefers-reduced-motion`.

## Dependencies

`@fontsource-variable/fraunces` is already in `package.json`, so `cp -r` and
`make verify` is all this style needs. `tokens.css` imports it; nothing else
does, so it is downloaded only when editorial is the active style.
`src/styles/dependencies.test.ts` fails the build if that import ever names a
package nobody installed.

**Fraunces has no Cyrillic.** The package ships latin, latin-ext and vietnamese
subsets only. Latvian is covered by latin-ext, Russian is not, so `ru`
headings, the nameplate and the drop cap fall through the stack per glyph and
land on Palatino Linotype, Georgia or the platform serif while `lv` and `en`
get Fraunces. It degrades to a serif rather than to Inter, which is why the
stack is written the way it is, but the three languages do not look identical.
Fixing that properly means a Cyrillic-capable display serif such as Playfair
Display, and adding a package is an edit to `package.json`, which is outside a
style folder and therefore the owner's call.

**Suits.** Anyone selling judgement rather than a product: a consultancy, an
architect, a law firm, a surveyor, a translator, a clinic that wants to read
as a practice. It also carries a trade well when the copy is confident, since
a plumber with a clear price list looks better in a ruled list than in four
identical cards.

**Avoid when.** The business sells on photography (there is nowhere for a
full-bleed image to go), or the site needs more than about six navigation
entries, or the copy is a single short paragraph per page, which leaves the
rules with nothing to separate.

## What it changes

`tokens.css` overrides:

- `--font-display` to `'Fraunces Variable'` with a serif fallback stack.
  `--font-sans` is untouched.
- every `--radius-*` to `0px`, and every `--shadow-*` to `none`, so the shared
  primitives (Card, Alert, the form fields) go flat and square with the rest
  of the page instead of each needing a per component override.
- `--container-prose` to `38rem` and `--container-content` to `68rem`, for the
  narrow measure and the wider margins.
- `--surface-page` to a warm paper white in light and to the deepest ink step
  in dark, so the page reads as printed in both themes.
- `--border-subtle` one ink step stronger in both themes, because a hairline
  is now doing the work a background band used to do and has to be visible at
  1px.
- `--border-strong` to `ink-900` (light) / `ink-100` (dark). Every heavy rule
  in the style is that one token: the double rule under the nameplate, the rule
  above each section heading, the closing call to action and the colophon. The
  shared form fields pick up the same black edge.

Nothing else. `--surface-raised` stays pure white, the ramps are untouched,
and no component hardcodes a colour.

## Accessibility notes

- Exactly one `h1` per page (the intro title), then `h2` per section and `h3`
  per item. No level is skipped.
- The numerals are `aria-hidden`: they are decoration derived from the array
  index, and a screen reader already announces the list position.
- The drop cap is a `first-letter` pseudo element, so the paragraph stays one
  string. A screen reader reads the word, not a letter and then a word.
- Every tappable thing is at least 44px high: the navigation links, the
  footer links, the phone and email links, the `MoreLink` rows. Small tracked
  type sits inside a `min-h-11` flex row rather than shrinking the target.
- Active navigation is marked with `--text-accent` rather than by weight
  alone, and every link keeps the shared focus ring, which is square here
  because the radius tokens are zero.
- Colour carries no meaning on its own anywhere in the style.
- Both themes come from semantic tokens only, so there is not one `dark:`
  variant in the folder.
- At 320px every grid collapses to one column, the vertical rules disappear,
  and headings carry `break-words` so a long Latvian compound cannot push the
  page sideways.
