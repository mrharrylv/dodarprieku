import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { anchorId } from '@/lib/anchor'

/**
 * Scrolls to one band, or to a deeper anchor inside it, on every navigation.
 *
 * Arriving at /services has to put the reader at the services band, because
 * that is the whole page they asked for. The movement itself is CSS:
 * `html { scroll-behavior: smooth }` in the base layer animates it and the
 * reduced-motion block turns that off, so nothing here checks a media query.
 *
 * A fragment wins over the band. `/services#delivery` is a narrower request
 * than "the services band". The shared `ScrollRestoration` already brings a
 * fragment's element into view on a navigation; this hook asks for the same
 * element again, so the band cannot win over it a frame later.
 *
 * Keyed on the navigation, not only on the band. Every route here renders the
 * same document, so following the nav to the route you are already on changes
 * no element and remounts nothing. Without `key` in the dependency list, a
 * reader who has scrolled from services down to contact and then taps
 * "Services" gets no response at all, which on a page whose nav behaves like a
 * set of anchors reads as a dead link.
 *
 * A frame late, deliberately. `SiteChrome` mounts scroll restoration, which
 * sends the window to the top on every navigation to another page (never on
 * the page load itself); it is an earlier sibling in the tree, so it already
 * runs first, and the extra frame means it stays first even if that ordering
 * ever changes.
 */
export const useFocusSection = (id: string | null): void => {
  const { hash, key } = useLocation()

  useEffect(() => {
    const anchor = anchorId(hash)
    if (anchor === null && id === null) return

    const frame = requestAnimationFrame(() => {
      const target =
        (anchor === null ? null : document.getElementById(anchor)) ??
        (id === null ? null : document.getElementById(id))

      if (target === null) return
      // jsdom implements no layout and no scrollIntoView, and the contract
      // test renders all four routes.
      if (typeof target.scrollIntoView !== 'function') return
      target.scrollIntoView({ block: 'start' })
    })

    return () => cancelAnimationFrame(frame)
  }, [id, hash, key])
}
