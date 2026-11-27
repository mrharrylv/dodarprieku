import { useEffect, useId, useRef } from 'react'

import { Button } from '@/components/ui/Button'

/**
 * An inline confirmation: a question that has to be answered before anything
 * is lost. It takes focus when it appears, and Escape cancels.
 */
export const ConfirmPanel = ({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}) => {
  const id = useId()
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => ref.current?.focus(), [])

  return (
    <div
      ref={ref}
      role="alertdialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-body`}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        // Cancels the confirmation only, never the panel or dock around it.
        e.preventDefault()
        e.stopPropagation()
        onCancel()
      }}
      className="rounded-(--radius-lg) border border-(--color-warning-500)/60 bg-(--color-warning-500)/10 p-5 outline-none focus-visible:ring-2 focus-visible:ring-(--ring-accent)"
    >
      <p id={`${id}-title`} className="font-medium text-(--text-primary)">
        {title}
      </p>
      <p id={`${id}-body`} className="mt-1 text-(length:--text-sm) text-(--text-secondary)">
        {body}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="danger" size="sm" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          {cancelLabel}
        </Button>
      </div>
    </div>
  )
}
