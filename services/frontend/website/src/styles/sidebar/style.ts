import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Sidebar: an app shell rather than a brochure.
 *
 * A persistent left rail carries the brand, the navigation, the phone number
 * and the theme and language controls; the content scrolls beside it in a
 * single tight column of panels. Numbered section labels, hairline rules and
 * small radii do the work a hero image does elsewhere.
 *
 * It suits a business whose visitors come back: a SaaS, an agency with a long
 * service list, a technical trade. It reads as a tool someone uses.
 */
const sidebar = {
  id: 'sidebar',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default sidebar
