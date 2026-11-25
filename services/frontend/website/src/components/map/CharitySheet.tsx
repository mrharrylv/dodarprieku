import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode, type SyntheticEvent } from 'react'

import './chrome/chrome.css'

/**
 * The expanded card on a phone: a bottom sheet over the map, rising like the
 * rail's panels. It is a native modal `<dialog>`, so the map and the bars
 * behind it are inert and focus stays inside; the card's own collapse button
 * takes focus when it opens. Escape and a tap on the dimmed map collapse it
 * back to the small card (`onDismiss`); the pledge dialog inside handles its
 * own Escape.
 */
export const CharitySheet = ({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: ReactNode }) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return undefined
    // jsdom and older engines have no showModal: an open, non-modal sheet then.
    if (typeof dialog.showModal === 'function') dialog.showModal()
    else dialog.setAttribute('open', '')
    // showModal focuses the first focusable thing, which can be the scroll area: the card's collapse button instead.
    const first = dialog.querySelector<HTMLElement>('[data-focus="collapse"]') ?? dialog
    first.focus({ preventScroll: true })
    return () => {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close()
    }
  }, [])

  const ownEvent = (target: EventTarget) => target instanceof Element && target.closest('dialog') === ref.current

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !ownEvent(event.target)) return
    event.preventDefault()
    event.stopPropagation()
    onDismiss()
  }

  const onCancel = (event: SyntheticEvent) => {
    event.preventDefault()
    onDismiss()
  }

  // A click on the dialog itself, not its content, is a click on the backdrop.
  const onClick = (event: MouseEvent) => {
    if (event.target === ref.current) onDismiss()
  }

  return (
    <dialog
      ref={ref}
      aria-label={title}
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={onKeyDown}
      onCancel={onCancel}
      onClick={onClick}
      className="dp-panel dp-sheet fixed inset-x-0 top-auto bottom-0 z-50 m-0 flex max-h-[88dvh] w-full max-w-none flex-col overflow-hidden rounded-t-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-0 text-(--text-primary) shadow-(--shadow-lifted) backdrop:bg-(--color-ink-950)/30 focus:outline-none"
    >
      <div aria-hidden="true" className="mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-(--border-strong)" />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </dialog>
  )
}
