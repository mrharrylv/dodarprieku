import type { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { NUM } from './marks'

/**
 * A grid that shows its own lines.
 *
 * The lines are a 2px gap filled with the border colour over a bordered box,
 * not borders on the cells. Done with borders, a wrapping grid leaves a doubled
 * rule between some cells and a missing one at the end of the last row, and it
 * changes at every breakpoint. The gap is correct at every column count for
 * free.
 */
export const LineGrid = ({
  as,
  className,
  children,
}: {
  as?: ElementType
  className?: string
  children: ReactNode
}) => {
  const Tag = as ?? 'ul'

  return (
    <Tag
      className={cn(
        'grid gap-[2px] border-2 border-(--border-strong) bg-(--border-strong)',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

/**
 * One cell.
 *
 * `tone` and `padded` are props rather than something you pass through
 * `className`, because a second `bg-` or `p-` arriving that way would race the
 * default in the stylesheet and win or lose depending on build order.
 *
 * `padded={false}` is for a cell whose entire area is one link: the padding
 * has to live on the link, or the border of the cell is not clickable.
 */
export const LineCell = ({
  as,
  index,
  tone = 'page',
  padded = true,
  className,
  children,
}: {
  as?: ElementType
  index?: string
  tone?: 'page' | 'sunken'
  padded?: boolean
  className?: string
  children: ReactNode
}) => {
  const Tag = as ?? 'li'

  return (
    <Tag
      className={cn(
        'flex flex-col',
        tone === 'sunken' ? 'bg-(--surface-sunken)' : 'bg-(--surface-page)',
        padded && 'p-6 sm:p-8',
        className,
      )}
    >
      {index !== undefined && (
        <span aria-hidden="true" className={cn(NUM, 'mb-5 block')}>
          {index}
        </span>
      )}
      {children}
    </Tag>
  )
}
