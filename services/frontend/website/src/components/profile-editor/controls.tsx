import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

import { CONTROL_CLASS, controlBorder } from './control-styles'

/**
 * Form controls the shared `ui/Field` does not have: a switch, a select and a
 * fieldset with a legend. Same tokens and the same error wiring as `Field`
 * (aria-invalid, aria-describedby, role="alert").
 */

export const ErrorText = ({ id, children }: { id: string; children: ReactNode }) => (
  <p id={id} role="alert" className="mt-1.5 text-(length:--text-sm) text-(--color-danger-600)">
    {children}
  </p>
)

export const Toggle = ({
  label,
  description,
  checked,
  onChange,
  className,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (next: boolean) => void
  className?: string
}) => {
  const id = useId()
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description === undefined ? undefined : `${id}-desc`}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-11 w-16 shrink-0 items-center rounded-full border-2 p-1',
          'transition-colors duration-200 ease-(--ease-out-soft)',
          checked ? 'border-(--fill-accent) bg-(--fill-accent)' : 'border-(--border-strong) bg-(--surface-sunken)',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'h-7 w-7 rounded-full shadow-(--shadow-subtle) transition-transform duration-200 ease-(--ease-out-soft)',
            checked ? 'translate-x-5 bg-(--text-on-accent)' : 'translate-x-0 bg-(--surface-raised)',
          )}
        />
      </button>
      <div className="min-w-0 pt-2">
        <span id={`${id}-label`} className="font-medium text-(--text-primary)">
          {label}
        </span>
        {description !== undefined && (
          <p id={`${id}-desc`} className="mt-0.5 text-(length:--text-sm) text-(--text-secondary)">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

export const Select = ({
  label,
  error,
  required = false,
  className,
  children,
  ...rest
}: {
  label: string
  error?: string | undefined
  required?: boolean
  className?: string
  children: ReactNode
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'required' | 'children'>) => {
  const id = useId()
  const invalid = error !== undefined
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex gap-2 text-(length:--text-sm) font-medium text-(--text-primary)">
        <span>{label}</span>
        {required && (
          <span aria-hidden="true" className="text-(--color-danger-500)">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={cn(CONTROL_CLASS, controlBorder(invalid))}
        {...rest}
      >
        {children}
      </select>
      {invalid && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  )
}

/**
 * A group of controls with a visible legend. A group-level error (no ticked
 * need, no delivery option) is focusable through `data-error-anchor`, so the
 * wizard's "focus the first error" lands on it like on any field.
 */
export const Fieldset = ({
  legend,
  hint,
  error,
  children,
  className,
}: {
  legend: string
  hint?: string
  error?: string | undefined
  children: ReactNode
  className?: string
}) => {
  const id = useId()
  return (
    <fieldset
      className={cn('min-w-0 space-y-4', className)}
      aria-describedby={cn(hint !== undefined && `${id}-hint`, error !== undefined && `${id}-error`) || undefined}
    >
      <legend className="font-display text-(length:--text-xl) text-(--text-primary)">{legend}</legend>
      {hint !== undefined && (
        <p id={`${id}-hint`} className="-mt-2 text-(length:--text-sm) text-(--text-secondary)">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <div tabIndex={-1} data-error-anchor="" className="rounded-(--radius-md) outline-none">
          <ErrorText id={`${id}-error`}>{error}</ErrorText>
        </div>
      )}
      {children}
    </fieldset>
  )
}
