import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'

type Tone = 'page' | 'sunken' | 'raised'

const TONES: Record<Tone, string> = {
  page: 'bg-(--surface-page)',
  sunken: 'bg-(--surface-sunken)',
  raised: 'bg-(--surface-raised)',
}

/**
 * A section of the page, in this style's rhythm.
 *
 * Not the shared `<Section>`: that one sets `py-16 sm:py-24` and this style
 * runs at roughly half again that. Passing a padding class into `<Section>`
 * would leave both utilities on the element, and `cn` does not merge them, so
 * which one applied would depend on Tailwind's output order rather than on
 * anything written here.
 *
 * The heading is an `<h2>`, always. Every page already has its one `<h1>` in
 * the hero, and a band that promoted itself would break the outline.
 */
export const Band = ({
  id,
  tone = 'page',
  title,
  subtitle,
  align = 'start',
  className,
  children,
}: {
  id?: string
  tone?: Tone
  title?: string
  subtitle?: string
  align?: 'start' | 'center'
  className?: string
  children: ReactNode
}) => {
  const heading = title !== undefined || subtitle !== undefined

  return (
    <section id={id} className={cn('py-24 sm:py-36', TONES[tone], className)}>
      <Container>
        {heading && (
          <Reveal className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
            {/* The rule, not an eyebrow line. An eyebrow needs a string, and
                this style may not invent one: every key is already spoken for. */}
            <span
              aria-hidden="true"
              className={cn('block h-px w-16 bg-(--fill-accent)', align === 'center' && 'mx-auto')}
            />
            {title !== undefined && (
              <h2 className="mt-8 text-balance text-(length:--text-4xl) text-(--text-primary)">
                {title}
              </h2>
            )}
            {subtitle !== undefined && (
              <p className="mt-6 text-(length:--text-lg) text-(--text-secondary)">{subtitle}</p>
            )}
          </Reveal>
        )}

        <div className={cn(heading && 'mt-16 sm:mt-24')}>{children}</div>
      </Container>
    </section>
  )
}
