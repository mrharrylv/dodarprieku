import { useEffect, useState, type RefObject } from 'react'

import { useMediaQuery } from '@/hooks/useMediaQuery'

/** From this width the dock sits beside the map; below it, it is a full-screen sheet. Tailwind's `lg`. */
export const DOCK_QUERY = '(min-width: 64rem)'

/**
 * How many pixels of the map's right edge the docked panel covers: its
 * width while it is open beside the map, 0 when it is closed or a
 * full-screen sheet. Followed as the window resizes. `openKey` names the open
 * dock, or null. The map takes it as
 * padding, the floating chrome as `--dock-inset`.
 */
export const useDockInset = (panelRef: RefObject<HTMLElement | null>, openKey: string | null): number => {
  const open = openKey !== null
  const docked = useMediaQuery(DOCK_QUERY)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = panelRef.current
    if (!open || !docked || element === null) return undefined
    const measure = () => setWidth(Math.round(element.getBoundingClientRect().width))
    measure()
    if (typeof ResizeObserver !== 'function') return undefined
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
    // openKey, not open: another dock is another element to measure.
  }, [panelRef, open, openKey, docked])

  return open && docked ? width : 0
}
