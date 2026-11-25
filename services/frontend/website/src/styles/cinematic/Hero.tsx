import { useTranslation } from 'react-i18next'

import { ROUTES } from '@/config/site'
import { useLocale } from '@/hooks/useLocale'
import { localePath } from '@/lib/locale-path'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Reveal } from '@/components/ui/Reveal'
import { Glow, Wash } from './Decor'

/**
 * The opening shot: nearly a screenful, one headline, a drifting wash.
 *
 * `min-h-[88svh]` rather than `100vh`. On a phone, `vh` is the viewport with
 * the browser chrome hidden, so a 100vh hero pushes its own buttons under the
 * address bar until the visitor scrolls. `svh` is the small viewport, which is
 * what is actually on screen when the page loads, and 88 of it leaves a hint of
 * the next section visible so it is obvious there is more page.
 *
 * The reveals are staggered by roughly a seventh of a second each, so the
 * headline lands before the buttons. Under prefers-reduced-motion the base
 * layer zeroes every duration and all four arrive at once, in place.
 */
export const Hero = () => {
  const { t } = useTranslation('home')
  const { locale } = useLocale()

  return (
    <section className="relative isolate flex min-h-[88svh] items-center overflow-hidden bg-(--surface-page)">
      <Wash />

      <Container className="relative py-24 sm:py-32">
        <Reveal delay={0.1}>
          <p className="flex items-center gap-4 text-(length:--text-xs) font-semibold uppercase tracking-[0.32em] text-(--text-accent)">
            <span aria-hidden="true" className="h-px w-10 shrink-0 bg-(--fill-accent)" />
            {t('hero.eyebrow')}
          </p>
        </Reveal>

        <Reveal
          as="h1"
          delay={0.24}
          className="mt-8 max-w-4xl text-balance text-(length:--text-5xl) font-semibold leading-[1.04] text-(--text-primary)"
        >
          {t('hero.title')}
        </Reveal>

        <Reveal
          as="p"
          delay={0.42}
          className="mt-8 max-w-2xl text-(length:--text-lg) text-(--text-secondary)"
        >
          {t('hero.subtitle')}
        </Reveal>

        <Reveal delay={0.6} className="mt-12 flex flex-wrap items-center gap-5">
          <Glow>
            <ButtonLink
              to={localePath(ROUTES.contact, locale)}
              size="lg"
              className="uppercase tracking-[0.16em]"
            >
              {t('hero.primaryCta')}
            </ButtonLink>
          </Glow>

          <ButtonLink
            to={localePath(ROUTES.services, locale)}
            size="lg"
            variant="secondary"
            className="uppercase tracking-[0.16em]"
          >
            {t('hero.secondaryCta')}
          </ButtonLink>
        </Reveal>
      </Container>
    </section>
  )
}
