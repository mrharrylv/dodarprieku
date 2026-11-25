import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The cinematic shell.
 *
 * Same three shared pieces every shell renders, in the same places: the skip
 * link first in the tab order, `SiteChrome` for scroll restoration, the
 * progress bar, back to top and WhatsApp, and a `main` that carries
 * `MAIN_CONTENT_ID` and `tabIndex={-1}`. Without that tabIndex the skip link
 * scrolls the page but leaves focus in the header, and the next Tab goes
 * straight back to the navigation.
 *
 * `bg-(--surface-page)` on the root rather than on each band: this style has
 * full bleed sections that fade into the page, and a gap between two bands
 * showing the browser's own white would be very visible here.
 */
export const Shell = () => (
  <div className="flex min-h-dvh flex-col bg-(--surface-page)">
    <SkipLink />
    <SiteChrome />
    <Header />
    <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
      <Outlet />
    </main>
    <Footer />
  </div>
)
