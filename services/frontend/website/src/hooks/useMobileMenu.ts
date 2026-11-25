import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useLocation } from 'react-router-dom'

import { useScrollLock } from '@/hooks/useScrollLock'

export interface MobileMenu {
  /** Whether the menu is showing. */
  readonly open: boolean
  /** Opens a closed menu, closes an open one. For the toggle button's onClick. */
  readonly toggle: () => void
  /** Closes the menu. For a link's onNavigate. */
  readonly close: () => void
  /** Attach to the toggle button: Escape sends focus back to it. */
  readonly toggleRef: RefObject<HTMLButtonElement | null>
}

/**
 * Everything a style's header needs for its phone menu, in one place, so the
 * nine headers cannot drift apart on any of it:
 *
 * - **Navigating closes it.** The menu remembers the page it was opened on
 *   and is open only while the address is still that page. Without this,
 *   tapping a link on a phone navigates *behind* an overlay that stays up.
 *   Derived during render rather than reset in an effect, so there is never
 *   one frame of the new page with the old menu over it.
 * - **The page behind it does not scroll** (`useScrollLock`).
 * - **Escape closes it and focus returns to the toggle**, otherwise focus is
 *   stranded on a removed element and the next Tab restarts at the top of the
 *   document.
 */
export const useMobileMenu = (): MobileMenu => {
  const { pathname } = useLocation()
  const [openOn, setOpenOn] = useState<string | null>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)

  const open = openOn === pathname

  useScrollLock(open)

  const close = useCallback(() => setOpenOn(null), [])
  const toggle = useCallback(
    () => setOpenOn((current) => (current === pathname ? null : pathname)),
    [pathname],
  )

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenOn(null)
      toggleRef.current?.focus()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return { open, toggle, close, toggleRef }
}
