import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Paged: the home page is a deck.
 *
 * Five full screens, one idea each, held on their boundaries by CSS scroll
 * snapping and navigable by a dot indicator down the right edge. Services,
 * about and contact stay conventional pages, because a deck is a way to make an
 * argument once, not a way to hold reference material.
 */
const paged = {
  id: 'paged',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default paged
