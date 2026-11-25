import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/** A labelled checkbox with an optional hint and error, wired like `Field`'s controls. */
export const Checkbox = ({
  checked,
  onChange,
  label,
  hint,
  error,
  className,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
  hint?: string | undefined
  error?: string | undefined
  className?: string
}) => {
  const id = useId()
  const describedBy = cn(hint !== undefined && `${id}-hint`, error !== undefined && `${id}-error`) || undefined

  return (
    <div className={className}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error !== undefined || undefined}
          aria-describedby={describedBy}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-(--radius-sm) border-(--border-strong) accent-(--fill-accent)"
        />
        <span className="text-(length:--text-sm) text-(--text-primary)">
          {label}
          {hint !== undefined && (
            <span id={`${id}-hint`} className="mt-0.5 block text-(length:--text-xs) text-(--text-muted)">
              {hint}
            </span>
          )}
        </span>
      </label>
      {error !== undefined && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-(length:--text-sm) text-(--color-danger-600)">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * The honeypot: a field no person sees or reaches by keyboard, which bots
 * fill in. Off screen rather than `display: none`, which some bots skip.
 */
export const Honeypot = ({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) => {
  const id = useId()
  return (
    <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-px w-px overflow-hidden">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
