import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The minimal shell: a small static header, the column, a plain footer.
 *
 * The skip link comes first so a keyboard user does not tab the masthead on
 * every page, and `main` carries `MAIN_CONTENT_ID` with `tabIndex={-1}` so
 * that link actually moves focus rather than only scrolling.
 *
 * The header is deliberately not sticky and takes no z-index: in this style
 * nothing overlaps anything, so there is no stacking order to manage.
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
