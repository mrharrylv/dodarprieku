import { ROUTES } from '@/config/site'

/**
 * The bands of the one page, and how the four routes map onto them.
 *
 * This style is a single document. Home, Services, About and Contact all
 * render that same document; the routes survive because NAV_LINKS, the
 * sitemap, hreflang alternates and every link anyone has ever shared are
 * built from ROUTES. So a route here is not a destination, it is a starting
 * scroll position.
 */
export const SECTIONS = {
  hero: 'top',
  highlights: 'highlights',
  services: 'services',
  about: 'about',
  process: 'process',
  contact: 'contact',
} as const

export type SectionId = (typeof SECTIONS)[keyof typeof SECTIONS]

/**
 * Which navigation item a band belongs to.
 *
 * Six bands, four nav items, so two of them borrow: the highlights are still
 * the opening pitch, and the process band is an explanation of the services
 * above it. Without this the navigation would go dark for a third of the
 * scroll, which reads as broken rather than as neutral.
 */
export const ROUTE_FOR_SECTION: Readonly<Record<string, string>> = {
  [SECTIONS.hero]: ROUTES.home,
  [SECTIONS.highlights]: ROUTES.home,
  [SECTIONS.services]: ROUTES.services,
  [SECTIONS.about]: ROUTES.about,
  [SECTIONS.process]: ROUTES.services,
  [SECTIONS.contact]: ROUTES.contact,
}

/**
 * Document order, and a stable identity.
 *
 * Module scope on purpose: it is a dependency of the observer effect in
 * `useActiveSection`, and an array rebuilt on every render would tear the
 * observer down and set it back up on every render too.
 */
export const WATCHED_SECTIONS: readonly SectionId[] = [
  SECTIONS.hero,
  SECTIONS.highlights,
  SECTIONS.services,
  SECTIONS.about,
  SECTIONS.process,
  SECTIONS.contact,
]

/** A decorative band index: 1 becomes "01". Never read aloud, never translated. */
export const bandNumber = (index: number): string => String(index).padStart(2, '0')

/**
 * The offset that keeps a scrolled-to id clear of the sticky header.
 *
 * One constant because it is one number in two places: the header is `h-16`
 * and `lg:h-20` in Header.tsx, so anything a route or a fragment scrolls to,
 * a band and a service row alike, has to start that far down. Written out as
 * whole class names on purpose, since Tailwind scans this file for them.
 */
export const HEADER_OFFSET = 'scroll-mt-16 lg:scroll-mt-20'
