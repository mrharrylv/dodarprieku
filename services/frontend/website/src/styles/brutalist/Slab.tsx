import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'
import { NUM } from './marks'

/**
 * One numbered band, closed by a 4px rule.
 *
 * The rule is on the bottom of every section rather than the top, so the
 * footer needs none of its own. Two adjacent 4px borders read as an 8px line
 * and look like a mistake.
 *
 * `title` is optional: a section whose own items carry the headings (the
 * services list) should not invent a second one just to have something under
 * the number.
 */
export const Slab = ({
  index,
  title,
  subtitle,
  tone = 'page',
  id,
  className,
  children,
}: {
  index: string
  title?: string
  subtitle?: string
  tone?: 'page' | 'sunken'
  id?: string
  className?: string
  children: ReactNode
}) => (
  <section
    id={id}
    className={cn(
      'border-b-4 border-(--border-strong)',
      tone === 'sunken' && 'bg-(--surface-sunken)',
      className,
    )}
  >
    <Container className="py-12 sm:py-16">
      {/* One padding class, chosen, never two merged: a bare number needs less
          room under it than a number with a heading beside it. */}
      <div
        className={cn(
          'flex flex-col gap-3 border-b-2 border-(--border-subtle)',
          title === undefined && subtitle === undefined ? 'pb-3' : 'pb-5',
        )}
      >
        <div className="flex items-baseline gap-4">
          <span aria-hidden="true" className={NUM}>
            {index}
          </span>
          {title !== undefined && (
            <h2 className="break-words text-(length:--text-2xl) font-bold uppercase tracking-[0.04em] text-(--text-primary) sm:text-(length:--text-3xl)">
              {title}
            </h2>
          )}
        </div>

        {subtitle !== undefined && (
          <p className="max-w-2xl text-(length:--text-base) text-(--text-secondary)">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-10">{children}</div>
    </Container>
  </section>
)
