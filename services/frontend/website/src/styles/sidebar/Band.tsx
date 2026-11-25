import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'

/**
 * A section of the content column.
 *
 * There is no tonal band and no divider between sections: the head's own rule
 * line is the separator, and the panels inside carry the edges. Alternating
 * page and sunken backgrounds would fight the single flat canvas the rail sets
 * up, and the result would read as a brochure again.
 *
 * The rhythm is deliberately tighter than a marketing layout: `py-9` where a
 * conventional section uses `py-16`. Density is the point of this style.
 */
export const Band = ({
  id,
  index,
  title,
  description,
  className,
  children,
}: {
  id?: string
  /** Drawn as a two-digit label beside the rule. Decorative, so aria-hidden. */
  index?: number
  title?: string
  description?: string
  className?: string
  children: ReactNode
}) => (
  <section id={id} className={cn('py-9 sm:py-12', className)}>
    <Container>
      {title !== undefined && (
        <div className="mb-6">
          <div className="flex items-center gap-3">
            {index !== undefined && (
              <span
                aria-hidden="true"
                className="font-(family-name:--font-display) text-(length:--text-xs) font-semibold tabular-nums tracking-[0.18em] text-(--text-accent)"
              >
                {String(index).padStart(2, '0')}
              </span>
            )}
            <span aria-hidden="true" className="h-px flex-1 bg-(--border-subtle)" />
          </div>

          <h2 className="mt-3 text-(length:--text-2xl) text-(--text-primary)">{title}</h2>

          {description !== undefined && (
            <p className="mt-2 max-w-2xl text-(--text-secondary)">{description}</p>
          )}
        </div>
      )}

      {children}
    </Container>
  </section>
)
