import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

/**
 * The class recipe shared by `<Button>` and `<ButtonLink>`.
 *
 * Kept in its own module so the two components cannot drift into looking
 * subtly different, and so the recipe is testable without rendering anything.
 */

const BASE = cn(
  'inline-flex items-center justify-center gap-2',
  'font-medium whitespace-nowrap',
  'rounded-(--radius-md)',
  'transition-[background-color,color,border-color,box-shadow,transform]',
  'duration-200 ease-(--ease-out-soft)',
  'active:translate-y-px',
  'disabled:pointer-events-none disabled:opacity-50',
  // Every interactive control is at least 44px tall on touch: smaller than
  // that and a real thumb misses it.
  'min-h-11',
)

const VARIANTS: Record<ButtonVariant, string> = {
  // The label colour comes from --text-on-accent, not from a hardcoded
  // `text-white`: a brand-700 fill with a white label today, and one token
  // to change if a re-theme ever needs a dark label.
  primary: cn(
    'bg-(--fill-accent) text-(--text-on-accent)',
    'shadow-(--shadow-subtle)',
    'hover:bg-(--fill-accent-hover) hover:shadow-(--shadow-card)',
  ),
  secondary: cn(
    'bg-(--surface-raised) text-(--text-primary)',
    'border border-(--border-strong)',
    'hover:border-(--ring-accent) hover:text-(--text-accent)',
  ),
  ghost: cn(
    'bg-transparent text-(--text-secondary)',
    'hover:bg-(--surface-sunken) hover:text-(--text-primary)',
  ),
  // danger-600, not 500: white on 500 measures 4.04:1.
  danger: cn(
    'bg-(--color-danger-600) text-white',
    'hover:bg-(--color-danger-700)',
  ),
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-(length:--text-sm)',
  md: 'px-5 py-2.5 text-(length:--text-base)',
  lg: 'px-7 py-3.5 text-(length:--text-lg)',
}

export const buttonClasses = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string => cn(BASE, VARIANTS[variant], SIZES[size], className)
