import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

const CONTROL = cn(
  'w-full rounded-(--radius-md) border px-3.5 py-2.5',
  'bg-(--surface-raised) text-(--text-primary)',
  'placeholder:text-(--text-muted)',
  'transition-[border-color,box-shadow] duration-150',
  'disabled:opacity-60',
)

const border = (invalid: boolean) =>
  invalid
    ? 'border-(--color-danger-500)'
    : 'border-(--border-strong) focus:border-(--ring-accent)'

interface FieldShellProps {
  readonly label: string
  readonly error?: string | undefined
  readonly hint?: string | undefined
  readonly required?: boolean
  /** Rendered next to the label, e.g. "optional". */
  readonly badge?: string | undefined
}

/**
 * A labelled form control.
 *
 * The wiring here is the point, and it is the part hand-rolled forms get wrong:
 *
 *  - the label is a real <label htmlFor>, so tapping it focuses the control;
 *  - the error is tied on with `aria-describedby`, so a screen reader reads the
 *    problem when it lands on the field rather than leaving the user to guess;
 *  - `aria-invalid` marks the field itself as bad, not just the text below it;
 *  - the error carries `role="alert"`, so appearing after submit is announced.
 *
 * A red border alone communicates nothing to anyone who cannot see it.
 */
export const Input = ({
  label,
  error,
  hint,
  required = false,
  badge,
  className,
  ...rest
}: FieldShellProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'required'> & {
    className?: string
  }) => {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const invalid = error !== undefined

  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} required={required} badge={badge} />
      <input
        id={id}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={cn(invalid && errorId, hint !== undefined && hintId) || undefined}
        className={cn(CONTROL, border(invalid))}
        {...rest}
      />
      <FieldFooter
        errorId={errorId}
        hintId={hintId}
        {...(error !== undefined ? { error } : {})}
        {...(hint !== undefined ? { hint } : {})}
      />
    </div>
  )
}

export const Textarea = ({
  label,
  error,
  hint,
  required = false,
  badge,
  className,
  rows = 6,
  ...rest
}: FieldShellProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'required'> & {
    className?: string
  }) => {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const invalid = error !== undefined

  return (
    <div className={className}>
      <FieldLabel htmlFor={id} label={label} required={required} badge={badge} />
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={cn(invalid && errorId, hint !== undefined && hintId) || undefined}
        className={cn(CONTROL, border(invalid), 'resize-y')}
        {...rest}
      />
      <FieldFooter
        errorId={errorId}
        hintId={hintId}
        {...(error !== undefined ? { error } : {})}
        {...(hint !== undefined ? { hint } : {})}
      />
    </div>
  )
}

const FieldLabel = ({
  htmlFor,
  label,
  required,
  badge,
}: {
  htmlFor: string
  label: string
  required: boolean
  badge: string | undefined
}) => (
  <label
    htmlFor={htmlFor}
    className="mb-1.5 flex items-baseline gap-2 text-(length:--text-sm) font-medium text-(--text-primary)"
  >
    <span>{label}</span>
    {required && (
      // The asterisk is decorative: the required state is already on the input
      // itself, so announcing "star" as well is just noise.
      <span aria-hidden="true" className="text-(--color-danger-500)">
        *
      </span>
    )}
    {badge !== undefined && (
      <span className="font-normal text-(--text-muted)">({badge})</span>
    )}
  </label>
)

const FieldFooter = ({
  error,
  hint,
  errorId,
  hintId,
}: {
  error?: string
  hint?: string
  errorId: string
  hintId: string
}) => (
  <>
    {hint !== undefined && error === undefined && (
      <p id={hintId} className="mt-1.5 text-(length:--text-xs) text-(--text-muted)">
        {hint}
      </p>
    )}
    {error !== undefined && (
      <p
        id={errorId}
        role="alert"
        className="mt-1.5 text-(length:--text-sm) text-(--color-danger-600)"
      >
        {error}
      </p>
    )}
  </>
)
