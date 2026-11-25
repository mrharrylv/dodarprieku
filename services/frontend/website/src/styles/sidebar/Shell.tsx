import { Outlet } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'
import { SiteChrome } from '@/components/layout/SiteChrome'
import { SkipLink } from '@/components/layout/SkipLink'
import { Header } from './Header'
import { Footer } from './Footer'

/**
 * The app shell: a rail in column one, the content and footer in column two.
 *
 * The whole DOCUMENT scrolls and the rail is sticky inside its grid column.
 * The obvious alternative, a `fixed` rail beside a `main` that carries its own
 * `overflow-y: auto`, breaks four things at once: the browser's scroll
 * restoration, `scroll-behavior: smooth` on in-page anchors, the shared
 * ScrollProgress bar (which measures the document, not a nested scroller), and
 * the keyboard, which can get stuck inside the inner scroller. Sticky costs
 * nothing and keeps all four.
 *
 * `minmax(0,1fr)` on the content column, not `1fr`: a grid track's default
 * minimum is `auto`, so one wide child (a long unbroken word, a table) pushes
 * the whole column past the viewport instead of scrolling inside itself.
 *
 * Below lg the grid collapses to a flex column and the rail becomes a top bar
 * with an overlay menu. See Header.
 */
export const Shell = () => (
  <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:grid-rows-[minmax(0,1fr)_auto]">
    <SkipLink />
    <SiteChrome />
    <Header />
    <main
      id={MAIN_CONTENT_ID}
      tabIndex={-1}
      className="flex-1 bg-(--surface-sunken) focus:outline-none lg:col-start-2 lg:row-start-1"
    >
      <Outlet />
    </main>
    <Footer />
  </div>
)
