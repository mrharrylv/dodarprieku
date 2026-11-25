import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'
import { HEADER_OFFSET, bandNumber } from './sections'

type Tone = 'page' | 'sunken' | 'raised'

const TONES: Record<Tone, string> = {
  page: 'bg-(--surface-page)',
  sunken: 'bg-(--surface-sunken)',
  raised: 'bg-(--surface-raised)',
}

/**
 * One full-width band of the single page.
 *
 * Not the shared `Section`: that one owns its own rhythm (py-16) and puts the
 * heading in a centred-or-left block. A one-page site lives or dies on
 * vertical rhythm, so this band is roughly twice as tall and opens with a
 * numbered rule instead.
 *
 * `HEADER_OFFSET` is what keeps a band clear of the sticky header when a route
 * or a fragment lands on it. Without it the band's top seam, the device this
 * style is built from, sits underneath the header and the reader thinks the
 * link went to the wrong place.
 */
export const Band = ({
  id,
  tone = 'page',
  className,
  children,
}: {
  id: string
  tone?: Tone
  className?: string
  children: ReactNode
}) => (
  <section
    id={id}
    className={cn(
      HEADER_OFFSET,
      'border-t border-(--border-subtle) py-24 sm:py-32 lg:py-40',
      TONES[tone],
      className,
    )}
  >
    <Container>{children}</Container>
  </section>
)

/**
 * How every band opens: an index, a hairline that runs the full width, then
 * the heading.
 *
 * The rule is the device that makes a long scroll navigable. A reader who has
 * been scrolling for four screens needs a visible seam to know a new subject
 * has started, and a number tells them roughly how far through they are.
 * The number is decorative, so it is hidden from assistive technology: a
 * screen reader announces the heading, which already says the same thing.
 */
export const BandHeading = ({
  index,
  title,
  lead,
}: {
  index: number
  title: string
  lead?: string
}) => (
  <Reveal className="mb-14 sm:mb-20">
    <div className="flex items-center gap-5">
      <span
        aria-hidden="true"
        className="font-(family-name:--font-display) text-(length:--text-sm) font-semibold tabular-nums tracking-[0.2em] text-(--text-accent)"
      >
        {bandNumber(index)}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-(--border-subtle)" />
    </div>

    <h2 className="mt-7 max-w-3xl text-(length:--text-4xl) font-semibold tracking-tight text-(--text-primary)">
      {title}
    </h2>

    {lead !== undefined && (
      <p className="mt-6 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
        {lead}
      </p>
    )}
  </Reveal>
)
