/** Small shared building blocks: buttons, cards, fields, badges, skeletons. */
import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { CharityStatus } from '@shared/contracts'
import { lv } from '../i18n/lv'
import { IconAlert } from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--fill-accent)] text-[var(--text-on-accent)] hover:bg-[var(--fill-accent-hover)]',
  secondary:
    'border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-sunken)]',
  danger: 'bg-[var(--fill-danger)] text-[var(--text-on-danger)] hover:bg-[var(--fill-danger-hover)]',
  ghost: 'text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]',
}

export const Button = ({
  variant = 'secondary',
  className = '',
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: ButtonVariant }) => (
  <button
    type={type}
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT[variant]} ${className}`}
    {...rest}
  />
)

export const Card = ({ children, className = '' }: { readonly children: ReactNode; readonly className?: string }) => (
  <section
    className={`rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-subtle)] ${className}`}
  >
    {children}
  </section>
)

export const PageHeader = ({ title, intro, actions }: { readonly title: string; readonly intro?: string; readonly actions?: ReactNode }) => (
  <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div>
      <h1 className="text-[length:var(--text-2xl)]">{title}</h1>
      {intro && <p className="mt-1 max-w-[var(--container-prose)] text-[var(--text-secondary)]">{intro}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>
)

const STATUS_TONE: Record<CharityStatus | 'update', string> = {
  pending: 'border-[var(--border-warning)] bg-[var(--surface-warning-soft)] text-[var(--text-warning)]',
  approved: 'border-[var(--border-success)] bg-[var(--surface-success-soft)] text-[var(--text-success)]',
  rejected: 'border-[var(--border-danger)] bg-[var(--surface-danger-soft)] text-[var(--text-danger)]',
  suspended: 'border-[var(--border-strong)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]',
  update: 'border-[var(--border-accent-soft)] bg-[var(--surface-accent-soft)] text-[var(--text-accent)]',
}

export const StatusBadge = ({ status }: { readonly status: CharityStatus | 'update' }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>
    {lv.status[status]}
  </span>
)

export const Skeleton = ({ rows = 4 }: { readonly rows?: number }) => (
  <div aria-busy="true" aria-live="polite" className="space-y-3">
    <span className="sr-only">{lv.app.loading}</span>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="skeleton h-12 rounded-[var(--radius-md)]" />
    ))}
  </div>
)

export const ErrorState = ({ message, onRetry }: { readonly message: string; readonly onRetry?: () => void }) => (
  <div
    role="alert"
    className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-danger)] bg-[var(--surface-danger-soft)] p-4 text-[var(--text-danger)]"
  >
    <IconAlert className="size-5 shrink-0" />
    <p className="flex-1 font-medium">{message}</p>
    {onRetry && <Button onClick={onRetry}>{lv.app.retry}</Button>}
  </div>
)

export const EmptyState = ({ text }: { readonly text: string }) => (
  <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] p-8 text-center text-[var(--text-secondary)]">
    {text}
  </p>
)

export const inputClass =
  'block w-full min-h-11 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 py-2 text-[var(--text-primary)] aria-[invalid=true]:border-[var(--border-danger)]'

interface FieldProps {
  readonly label: string
  readonly error?: string | undefined
  readonly hint?: string
  readonly children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode
}

/** A label, a control and its error, wired together for screen readers. */
export const Field = ({ label, error, hint, children }: FieldProps) => {
  const id = useId()
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ')
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), ...(describedBy ? { 'aria-describedby': describedBy } : {}) })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-[var(--text-muted)]">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="text-sm font-medium text-[var(--text-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}

export const Badge = ({ children }: { readonly children: ReactNode }) => (
  <span className="ml-auto inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--fill-accent)] px-1.5 text-xs font-bold text-[var(--text-on-accent)]">
    {children}
  </span>
)
