import { cn } from '@/lib/cn'

import { numeral } from './numeral'

type NoteGridItem = {
  key: string
  title: string
  body: string
}

type NoteGridProps = {
  items: ReadonlyArray<NoteGridItem>
  /** `ol` where the order is the meaning, as it is for the process steps. */
  as?: 'ul' | 'ol'
  className?: string
}

/**
 * Three short pieces set as newspaper columns: divided by a hairline, no
 * padding box, no card. The rules are per item rather than `divide-x` so the
 * first column can lose its left padding and stay flush with the measure above
 * it, which is what makes the column read as a column and not as a cell.
 */
export const NoteGrid = ({ items, as: List = 'ul', className }: NoteGridProps) => (
  <List className={cn('grid sm:grid-cols-3', className)}>
    {items.map((item, index) => (
      <li
        key={item.key}
        className="border-t border-(--border-subtle) py-7 sm:border-t-0 sm:border-l sm:py-0 sm:pl-7 sm:first:border-l-0 sm:first:pl-0"
      >
        <span
          aria-hidden="true"
          className="block font-(family-name:--font-display) text-(length:--text-3xl) font-semibold leading-none text-(--text-muted)"
        >
          {numeral(index)}
        </span>
        <h3 className="mt-3 break-words font-(family-name:--font-display) text-(length:--text-xl) font-semibold leading-[1.15] tracking-[-0.02em] text-(--text-primary)">
          {item.title}
        </h3>
        <p className="mt-3 max-w-[44ch] leading-relaxed text-(--text-secondary)">{item.body}</p>
      </li>
    ))}
  </List>
)
