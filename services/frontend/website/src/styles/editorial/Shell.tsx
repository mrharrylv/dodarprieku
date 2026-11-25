import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The editorial shell: masthead, page, colophon.
 *
 * Same three shared pieces every shell renders, in the same places: the skip
 * link first in the tab order, `SiteChrome` (scroll restoration, progress bar,
 * back to top, WhatsApp), and a focusable `main` carrying `MAIN_CONTENT_ID`.
 * `tabIndex={-1}` is what lets the skip link move focus rather than only
 * scroll; without it the next Tab returns to the navigation.
 *
 * The background is painted here so the page is paper from edge to edge: no
 * section below sets a surface of its own.
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
