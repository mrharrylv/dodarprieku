import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The long-scroll shell: masthead, one very long document, footer.
 *
 * Identical in structure to every other shell, because these five pieces are
 * the contract: the skip link first in the tab order, `SiteChrome` (scroll
 * restoration, the progress bar, back to top, WhatsApp) anywhere inside, and a
 * focusable `main` carrying `MAIN_CONTENT_ID`. `tabIndex={-1}` is what lets
 * the skip link actually move focus; without it the link scrolls and focus
 * stays in the header, so the next Tab goes straight back to the navigation.
 *
 * The skip link matters more here than in a multi-page style: on this site
 * "skip to content" is the only way past the header without scrolling through
 * the entire business.
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
