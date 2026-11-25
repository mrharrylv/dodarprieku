import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Brutalist: raw and unpolished, on purpose.
 *
 * Zero radius, no shadow but a hard offset one, a system monospace, 4px rules
 * closing every band, and a grid that shows its own lines. Sections and items
 * are numbered. Nothing is soft, nothing is centred, and nothing is downloaded
 * to make the type look expensive.
 *
 * The discipline is contrast: this is the one style whose visual language
 * tempts you into low-contrast neutrals and hairlines. It uses two text
 * tokens, both measured, and a thicker focus ring than the base layer draws.
 */
const brutalist = {
  id: 'brutalist',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default brutalist
