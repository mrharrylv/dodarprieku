import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'
import { HomePage } from './HomePage'
import { ServicesPage } from './ServicesPage'
import { AboutPage } from './AboutPage'
import { ContactPage } from './ContactPage'

/**
 * Split: the page is two halves that behave differently.
 *
 * On a large screen the left half is the site itself, brand, navigation and
 * the one call to action, held still against the viewport while the right
 * half scrolls through the content. The inner pages keep the same vocabulary:
 * a heading on one side, its content on the other, swapping sides each
 * section so the page zig-zags down a single hard rule.
 *
 * Below `lg` there is no split at all. The left half becomes an ordinary top
 * bar and every section stacks into one column, in reading order.
 *
 * No cards, no shadows, no rounded corners: this style states structure with
 * straight rules and a change of surface, which is why `tokens.css` squares
 * the radii the shared primitives use.
 */
const split = {
  id: 'split',
  Shell,
  pages: {
    Home: HomePage,
    Services: ServicesPage,
    About: AboutPage,
    Contact: ContactPage,
  },
} satisfies SiteStyle

export default split
