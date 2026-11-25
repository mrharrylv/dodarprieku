import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { anchorId } from '@/lib/anchor'

/**
 * Positions the window on a client-side navigation.
 *
 * A client-side router does not do this: without it, following a link from
 * halfway down one page lands you halfway down the next one, and a link to
 * `/services#delivery` opens the services page wherever the last page was,
 * because the browser looked for the id before that page existed.
 *
 * - Another page: the top, `instant`, because animating a scroll the visitor
 *   did not ask for is both disorienting and a `prefers-reduced-motion`
 *   violation.
 * - A fragment: its element, scrolled into view the way the stylesheet says
 *   (`scroll-behavior` and `scroll-padding` in `index.css`, which the
 *   reduced-motion block turns off). No element by that id: the top.
 *
 * The page load itself is left alone. Every page is prerendered, so a reader
 * on a slow connection has often scrolled before React arrives, and on a
 * reload the browser has already put them back where they were; sending the
 * window to the top at hydration undid both. So the first address this
 * component sees is remembered, not acted on.
 */
export const ScrollRestoration = () => {
  const { pathname, hash } = useLocation()
  const seen = useRef({ pathname, hash })

  useEffect(() => {
    if (seen.current.pathname === pathname && seen.current.hash === hash) return
    // A link into another page jumps straight to its section: scrolling the
    // new page smoothly from wherever the old one was runs every section
    // past mid-entrance, which reads as a blink. Within one page, the
    // stylesheet's smooth scroll stays.
    const samePage = seen.current.pathname === pathname
    seen.current = { pathname, hash }

    const anchor = anchorId(hash)
    const target = anchor === null ? null : document.getElementById(anchor)
    if (target !== null && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ block: 'start', behavior: samePage ? 'auto' : 'instant' })
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}
