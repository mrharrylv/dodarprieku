import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'
import { LABEL, NUM } from './marks'

/**
 * Every page opens with the same slab, and that repetition is the design: the
 * four pages should read as sheets off one stack, not four ideas.
 *
 * `break-words` matters more here than anywhere else. The heading is monospace
 * and uppercase, so a long Latvian compound at 320px is wide enough to push the
 * page sideways. Breaking it is ugly; a horizontal scrollbar is worse.
 */
export const Hero = ({
  index,
  kicker,
  title,
  subtitle,
  children,
}: {
  index: string
  kicker: string
  title: string
  subtitle: string
  children?: ReactNode
}) => (
  <section className="border-b-4 border-(--border-strong)">
    <Container className="py-10 sm:py-16">
      <p className="flex items-center gap-3 border-b-2 border-(--border-subtle) pb-4">
        <span aria-hidden="true" className={NUM}>
          {index}
        </span>
        <span className={LABEL}>{kicker}</span>
      </p>

      <h1
        className={cn(
          'mt-8 max-w-4xl break-words text-(length:--text-4xl) font-bold uppercase leading-[1.05]',
          'tracking-[-0.01em] text-(--text-primary) sm:text-(length:--text-5xl)',
        )}
      >
        {title}
      </h1>

      <p className="mt-6 max-w-2xl text-(length:--text-lg) text-(--text-secondary)">
        {subtitle}
      </p>

      {children !== undefined && (
        <div className="mt-9 flex flex-wrap gap-5">{children}</div>
      )}
    </Container>
  </section>
)
