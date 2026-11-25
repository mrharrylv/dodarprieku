import { useId, type ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * A soft rounded card with its own h2: every section of the charity page.
 * `compact` drops the card (border, shadow, padding) for a section inside the
 * map's expanded popup, which is a card already.
 */
export const SectionCard = ({
  title,
  children,
  className,
  action,
  compact = false,
}: {
  title: string
  children: ReactNode
  className?: string
  action?: ReactNode
  compact?: boolean
}) => {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className={cn(
        compact ? 'border-t border-(--border-subtle) px-4 py-4' : 'rounded-(--radius-2xl) border border-(--border-subtle) bg-(--surface-raised) p-5 shadow-(--shadow-subtle) sm:p-7',
        className,
      )}
    >
      <div className={cn('flex items-center justify-between gap-3', compact ? 'mb-3' : 'mb-4')}>
        <h2 id={id} className={cn('font-semibold text-(--text-primary)', compact ? 'text-(length:--text-base)' : 'text-(length:--text-xl)')}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
