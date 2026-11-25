import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Tone = 'page' | 'sunken' | 'accent'

const TONES: Record<Tone, string> = {
  page: 'bg-(--surface-page)',
  sunken: 'bg-(--surface-sunken)',
  accent: 'bg-(--surface-accent-soft)',
}

/**
 * A section that is itself two halves: a heading block on one side, its
 * content on the other, divided by the same hard rule as the shell.
 *
 * `flip` swaps the SIDES, not the ORDER. The heading stays first in the DOM,
 * so a screen reader and a phone both get heading then content, and only the
 * CSS `order` moves it to the right. A page that zig-zags by reordering the
 * markup reads as gibberish the moment it is narrow enough to stack.
 *
 * Below `lg` there is no split: one column, heading above content, and the
 * two blocks share their padding so the section reads as a single band.
 */
export const SplitSection = ({
  id,
  flip = false,
  tone = 'page',
  heading,
  lead,
  children,
}: {
  id?: string
  flip?: boolean
  tone?: Tone
  heading: string
  lead?: string
  children: ReactNode
}) => (
  <section
    id={id}
    // scroll-mt clears the sticky bar when an anchor is followed from another
    // page; without it the heading lands underneath it on a phone.
    className={cn('scroll-mt-20 border-t border-(--border-strong)', TONES[tone])}
  >
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <div
        className={cn(
          'px-5 pt-12 sm:px-8 sm:pt-16 lg:px-12 lg:py-20',
          flip
            ? 'lg:order-2 lg:border-l lg:border-(--border-subtle)'
            : 'lg:border-r lg:border-(--border-subtle)',
        )}
      >
        <h2 className="text-balance break-words font-(family-name:--font-display) text-(length:--text-3xl) leading-tight tracking-tight text-(--text-primary)">
          {heading}
        </h2>
        {lead !== undefined && (
          <p className="mt-4 max-w-md text-(length:--text-lg) text-(--text-secondary)">
            {lead}
          </p>
        )}
      </div>

      <div
        className={cn(
          'px-5 pb-14 pt-6 sm:px-8 sm:pb-16 lg:px-12 lg:py-20',
          flip && 'lg:order-1',
        )}
      >
        {children}
      </div>
    </div>
  </section>
)
