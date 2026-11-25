import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Editorial: a magazine, set in type rather than in boxes.
 *
 * A serif nameplate over a double rule, headings set large in Fraunces with
 * tight tracking, body text held to a narrow measure, and hairline rules where
 * other styles reach for a tinted band. Items are numbered from their array
 * index, the way a contents page numbers its pieces. No cards, no shadows, no
 * rounded corners.
 *
 * It suits anyone selling judgement rather than a product: a consultancy, an
 * architect, a law firm, a surveyor.
 */
const editorial = {
  id: 'editorial',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default editorial
