import { Link } from 'react-router-dom'

import { numeral } from './numeral'

type EntryRowProps = {
  /** Position in the array it came from. The numeral is derived, not authored. */
  index: number
  title: string
  lead: string
  body?: string
  to?: string
  id?: string
  headingLevel?: 'h2' | 'h3'
}

/**
 * One numbered entry, two columns wide: the numeral and the title on the left,
 * the writing on the right, a hairline between them and another above the row.
 *
 * Below `lg` the two columns stack and the vertical rule disappears, because a
 * 150px column of text is worse than no column at all.
 *
 * `minmax(0, …)` on both tracks rather than bare fractions: a bare `1fr` is
 * `minmax(auto, 1fr)` and a long unbroken word would then push the grid wider
 * than its container.
 */
export const EntryRow = ({
  index,
  title,
  lead,
  body,
  to,
  id,
  headingLevel = 'h3',
}: EntryRowProps) => {
  const Heading = headingLevel

  return (
    <li
      id={id}
      className="scroll-mt-8 border-t border-(--border-subtle) py-8 sm:py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] lg:gap-12"
    >
      <div>
        <span
          aria-hidden="true"
          className="block font-(family-name:--font-display) text-(length:--text-4xl) font-semibold leading-none text-(--text-muted)"
        >
          {numeral(index)}
        </span>
        <Heading className="mt-3 break-words font-(family-name:--font-display) text-(length:--text-2xl) font-semibold leading-[1.1] tracking-[-0.02em] text-(--text-primary)">
          {to ? (
            <Link
              to={to}
              className="inline-flex min-h-11 items-center underline-offset-[6px] transition-colors hover:text-(--text-accent) hover:underline"
            >
              {title}
            </Link>
          ) : (
            title
          )}
        </Heading>
      </div>

      <div className="mt-4 lg:mt-0 lg:border-l lg:border-(--border-subtle) lg:pl-12">
        <p className="max-w-[56ch] font-(family-name:--font-display) text-(length:--text-lg) italic leading-snug text-(--text-primary)">
          {lead}
        </p>
        {body ? (
          <p className="mt-4 max-w-[62ch] leading-relaxed text-(--text-secondary)">{body}</p>
        ) : null}
      </div>
    </li>
  )
}
