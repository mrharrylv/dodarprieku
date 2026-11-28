import { useRef, type MouseEvent, type PointerEvent } from 'react'

/** How far, in pixels, a press has to move before it is a drag rather than a click. */
export const DRAG_THRESHOLD_PX = 5

/**
 * Dragging a sideways-scrolling row with the mouse, the way a finger already
 * scrolls it on a touch screen. A press that moves past `DRAG_THRESHOLD_PX`
 * scrolls the row and swallows the click that ends it, so dropping a drag on
 * a chip does not toggle that chip; a press that stays put is a plain click.
 * Touch and pen are left to the browser's own scrolling. A press released
 * outside the row sends it no pointerup, so a move with the button already up,
 * or the row losing the pointer, ends the drag too: the row never follows a
 * mouse that merely hovers over it.
 */
export const useDragScroll = () => {
  const drag = useRef<{ x: number; left: number; id: number; moved: boolean } | null>(null)
  const swallowClick = useRef(false)

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      swallowClick.current = false
      drag.current = { x: event.clientX, left: event.currentTarget.scrollLeft, id: event.pointerId, moved: false }
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const state = drag.current
      if (state === null || state.id !== event.pointerId) return
      if ((event.buttons & 1) === 0) {
        drag.current = null
        return
      }
      const dx = event.clientX - state.x
      if (!state.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return
      if (!state.moved) {
        state.moved = true
        event.currentTarget.setPointerCapture?.(event.pointerId)
      }
      event.currentTarget.scrollLeft = state.left - dx
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const state = drag.current
      if (state === null || state.id !== event.pointerId) return
      swallowClick.current = state.moved
      drag.current = null
    },
    onPointerCancel: () => {
      drag.current = null
    },
    onLostPointerCapture: () => {
      drag.current = null
    },
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (!swallowClick.current) return
      swallowClick.current = false
      event.preventDefault()
      event.stopPropagation()
    },
  }
}
