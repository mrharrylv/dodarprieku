import type { SiteStyle } from '@/styles/contract'

import { Shell } from './Shell'

/**
 * Classic: the template's default, and Dod ar prieku's look.
 *
 * Sticky translucent header with the brand, the navigation and the register
 * button, around the legal pages and the 404. The map, the one page, is
 * shared (src/pages/map) and full screen.
 */
const classic = {
  id: 'classic',
  Shell,
} satisfies SiteStyle

export default classic
