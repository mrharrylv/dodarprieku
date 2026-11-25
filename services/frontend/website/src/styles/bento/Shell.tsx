import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The bento shell: a floating header tile, the grid, a footer of tiles.
 *
 * The ground is the SUNKEN surface rather than the page surface, because every
 * tile on top of it is the raised one. Reverse those two and the tiles stop
 * being objects: they merge into the background and the grid reads as a page
 * with a lot of lines drawn on it. The shared legal pages paint their own
 * bands over this and are unaffected.
 *
 * The three shared pieces sit where every shell puts them: the skip link
 * first, `SiteChrome` (scroll restoration, progress bar, back to top,
 * WhatsApp) anywhere, and a focusable `main` carrying `MAIN_CONTENT_ID`.
 * `tabIndex={-1}` is what lets the skip link move focus; without it the link
 * scrolls the page and focus stays in the header.
 */
export const Shell = () => (
  <div className="flex min-h-dvh flex-col bg-(--surface-sunken)">
    <SkipLink />
    <SiteChrome />
    <Header />
    <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
      <Outlet />
    </main>
    <Footer />
  </div>
)
