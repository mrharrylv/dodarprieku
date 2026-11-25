# Long scroll

One page. The whole business, top to bottom, with the form at the end.

**Shape.** Six full-width bands in sequence: hero, highlights, services,
about, process, contact. The hero is the cover; the five after it each open
with a numbered hairline rule and a large heading, and the bands alternate
between the page, sunken and raised surfaces so the seams are visible
without a single border being decorative. No cards anywhere: the services
are full-width rows, the highlights are columns under a rule, and the
process steps are divided by a line rather than boxed. The hero fills most
of the first screen, with the dot grid drifting behind it and a scroll cue
at the bottom.

**Navigation.** A masthead, not a menu bar: the brand in small wide-tracked
capitals on the left, four links in the middle, language, theme and a contact
button on the right. The link for the band currently in view is accented and
carries a short underline that grows from the left. Under `lg` the links
become a numbered list in a panel below the header.

The links are real route links with real hrefs, and they behave like anchors
because all four routes render the same document and scroll to a band, on
every activation and not only on the first. That keeps middle-click, "open in
new tab" and every link anyone has ever shared working, which a nav built
from `#hash` strings gives up.

**The four routes, and the canonical.** Services, About and Contact are real
routes, because `NAV_LINKS` is built from `ROUTES`. Each one renders the same
one-page composition, carries its own `<Seo>` title and description, and
scrolls to its band. All four pass `path={ROUTES.home}` to `<Seo>`, so the
canonical URL and the `hreflang` alternates of every route are the home
page's. That looks like a bug and is not: the four routes serve identical
body text, and four URLs claiming to be canonical for the same content is
duplicate content, with the crawler picking a winner and splitting the
ranking across the losers. One canonical says the true thing, that this is
one page with four ways in. The comment in `ServicesPage.tsx` says so at the
point where someone would otherwise "fix" it.

The crawler files follow the pages, not `ROUTES`: `sitemap.xml` and
`llms.txt` list each language's home page (and the legal pages), never
`/services`, `/about` or `/contact`, because those pages name the home page as
canonical. `src/entry-server.test.tsx` holds the files to the pages' heads
for this style as for every other.

**Type and colour.** One typeface. `tokens.css` repoints `--font-display` at
Inter, the body family, so headings are told apart by weight and tracking
rather than by a second voice; six big headings down one scroll is too many
for a display face. Corners are near square, because a page of rules and
seams has nothing to round. Colour is the base palette, untouched, in both
themes and at every brand hue.

**Motion.** `<Reveal>` on each band's heading and on the items inside it, so
content arrives as it is reached rather than all at once. The hero fades its
eyebrow in and then staggers the headline, the subtitle and the buttons by a
few tens of milliseconds with `.animate-rise-in`, and the dot grid behind it
uses `.animate-drift`. The scroll from a route to its band is CSS:
`html { scroll-behavior: smooth }` in the base layer does it, and the
reduced-motion block turns it off. Nothing here listens to scroll.

**Accessibility notes.**

- One `h1`, the hero's, on all four routes, because all four are the same
  document. Every band opens with an `h2`, items inside are `h3`, and the
  values list inside the about band is `h4`. No level is skipped.
- The nav highlight comes from an `IntersectionObserver` watching the six
  bands, never a scroll handler: a scroll listener on a page this long is the
  difference between a header that costs nothing and one that makes a
  mid-range phone stutter. When no band is in view (the shared legal pages and
  the 404 render in this shell too) the highlight falls back to the URL.
- The active link carries `aria-current="true"`, the current item of a set,
  rather than `"page"`, which would claim the reader is on another document
  when they never leave this one. The underline is an empty,
  `aria-hidden` span, so it never joins the link's accessible name and colour
  is never the only signal.
- Every band id and every service row carries `HEADER_OFFSET`, the one place
  the sticky header's height is answered, so nothing lands underneath it at
  any width. A service row keeps its slug as an anchor and a fragment beats
  the route's own band, so an old `/services#delivery` link still lands on the
  delivery row rather than on the band heading above it.
- The skip link matters more here than in a multi-page style: it is the only
  way past the header without scrolling through the entire business.
- The phone menu locks the page behind it, closes on Escape with focus
  returned to the button that opened it, and closes on navigation. Every
  tappable thing is at least 44px.

**Suits.** A business with one offer: a trade, a single-site clinic, a
consultancy that does one thing. Everything a customer needs is on one page,
in the order they would ask for it, and the form is where the page ends.

**Avoid when.** The business has several distinct audiences or product lines
that each need their own page, a shop, a blog, or anything that will keep
growing. A one-page site that keeps growing becomes a very long page.

**Changes here.** `tokens.css` overrides `--font-display`, the five
`--radius-*` values and the two `--container-*` widths. No colour token is
touched.
