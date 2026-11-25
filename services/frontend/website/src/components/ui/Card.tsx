import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/cn'

const SHELL = cn(
  'rounded-(--radius-lg) border border-(--border-subtle)',
  'bg-(--surface-raised) p-6 sm:p-7',
  'shadow-(--shadow-subtle)',
)

export const Card = ({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) => <div className={cn(SHELL, className)}>{children}</div>

/**
 * A card that is entirely one link.
 *
 * The whole card is the anchor rather than a "read more" link inside it, so the
 * target is big enough to hit on a phone and there is exactly ONE tab stop,
 * a card with a nested heading link plus a nested button gives keyboard users
 * three stops that all go to the same place.
 */
export const CardLink = ({
  to,
  title,
  children,
  className,
}: {
  to: string
  title: string
  children: ReactNode
  className?: string
}) => (
  <Link
    to={to}
    className={cn(
      SHELL,
      'group block transition-[border-color,box-shadow,transform]',
      'duration-200 ease-(--ease-out-soft)',
      'hover:-translate-y-0.5 hover:border-(--ring-accent) hover:shadow-(--shadow-card)',
      className,
    )}
  >
    <h3 className="text-(length:--text-xl) text-(--text-primary) group-hover:text-(--text-accent)">
      {title}
    </h3>
    <div className="mt-3 text-(--text-secondary)">{children}</div>
  </Link>
)
