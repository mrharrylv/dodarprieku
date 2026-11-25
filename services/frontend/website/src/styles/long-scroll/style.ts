import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Long scroll: one page, six bands, four ways in.
 *
 * The whole site is a single document. Home, Services, About and Contact all
 * render it and differ only in their metadata and where they scroll to, so
 * nothing ever reloads and the visitor never loses their place. The routes
 * stay real because NAV_LINKS and every link anybody has shared are built
 * from ROUTES, but the canonical URL and the hreflang of all four are the
 * home page's: there is one page, and saying otherwise would be four copies
 * of the same body text as far as a crawler is concerned. The sitemap and
 * llms.txt are built from what the pages declare, so they list the home
 * page and not the other three.
 *
 * Suits a business with one offer to make, where the answer to "what do you
 * do" fits on one screen and everything after it is evidence.
 */
const longScroll = {
  id: 'long-scroll',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default longScroll
