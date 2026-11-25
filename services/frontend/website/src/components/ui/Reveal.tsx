import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'

import { useHydrated } from '@/hooks/useHydrated'
import { cn } from '@/lib/cn'

/** Whether any of the element is inside the window right now. */
const onScreen = (element: HTMLElement): boolean => {
  const { top, bottom, left, right } = element.getBoundingClientRect()
  return bottom > 0 && top < window.innerHeight && right > 0 && left < window.innerWidth
}

/**
 * Reveals its children once they scroll into view.
 *
 * Deliberately IntersectionObserver rather than a scroll listener: a scroll
 * handler runs on every frame of every scroll for the life of the page, and
 * this needs to fire once per element and then stop. The observer unobserves
 * itself on the first intersection.
 *
 * Content is NOT hidden until JavaScript runs. It starts visible and the
 * animation only ever fades it in from a starting state applied by the class,
 * so a crawler, a failed bundle or a disabled-JS visitor sees the whole page.
 * The opposite arrangement, `opacity: 0` in CSS undone by JS, is the standard
 * way sites end up invisible to anything that does not execute their script.
 *
 * Content that was prerendered is never animated if it was on screen when
 * React arrived. The browser painted it long before, often with the reader
 * already reading it; the animation starts from opacity 0, so running it then
 * blanks the text and fades it back in. Only what enters the viewport later,
 * or what a client-side navigation renders, makes an entrance.
 *
 * `prefers-reduced-motion` zeroes the animation's duration in the base layer,
 * so nothing here needs to check it.
 */
export const Reveal = ({
  as: Tag = 'div',
  delay = 0,
  stagger = false,
  id,
  className,
  children,
}: {
  as?: ElementType
  /** Seconds. Use to stagger siblings, sparingly. */
  delay?: number
  /** Animate each child in turn (a grid of cards) instead of the whole. */
  stagger?: boolean
  id?: string
  className?: string
  children: ReactNode
}) => {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(false)
  // Below the fold, waiting for the reader: held invisible so it can make an
  // entrance rather than being seen first and then animated. Only ever set in
  // an effect, so the prerendered page and a page without JavaScript keep
  // everything visible.
  const [waiting, setWaiting] = useState(false)
  // Whether this element's first render hydrated prerendered markup, rather
  // than rendering fresh. Only the first render's answer counts.
  const hydrated = useHydrated()
  const prerendered = useRef(!hydrated)

  useEffect(() => {
    const element = ref.current
    if (element === null) return

    // Already painted and in view: it has made its entrance.
    if (prerendered.current && onScreen(element)) return

    // No observer (old browser, some test environments): show it and move on.
    // Prerendered content is visible already, so there is nothing to show.
    if (typeof IntersectionObserver === 'undefined') {
      if (!prerendered.current) setShown(true)
      return
    }

    if (!onScreen(element)) setWaiting(true)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setWaiting(false)
          setShown(true)
          observer.unobserve(entry.target)
        }
      },
      // A little before the element's edge, so it has finished arriving by the
      // time it is properly in view rather than animating under the reader.
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <Tag
      ref={ref}
      id={id}
      className={cn(
        waiting && 'opacity-0',
        shown && (stagger ? 'reveal-stagger' : 'animate-rise-in'),
        className,
      )}
      style={shown && delay > 0 ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  )
}
