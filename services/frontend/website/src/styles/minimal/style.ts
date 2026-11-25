import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Minimal: Swiss.
 *
 * One narrow left-aligned column on plain paper. No cards, no bands, no
 * shadows, one hairline weight. A service is a heading, a summary line and a
 * paragraph, separated by space. The header is small type and does not stick,
 * because nothing is allowed to float over the content.
 *
 * Everything that is usually done with a box is done here with vertical
 * rhythm, which is why every gap is declared in Rhythm.tsx and the four pages
 * carry no spacing utility of their own.
 */
const minimal = {
  id: 'minimal',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default minimal
