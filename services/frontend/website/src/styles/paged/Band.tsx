import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'

type BandTone = 'page' | 'sunken' | 'inverted'

const TONES: Record<BandTone, string> = {
  page: 'bg-(--surface-page) text-(--text-primary)',
  sunken: 'bg-(--surface-sunken) text-(--text-primary)',
  inverted: 'bg-(--surface-inverted) text-(--text-inverted)',
}

/**
 * A band on one of the three conventional pages.
 *
 * These pages do not snap, but they keep the deck's rhythm: tall bands, plenty
 * of air, and the same three grounds in the same order. Without that they would
 * look like a different site reached through the same header.
 */
export const Band = ({
  tone = 'page',
  className,
  children,
}: {
  tone?: BandTone
  className?: string
  children: ReactNode
}) => (
  <section className={cn('py-24 sm:py-32', TONES[tone], className)}>
    <Container>{children}</Container>
  </section>
)

/**
 * A centred band heading. On the inverted ground the supporting line cannot use
 * --text-secondary, which is mixed for light surfaces, so it takes the inverted
 * text at reduced opacity instead.
 */
export const BandHeading = ({
  title,
  subtitle,
  tone = 'default',
}: {
  title: string
  subtitle?: string
  tone?: 'default' | 'inverted'
}) => (
  <div className="mx-auto max-w-(--container-prose) text-center">
    <h2 className="text-(length:--text-3xl) font-semibold tracking-tight text-balance">
      {title}
    </h2>
    {subtitle ? (
      <p
        className={cn(
          'mt-5 text-(length:--text-lg)',
          tone === 'inverted' ? 'text-(--text-inverted)/80' : 'text-(--text-secondary)',
        )}
      >
        {subtitle}
      </p>
    ) : null}
  </div>
)
