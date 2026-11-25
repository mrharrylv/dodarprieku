import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The brutalist shell: a slab of header, the content, a slab of footer.
 *
 * The order is the contract. The skip link comes first so a keyboard user
 * reaches the content without tabbing the whole navigation, `SiteChrome`
 * carries scroll restoration, the progress bar, back to top and WhatsApp, and
 * `main` needs `tabIndex={-1}` or the skip link scrolls without moving focus.
 *
 * The header is deliberately not sticky. Every section here is bounded by a
 * 4px rule, and a bar that floats over them cuts those rules in half while you
 * scroll. Back to top, from `SiteChrome`, is how you get back.
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
