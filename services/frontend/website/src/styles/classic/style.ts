import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Classic: the template's default.
 *
 * Sticky translucent header, a hero with an eyebrow line, card grids, and
 * alternating page and sunken bands. Multi-page. It is the conventional shape
 * of a company site, which is exactly why it is the default: nothing about it
 * needs explaining to a visitor.
 */
const classic = {
  id: 'classic',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default classic
