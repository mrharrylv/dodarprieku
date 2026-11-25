import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The paged shell: a slim sticky header, the deck or the page, a quiet footer.
 *
 * The header stays sticky rather than fixed so it takes part in the layout, and
 * its height is `--paged-header-h` in tokens.css, the same value a panel
 * subtracts from the viewport. One declaration, so the deck cannot drift out of
 * step with the header it has to clear.
 *
 * `tabIndex={-1}` on main is what lets the skip link move focus: without it the
 * link scrolls and focus stays in the header.
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
