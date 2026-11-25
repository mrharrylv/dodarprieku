import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

/** The map's floating panels, opened from the rail. One is open at a time. */
export const PANEL_IDS = ['leaderboard', 'news', 'info'] as const
export type PanelId = (typeof PANEL_IDS)[number]

/** The DOM id of a panel, for its button's `aria-controls`. */
export const panelDomId = (id: PanelId): string => `map-panel-${id}`

export interface MapPanels {
  readonly open: PanelId | null
  /** Opens a panel, or closes it when it is the open one. */
  readonly toggle: (id: PanelId) => void
  /** Closes the open panel; `restoreFocus` sends focus back to its rail button. */
  readonly close: (options?: { readonly restoreFocus?: boolean }) => void
  /** Registers a rail button, so focus can return to it. */
  readonly buttonRef: (id: PanelId) => (element: HTMLButtonElement | null) => void
  /** The open panel's element: focus moves into it when it opens. */
  readonly panelRef: RefObject<HTMLElement | null>
}

/**
 * Which panel is open, and the focus that goes with it: into the panel when it
 * opens, back to its button when it is closed with the close button, Escape or
 * the button itself. A click on the map closes it too; focus returns to the
 * rail only when it was inside the panel, so it never falls to the page body.
 */
export const useMapPanels = (): MapPanels => {
  const [open, setOpen] = useState<PanelId | null>(null)
  const buttons = useRef(new Map<PanelId, HTMLButtonElement>())
  const panelRef = useRef<HTMLElement | null>(null)

  const close = useCallback(
    ({ restoreFocus = false }: { readonly restoreFocus?: boolean } = {}) => {
      if (open === null) return
      setOpen(null)
      if (restoreFocus) buttons.current.get(open)?.focus()
    },
    [open],
  )

  const toggle = useCallback((id: PanelId) => setOpen((current) => (current === id ? null : id)), [])

  const buttonRef = useCallback(
    (id: PanelId) => (element: HTMLButtonElement | null) => {
      if (element === null) buttons.current.delete(id)
      else buttons.current.set(id, element)
    },
    [],
  )

  useEffect(() => {
    if (open !== null) panelRef.current?.focus({ preventScroll: true })
  }, [open])

  useEffect(() => {
    if (open === null) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close({ restoreFocus: true })
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])

  return { open, toggle, close, buttonRef, panelRef }
}
