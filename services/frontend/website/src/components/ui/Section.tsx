import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from './Container'
import { Reveal } from './Reveal'

type Tone = 'page' | 'sunken' | 'raised'

const TONES: Record<Tone, string> = {
  page: 'bg-(--surface-page)',
  sunken: 'bg-(--surface-sunken)',
  raised: 'bg-(--surface-raised)',
}

/**
 * A vertical band of the page: background tone, consistent rhythm, an optional
 * heading block.
 *
 * The heading renders as an <h2>, because every page already has exactly one
 * <h1> in its hero. Skipping a level, or having two <h1>s, is the most common
 * heading-structure failure and it makes a screen reader's document outline
 * useless.
 */
export const Section = ({
  id,
  tone = 'page',
  title,
  subtitle,
  align = 'start',
  reveal = true,
  revealContent = reveal,
  className,
  children,
}: {
  id?: string
  tone?: Tone
  title?: string
  subtitle?: string
  align?: 'start' | 'center'
  /**
   * Whether the heading and the content make an entrance as they scroll into
   * view. On by default, so every band of every page arrives as the reader
   * reaches it; off for a band that must be still (a form, say).
   */
  reveal?: boolean
  /**
   * Whether the content arrives as one block. Turn it off when the content
   * animates itself, such as a grid in `<Reveal stagger>`, so it does not
   * arrive twice.
   */
  revealContent?: boolean
  className?: string
  children: ReactNode
}) => {
  const Heading = reveal ? Reveal : 'div'
  return (
    <section id={id} className={cn('py-16 sm:py-24', TONES[tone], className)}>
      <Container>
        {/*
        A plain <div>, not a <header>. The spec scopes <header> to the `banner`
        role only outside a sectioning element, but implementations disagree,
        and a page reporting several banner landmarks is genuinely confusing to
        navigate by landmark. There is exactly one banner on this site, and it
        is the site header.
      */}
        {(title !== undefined || subtitle !== undefined) && (
          <Heading
            className={cn('mb-10 sm:mb-14 max-w-2xl', align === 'center' && 'mx-auto text-center')}
          >
            {title !== undefined && (
              <h2 className="text-(length:--text-3xl) text-(--text-primary)">{title}</h2>
            )}
            {subtitle !== undefined && (
              <p className="mt-4 text-(length:--text-lg) text-(--text-secondary)">{subtitle}</p>
            )}
          </Heading>
        )}
        {revealContent ? <Reveal delay={0.08}>{children}</Reveal> : children}
      </Container>
    </section>
  )
}
