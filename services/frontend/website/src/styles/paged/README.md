# Paged

The home page is a deck. Five full screens, one idea each, and a dot down the
right edge telling you which one you are on.

**Shape.** A 4rem rule across the top holding the brand set small in letterspaced
capitals, four numbered links, language and theme. Under it the home page runs as
five screens: the promise, three counted reasons, the list of services, one large
paragraph about the business, and a dark closing screen with the call to action.
Every screen centres its content and fills the viewport minus the header. No
cards anywhere: separation is done with hairlines, which is what stops a large
screen looking like a small box floating in it. Services, about and contact are
conventional pages that keep the same rhythm: a tall opening, then tall bands.
Services and about alternate page and sunken and close on an inverted call to
action; contact is the form and the details beside it on one band, and stops
there, because a page whose whole job is the form does not need to ask again at
the bottom of it.

**Navigation.** Multi-page. The deck is the home page's idea, not the site's,
because reference material (four services, opening hours, a form) belongs on a
page you can scroll and search normally. A full-screen menu under `md`.

**Paging.** CSS, not JavaScript. `tokens.css` sets `scroll-snap-type: y proximity`
on the document and `scroll-snap-align: start` on each screen, scoped with
`:has(.paged-deck)` so only the home page snaps. Proximity, never mandatory:
mandatory snapping takes the scroll away from someone reading a screen taller
than their viewport, which on a phone held sideways is most screens. Screens are
`min-height`, so one with a lot of content simply grows and scrolls. A browser
without `:has()` gets a long home page that reads correctly.

**Type and colour.** One typeface: Outfit, already loaded by the base layer,
used for body text as well as display. Set large, with wide letterspacing on the
small capitals that label things. The colour tokens are untouched, so both
themes come free.

**Motion.** A drifting chevron under the first screen, the dot growing as it
becomes current, an arrow nudging on hover, and the browser's own smooth
scrolling. All CSS, all under the base layer's reduced-motion rule, and the
smooth scroll is switched off explicitly under `prefers-reduced-motion`.

**Suits.** One strong proposition. A product, a single service sold well, a
studio, a trade whose argument is short. It gives a small amount of copy the
room to look deliberate.

**Avoid when.** The business has a lot to say, a long catalogue, or visitors who
arrive knowing what they want and hunting for a number. Paging suits an argument
made once, not a page read repeatedly.

**Accessibility.** The dot indicator is a lane of real buttons: each carries a
visually hidden name taken from the heading of the screen it goes to, each has a
44px hit area around an 8px dot, the current one carries `aria-current`, and the
whole lane is hidden below `sm` where there is no room for it. It is not a
navigation landmark: the page already has the header's and the footer's, and
none of the strings this project ships would name a third one honestly, so the
buttons carry the names instead. Both footer link rows are landmarks, the site
links named `a11y.footerNavigation` and the legal links `footer.legalHeading`,
because two identical rows where only one is announced as navigation is worse
than either choice made twice. Jumping uses `scrollIntoView` with no behaviour
argument, so the CSS decides how it moves and reduced motion switches it to an
instant jump; `scroll-margin` lands the screen below the header rather than
behind it. The current screen is tracked with an IntersectionObserver, not a
scroll listener. Nothing traps the scroll: proximity snapping and `min-height`
screens both exist so a reader is never held in place. The full-screen menu
locks the page behind it, closes on Escape, and returns focus to the button that
opened it.

**Changes here.** `tokens.css` sets `--font-sans` to Outfit, which `index.css`
already imports as the display face, so one typeface costs no second font
request. It rounds every `--radius-*`, sharpens `--ease-out-soft`, and narrows
`--container-content` to 64rem and `--container-prose` to 40rem. Those two reach
further than this folder: the shared legal pages and the 404 read in the same
narrowed column, which is the intention, since they are the same site. No colour
token is redefined, so there is no `[data-theme='dark']` block.

Beyond tokens it carries two things. The rules that do the paging, which
`doc/styles.md` permits because they are scoped to a class this style puts on
the page: the snapping hangs off `:has(.paged-deck)` and leaves with the folder.
And `--paged-header-h: 4rem`, the sticky header's height, declared once because
five things have to agree on it: the header, the overlay menu hanging under it,
a panel's height, where a snapped panel rests, and where a services anchor
lands. They all read the variable, so changing the header height is one edit
rather than five.
