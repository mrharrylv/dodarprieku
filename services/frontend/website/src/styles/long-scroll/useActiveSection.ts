import { useEffect, useState } from 'react'

/**
 * Which band is currently crossing the middle of the viewport.
 *
 * IntersectionObserver, never a scroll handler. A scroll listener runs on
 * every frame of every scroll for the life of the page, and on a page this
 * long that is the difference between a header that costs nothing and one
 * that makes a mid-range Android stutter. The root margin collapses the
 * viewport to a thin band a little above centre, so at most one section is
 * intersecting at a time and the answer needs no ratio arithmetic.
 *
 * Returns null until the first intersection, and on the pages that have none
 * of these sections at all: the legal pages and the 404 share this shell.
 * The caller falls back to the route in that case rather than lighting
 * nothing.
 *
 * `resetKey` is the current pathname. Each route renders its own page
 * component, so navigating replaces every section element in the DOM and the
 * observer would otherwise keep watching four detached nodes and freeze.
 */
export const useActiveSection = (
  ids: readonly string[],
  resetKey: string,
): string | null => {
  // Remembers which page each answer was for, so a new page starts with no
  // answer without an effect having to reset it (and render twice).
  const [seen, setSeen] = useState<{ readonly key: string; readonly id: string } | null>(null)

  useEffect(() => {

    // No observer (an old browser, or jsdom in the contract test): the
    // navigation quietly falls back to the route and nothing breaks.
    if (typeof IntersectionObserver === 'undefined') return

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setSeen({ key: resetKey, id: entry.target.id })
        }
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    )

    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [ids, resetKey])

  return seen !== null && seen.key === resetKey ? seen.id : null
}
