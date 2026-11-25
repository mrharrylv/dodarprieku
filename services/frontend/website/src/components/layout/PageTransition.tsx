import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

import { MAIN_CONTENT_ID } from '@/config/dom'

/** The class that plays the page's entrance; `.animate-page-in` in `index.css`. */
export const PAGE_IN_CLASS = 'animate-page-in'

/**
 * Fades the new page in when the visitor moves between pages, so a click on
 * "Projects" reads as one page giving way to the next rather than a blink.
 *
 * It restarts a CSS animation on `<main>` each time the path changes, and
 * never on the first page: that one was prerendered and is already on screen,
 * and fading it would blank text the reader may have started reading. Living
 * in `SiteChrome`, it works the same in every style without touching a shell.
 * The stylesheet fades only the light sections of the new page; a dark hero
 * band stays solid so two dark heroes never flash the light page between them.
 * Reduced motion zeroes the animation, so nothing moves then.
 */
export const PageTransition = () => {
  const { pathname } = useLocation()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const main = document.getElementById(MAIN_CONTENT_ID)
    if (main === null) return
    main.classList.remove(PAGE_IN_CLASS)
    // Reading a layout property makes the browser drop the old animation, so
    // adding the class again starts it from the beginning.
    void main.offsetWidth
    main.classList.add(PAGE_IN_CLASS)
  }, [pathname])

  return null
}
