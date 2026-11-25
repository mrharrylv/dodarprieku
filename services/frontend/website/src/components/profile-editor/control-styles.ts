import { cn } from '@/lib/cn'

/** The look of a text-like control, matching `ui/Field`. */
export const CONTROL_CLASS = cn(
  'w-full min-h-11 rounded-(--radius-md) border px-3.5 py-2.5',
  'bg-(--surface-raised) text-(--text-primary)',
  'transition-[border-color,box-shadow] duration-150',
)

export const controlBorder = (invalid: boolean): string =>
  invalid ? 'border-(--color-danger-500)' : 'border-(--border-strong) focus:border-(--ring-accent)'

/** Where the wizard and the editor look for the first problem to focus. */
export const ERROR_SELECTOR = '[aria-invalid="true"], [data-error-anchor]'
