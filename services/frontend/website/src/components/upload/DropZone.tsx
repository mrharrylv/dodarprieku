import { useId, useRef, useState, type DragEvent } from 'react'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif'

/**
 * A drop target that is also a real file button, so it works with a mouse, a
 * finger and a keyboard alike: the visible button opens the picker, and a drop
 * anywhere on the zone is accepted.
 */
export const DropZone = ({
  label,
  buttonLabel,
  hint,
  multiple,
  disabled = false,
  onFiles,
}: {
  label: string
  buttonLabel: string
  hint?: string
  multiple: boolean
  disabled?: boolean
  onFiles: (files: readonly File[]) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const hintId = useId()

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setOver(false)
    if (disabled) return
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1))
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        'flex flex-col items-center gap-3 rounded-(--radius-lg) border-2 border-dashed p-6 text-center',
        'transition-colors duration-200',
        over ? 'border-(--ring-accent) bg-(--surface-accent-soft)' : 'border-(--border-strong) bg-(--surface-sunken)',
        disabled && 'opacity-60',
      )}
    >
      <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-(--surface-raised) text-(--text-accent)">
        <Icon name="plus" className="h-6 w-6" />
      </span>
      <p className="text-(--text-secondary)">{label}</p>
      <button
        type="button"
        disabled={disabled}
        aria-describedby={hint === undefined ? undefined : hintId}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'min-h-11 rounded-(--radius-md) border border-(--border-strong) bg-(--surface-raised) px-5 py-2',
          'font-medium text-(--text-primary) hover:border-(--ring-accent) hover:text-(--text-accent)',
          'disabled:pointer-events-none',
        )}
      >
        {buttonLabel}
      </button>
      {hint !== undefined && (
        <p id={hintId} className="text-(length:--text-xs) text-(--text-muted)">
          {hint}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        hidden
        tabIndex={-1}
        aria-hidden="true"
        data-testid="file-input"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
    </div>
  )
}
