import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The classic shell: sticky header, content, footer.
 *
 * Every shell renders the same three shared pieces in the same places: the
 * skip link first, `SiteChrome` (scroll restoration, progress bar, back to
 * top, WhatsApp) anywhere, and a focusable `main` carrying `MAIN_CONTENT_ID`.
 * `tabIndex={-1}` is what lets the skip link actually move focus; without it
 * the link scrolls but focus stays in the header, and the next Tab goes back
 * to the navigation.
 */
export const Shell = () => (
  <div className="flex min-h-dvh flex-col">
    <SkipLink />
    <SiteChrome />
    <Header />
    <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
      <Outlet />
    </main>
    <Footer />
  </div>
)
