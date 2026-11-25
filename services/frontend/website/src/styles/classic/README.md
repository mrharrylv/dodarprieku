# Classic

The template's default, and the reference implementation of the style
contract. Read this folder before writing a new style.

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

**Changes here.** `tokens.css` overrides nothing: this style is the base
palette exactly as `index.css` defines it.
