import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { SPAN_FULL } from './spans'

/**
 * A band's heading, as a grid cell rather than a tile.
 *
 * It has no surface on purpose: a full-width tile containing three words would
 * read as a header bar and cut the page into sections, which is the shape this
 * style is trying not to be. Unsurfaced, it is a label sitting in the gutter
 * above the tiles it names.
 *
 * It is also where the h2 lives. The tiles under it are h3, so the outline
 * follows the DOM order a screen reader walks, not the visual size of a tile.
 */
export const BandLabel = ({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) => (
  <div
    className={cn(
      SPAN_FULL,
      'flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-1 pt-8 sm:pt-10',
    )}
  >
    <div className="min-w-0 max-w-2xl">
      <h2 className="text-(length:--text-2xl) font-semibold tracking-tight text-(--text-primary)">
        {title}
      </h2>
      {subtitle !== undefined && (
        <p className="mt-2 text-(--text-secondary)">{subtitle}</p>
      )}
    </div>
    {action}
  </div>
)
