import { useEffect } from 'react'

/**
 * Stop the page behind an open overlay from scrolling.
 *
 * `overflow: hidden` on <body> alone does NOT work on iOS Safari: the page
 * still rubber-band scrolls behind the overlay, and worse, closing the overlay
 * leaves the visitor somewhere they did not choose. Pinning the body with
 * `position: fixed` at a negative offset does work, and the scroll position is
 * restored on unlock.
 *
 * The scrollbar's width is compensated so the page does not visibly jump
 * sideways on a desktop browser that reserves space for one.
 */
export const useScrollLock = (locked: boolean): void => {
  useEffect(() => {
    if (!locked) return

    const { body, documentElement } = document
    const scrollY = window.scrollY
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth

    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.width = previous.width
      body.style.overflow = previous.overflow
      body.style.paddingRight = previous.paddingRight
      // Instant, not smooth: the visitor never chose to travel, so animating
      // back to where they already were reads as a glitch.
      window.scrollTo({ top: scrollY, behavior: 'instant' })
    }
  }, [locked])
}
