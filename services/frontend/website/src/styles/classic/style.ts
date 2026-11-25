import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { AboutPage } from './AboutPage'

/**
 * Classic: the template's default, and Dod ar prieku's look.
 *
 * Sticky translucent header with the brand, the navigation and the register
 * button; card grids and alternating page and sunken bands on the About page.
 * The map, charity, registration and account pages are shared (src/pages).
 */
const classic = {
  id: 'classic',
  Shell,
  pages: {
    About: AboutPage,
  },
} satisfies SiteStyle

export default classic
