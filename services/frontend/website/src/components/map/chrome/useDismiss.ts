import { useEffect, type RefObject } from 'react'

/**
 * Closes a dropdown of the top bar: on Escape (focus back to its button) and
 * on a press anywhere outside `root`. Listens only while `open`.
 */
export const useDismiss = (
  open: boolean,
  root: RefObject<HTMLElement | null>,
  button: RefObject<HTMLElement | null>,
  close: () => void,
): void => {
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && root.current?.contains(event.target) !== true) close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, root, button, close])
}
