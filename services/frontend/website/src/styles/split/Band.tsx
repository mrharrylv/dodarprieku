import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

/**
 * A full-width band of the right half, for content that has no business being
 * cut in two: a list, a set of rows.
 *
 * Left-aligned rather than centred, and capped at the content width. The
 * whole style hangs off the vertical rule between the halves, so a block that
 * drifts to the middle of the right half loses the alignment the eye is
 * following down the page.
 */
export const Band = ({
  id,
  heading,
  lead,
  className,
  children,
}: {
  id?: string
  heading: string
  lead?: string
  className?: string
  children: ReactNode
}) => (
  <section
    id={id}
    className={cn(
      'scroll-mt-20 border-t border-(--border-strong) px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20',
      className,
    )}
  >
    <div className="max-w-(--container-content)">
      <h2 className="text-balance break-words font-(family-name:--font-display) text-(length:--text-3xl) leading-tight tracking-tight text-(--text-primary)">
        {heading}
      </h2>
      {lead !== undefined && (
        <p className="mt-4 max-w-xl text-(length:--text-lg) text-(--text-secondary)">
          {lead}
        </p>
      )}
      {children}
    </div>
  </section>
)
