import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The split shell: two halves on `lg`, one column below it.
 *
 * The grid is the whole style. Column one is the header, which spans both
 * rows so the left half runs the full height of the document; column two
 * carries the content in row one and the footer in row two. Every piece is
 * placed explicitly rather than left to auto-placement, because `SkipLink`
 * and `SiteChrome` are children too: they render absolutely and fixed
 * positioned elements, which take no grid cell, but an explicit
 * `col-start`/`row-start` means a future addition here cannot quietly push
 * the footer into a third column.
 *
 * Below `lg` the grid rules do not apply and this is a plain flex column:
 * header, content, footer, with `flex-1` on the content so a short page still
 * puts the footer at the bottom of the screen.
 *
 * The shared pieces sit where every shell puts them: the skip link first in
 * the tab order, `SiteChrome` (scroll restoration, progress bar, back to top,
 * WhatsApp) anywhere, and a focusable `main` carrying `MAIN_CONTENT_ID`.
 * `tabIndex={-1}` is what lets the skip link actually move focus; without it
 * the link scrolls and focus stays in the header.
 */
export const Shell = () => (
  <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-rows-[1fr_auto]">
    <SkipLink />
    <SiteChrome />
    <Header />
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex-1 focus:outline-none lg:col-start-2 lg:row-start-1 lg:min-w-0"
    >
      <Outlet />
    </main>
    <Footer />
  </div>
)
