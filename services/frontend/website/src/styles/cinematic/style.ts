import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Cinematic: dark first, immersive, premium.
 *
 * `tokens.css` makes the LIGHT theme dark too, so the site is dark whichever
 * theme the visitor picks and the toggle moves between two dark registers
 * rather than doing nothing. A nearly full height hero with a slowly drifting
 * wash, wide open bands separated by space instead of cards, small capitals
 * for every label, and a soft accent glow behind the primary button.
 *
 * Motion is CSS only: `<Reveal>` with staggered delays and one 24 second drift
 * on an `aria-hidden` element. Everything it does is zeroed by the base layer
 * under prefers-reduced-motion.
 */
const cinematic = {
  id: 'cinematic',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default cinematic
