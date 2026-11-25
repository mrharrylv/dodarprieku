import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Bento: the home page as a grid of tiles, one per destination.
 *
 * Twelve columns on a desktop, six on a tablet, one on a phone. Large corners,
 * flat surfaces, a hairline border, an accent tile where the visitor is meant
 * to act. It suits a business with six or more things to offer and no obvious
 * order to put them in: a grid states them all at once instead of ranking them
 * down a long page.
 */
const bento = {
  id: 'bento',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default bento
